import { jsonResponse, errorResponse, getCachedResponse, putCache } from './_shared.js'

/** 鱼钩数据来自每日爬取的 CSV，变化低频，缓存 1 小时 */
const HOOKS_CACHE_TTL = 3600

/**
 * 鱼钩钩号-拉力矩阵（Potryasov Google Sheet 数据）。
 * 供前端鱼钩选择器：strength_json 为 [{size, kg}] 数组。
 */
export async function onRequestGet(context) {
  const { env, request } = context

  try {
    const cached = await getCachedResponse(request)
    if (cached) return cached

    const result = await env.DB.prepare(
      'SELECT id, name, type, strength_json FROM fishing_hooks ORDER BY name'
    ).all()

    const response = jsonResponse({ success: true, data: result.results || [] })
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(putCache(request, response.clone(), HOOKS_CACHE_TTL))
    }
    return response
  } catch (error) {
    console.error('查询鱼钩数据失败:', error)
    return errorResponse(error)
  }
}
