import { jsonResponse, errorResponse, getCachedResponse, putCache } from './_shared.js'

/** 鱼种列表几乎不变（随迁移发布），复用装备缓存前缀的默认 TTL */
const FISH_CACHE_TTL = 3600

export async function onRequestGet(context) {
  const { env, request } = context

  try {
    const cached = await getCachedResponse(request)
    if (cached) return cached

    const result = await env.DB.prepare(
      'SELECT name, display_name, difficulty, min_tension, max_tension, description FROM fish_species ORDER BY display_name'
    ).all()

    const response = jsonResponse({
      success: true,
      data: result.results || []
    })
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(putCache(request, response.clone(), FISH_CACHE_TTL))
    }
    return response
  } catch (error) {
    console.error('查询鱼种失败:', error)
    return errorResponse(error)
  }
}
