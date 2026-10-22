import { jsonResponse, errorResponse, getCachedResponse, putCache } from './_shared.js'

/** 鱼线数据来自每日爬取的 CSV，变化低频，缓存 1 小时 */
const LINES_CACHE_TTL = 3600

/**
 * 鱼线线径-拉力对照表（Potryasov Google Sheet 数据）。
 * 供前端主线/引线选择器：选线自动带出线径/拉力/长度/材质。
 */
export async function onRequestGet(context) {
  const { env, request } = context

  try {
    const cached = await getCachedResponse(request)
    if (cached) return cached

    const result = await env.DB.prepare(
      `SELECT id, name, type, strength_kg, diameter_mm, length_m, price, color
       FROM fishing_lines ORDER BY name, diameter_mm`
    ).all()

    const response = jsonResponse({ success: true, data: result.results || [] })
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(putCache(request, response.clone(), LINES_CACHE_TTL))
    }
    return response
  } catch (error) {
    console.error('查询鱼线数据失败:', error)
    return errorResponse(error)
  }
}
