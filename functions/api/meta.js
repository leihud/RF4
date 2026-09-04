import { jsonResponse, errorResponse, getCachedResponse, putCache } from './_shared.js'

/** meta 缓存 TTL：较短，保证导入后页脚「数据更新时间」能尽快刷新 */
const META_CACHE_TTL = 60

/**
 * 元信息查询：返回 meta 表键值对（如最后导入时间），供前端展示数据新鲜度。
 * 该接口无敏感数据但被每个页面访问，加短 TTL 缓存减轻 DB 压力。
 */
export async function onRequestGet(context) {
  const { env, request } = context

  try {
    const cached = await getCachedResponse(request)
    if (cached) return cached

    const result = await env.DB.prepare('SELECT key, value, updated_at FROM meta').all()
    const data = {}
    for (const row of result.results || []) {
      data[row.key] = row.value
    }
    const response = jsonResponse({ success: true, data })
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(putCache(request, response.clone(), META_CACHE_TTL))
    }
    return response
  } catch (error) {
    console.error('读取元信息失败:', error)
    return errorResponse(error)
  }
}
