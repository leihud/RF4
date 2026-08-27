import { jsonResponse, errorResponse, getClientIP, isValidUserAgent, checkRateLimit, clearBuildsCache } from '../_shared.js'

/**
 * 方案点赞/取消点赞：按客户端指纹去重，复用反扒限流防刷
 * body: { id, clientId, unlike? }
 */
export async function onRequestPost(context) {
  const { request, env } = context

  try {
    if (!isValidUserAgent(request)) {
      return jsonResponse({ success: false, message: 'Access denied' }, 403)
    }
    const clientIP = getClientIP(request)
    const rateCheck = await checkRateLimit(clientIP, env.DB)
    if (!rateCheck.allowed) {
      return jsonResponse({ success: false, message: rateCheck.message || '请求过于频繁' }, 429)
    }

    const { id, clientId, unlike } = await request.json()
    if (!id || !clientId) {
      return jsonResponse({ success: false, message: '缺少参数' }, 400)
    }

    const db = env.DB
    const existing = await db
      .prepare('SELECT id FROM build_likes WHERE build_id = ? AND client_id = ?')
      .bind(id, clientId)
      .first()

    // 已点赞过或显式取消 → 取消点赞
    if (existing || unlike) {
      if (existing) {
        await db.prepare('DELETE FROM build_likes WHERE id = ?').bind(existing.id).run()
        await db.prepare('UPDATE recommended_builds SET likes = MAX(0, likes - 1) WHERE id = ?').bind(id).run()
        clearBuildsCache()
      }
      return jsonResponse({ success: true, liked: false })
    }

    await db.prepare('INSERT INTO build_likes (build_id, client_id) VALUES (?, ?)').bind(id, clientId).run()
    await db.prepare('UPDATE recommended_builds SET likes = likes + 1 WHERE id = ?').bind(id).run()
    clearBuildsCache()
    return jsonResponse({ success: true, liked: true })
  } catch (error) {
    console.error('点赞操作失败:', error)
    return errorResponse(error)
  }
}
