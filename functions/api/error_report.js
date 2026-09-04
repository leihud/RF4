import { jsonResponse, errorResponse, getClientIP, checkRateLimit, isValidUserAgent, isIPBlacklisted } from './_shared.js'

/** 错误摘要最大长度，防止恶意超大上报 */
const MAX_MESSAGE = 500
const MAX_STACK = 2000
/** 请求体上限：正常上报仅 KB 级，超大请求体直接拒绝 */
const MAX_BODY_BYTES = 50 * 1024

/**
 * 前端错误上报：全局兜底捕获的异常写入 client_errors 表。
 * 限流保护，字段截断；上报失败不影响前端主流程（前端静默处理）。
 */
export async function onRequestPost(context) {
  const { request, env } = context

  try {
    // 只接受浏览器端上报（垃圾上报多来自无 UA / 脚本客户端）
    if (!isValidUserAgent(request)) {
      return jsonResponse({ success: false, message: 'Access denied' }, 403)
    }

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ success: false, message: '请求体过大' }, 413)
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
    const message = String(body.message || '').slice(0, MAX_MESSAGE)
    if (!message) {
      return jsonResponse({ success: false, message: '缺少错误信息' }, 400)
    }

    await env.DB.prepare('INSERT INTO client_errors (message, stack, url, ua) VALUES (?, ?, ?, ?)')
      .bind(
        message,
        String(body.stack || '').slice(0, MAX_STACK),
        String(body.url || '').slice(0, 300),
        String(body.ua || '').slice(0, 200)
      )
      .run()

    return jsonResponse({ success: true })
  } catch (error) {
    // 上报接口自身失败不打日志轰炸，静默返回
    console.error('错误上报写入失败:', error)
    return errorResponse(error)
  }
}
