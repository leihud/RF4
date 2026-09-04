import { jsonResponse, errorResponse, getClientIP, isValidUserAgent, isIPBlacklisted, checkRateLimit, clearBuildsCache } from '../_shared.js'

/** client_id 规范：8~64 位字母/数字/下划线/中划线（前端生成格式为 c_<时间戳36>_<随机36>） */
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

/**
 * 方案点赞/取消点赞：按客户端指纹去重，复用反扒限流防刷。
 * body: { id, clientId, unlike? }
 */
export async function onRequestPost(context) {
  const { request, env } = context

  try {
    if (!isValidUserAgent(request)) {
      return jsonResponse({ success: false, message: 'Access denied' }, 403)
    }
    const clientIP = getClientIP(request)
    if (await isIPBlacklisted(clientIP, env.DB)) {
      return jsonResponse({ success: false, message: 'Access denied' }, 403)
    }
    const rateCheck = await checkRateLimit(clientIP, env.DB)
    if (!rateCheck.allowed) {
      return jsonResponse({ success: false, message: rateCheck.message || '请求过于频繁' }, 429)
    }

    const body = await request.json()
    const { id, clientId, unlike } = body
    const buildId = Number(id)

    if (!Number.isInteger(buildId) || buildId <= 0 || !clientId) {
      return jsonResponse({ success: false, message: '缺少参数' }, 400)
    }
    if (typeof clientId !== 'string' || !CLIENT_ID_RE.test(clientId)) {
      return jsonResponse({ success: false, message: '无效的客户端标识' }, 400)
    }

    const db = env.DB

    // 点赞对象必须真实存在且已过审：杜绝「空 UPDATE + 整库缓存清空」的放大攻击
    const build = await db
      .prepare('SELECT id, is_approved FROM recommended_builds WHERE id = ?')
      .bind(buildId)
      .first()
    if (!build || build.is_approved !== 1) {
      return jsonResponse({ success: false, message: '方案不存在或尚未发布' }, 404)
    }

    const existing = await db
      .prepare('SELECT id FROM build_likes WHERE build_id = ? AND client_id = ?')
      .bind(buildId, clientId)
      .first()

    // 已点赞过或显式取消 → 取消点赞
    if (existing || unlike) {
      if (existing) {
        await db.prepare('DELETE FROM build_likes WHERE id = ?').bind(existing.id).run()
        await db.prepare('UPDATE recommended_builds SET likes = MAX(0, likes - 1) WHERE id = ?').bind(buildId).run()
        clearBuildsCache()
      }
      return jsonResponse({ success: true, liked: false })
    }

    try {
      await db.prepare('INSERT INTO build_likes (build_id, client_id) VALUES (?, ?)').bind(buildId, clientId).run()
    } catch (error) {
      // 并发重复点赞由 UNIQUE(build_id, client_id) 兜底，幂等视为已点赞
      if (String((error && error.message) || error).includes('UNIQUE constraint failed')) {
        return jsonResponse({ success: true, liked: true })
      }
      throw error
    }
    await db.prepare('UPDATE recommended_builds SET likes = likes + 1 WHERE id = ?').bind(buildId).run()
    clearBuildsCache()
    return jsonResponse({ success: true, liked: true })
  } catch (error) {
    console.error('点赞操作失败:', error)
    return errorResponse(error)
  }
}
