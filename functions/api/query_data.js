import { jsonResponse, errorResponse, getCachedResponse, putCache } from './_shared.js'

/**
 * 通用数据查询端点（数据查询页专用）：
 *   /api/query_data?table=rods&q=关键字&page=1&pageSize=50
 *
 * 白名单表 + 每表搜索列，防注入；短 TTL 缓存。
 */
const QUERY_CACHE_TTL = 60

/** 表白名单：表名 → 搜索列（LIKE） */
const TABLES = {
  rods: {
    search: `model LIKE ?1 OR equipmentName LIKE ?1 OR category LIKE ?1 OR subCategory LIKE ?1`,
    order: 'model'
  },
  reels: {
    search: `model LIKE ?1 OR equipmentName LIKE ?1 OR category LIKE ?1 OR subCategory LIKE ?1`,
    order: 'model'
  },
  fishing_lines: {
    search: `name LIKE ?1 OR type LIKE ?1 OR color LIKE ?1`,
    order: 'name, diameter_mm'
  },
  fishing_hooks: {
    search: `name LIKE ?1 OR type LIKE ?1`,
    order: 'name'
  },
  fish_species: {
    search: `name LIKE ?1 OR display_name LIKE ?1 OR description LIKE ?1`,
    order: 'display_name'
  },
  gamekee_items: {
    search: `name LIKE ?1 OR entry_name LIKE ?1 OR description LIKE ?1 OR attrs_json LIKE ?1`,
    order: 'section, category_path, name'
  },
  reel_strength: {
    search: `model LIKE ?1 OR category LIKE ?1`,
    order: 'model'
  },
  fishing_feed: {
    search: `location LIKE ?1 OR fish_name LIKE ?1 OR bait LIKE ?1`,
    order: 'id DESC'
  }
}

export async function onRequestGet(context) {
  const { env, request } = context
  const url = new URL(request.url)
  const table = url.searchParams.get('table') || ''
  const q = (url.searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10) || 50))

  const conf = TABLES[table]
  if (!conf) {
    return jsonResponse({ success: false, message: `不支持的表: ${table}` }, 400)
  }

  try {
    const cached = await getCachedResponse(request)
    if (cached) return cached

    const where = q ? ` WHERE ${conf.search}` : ''
    const params = q ? [`%${q}%`] : []
    // 占位符用显式编号（?1=搜索词），LIMIT/OFFSET 编号动态延续，避免空搜索时编号断档绑定失败
    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2

    const countRes = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table}${where}`)
      .bind(...params).all()
    const total = countRes.results?.[0]?.total || 0

    const dataRes = await env.DB.prepare(
      `SELECT * FROM ${table}${where} ORDER BY ${conf.order} LIMIT ?${limitIdx} OFFSET ?${offsetIdx}`
    ).bind(...params, pageSize, (page - 1) * pageSize).all()

    const response = jsonResponse({
      success: true,
      data: dataRes.results || [],
      total,
      page,
      pageSize
    })
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(putCache(request, response.clone(), QUERY_CACHE_TTL))
    }
    return response
  } catch (error) {
    console.error('数据查询失败:', error)
    return errorResponse(error)
  }
}
