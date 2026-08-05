import { jsonResponse, errorResponse, extractNumber, buildSearchWhere, SEARCH_FIELDS, NO_SEARCH_LIMIT, getCachedResponse, putCache, sanitizeEquipmentData } from './_shared.js'

/** 查询单表，搜索条件（统一字段 SEARCH_FIELDS 模糊匹配）下推到 SQL */
async function queryTable(db, table, searchQuery) {
  let sql = `SELECT * FROM ${table}`
  const binds = []
  if (searchQuery && searchQuery.trim()) {
    sql += ` WHERE ${buildSearchWhere(SEARCH_FIELDS, searchQuery, binds)}`
  } else {
    // 无搜索时全量返回（带安全上限防数据膨胀失控）
    sql += ` LIMIT ${NO_SEARCH_LIMIT}`
  }
  const result = await db.prepare(sql).bind(...binds).all()
  return result.results
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const searchQuery = url.searchParams.get('q')

  // 仅缓存无搜索的全量请求
  const cacheable = !searchQuery
  if (cacheable) {
    const cached = await getCachedResponse(request)
    if (cached) return cached
  }

  try {
    let results = []

    if (!type || type === '鱼竿') {
      const rows = await queryTable(env.DB, 'rods', searchQuery)
      results = results.concat(rows.map(row => sanitizeEquipmentData(row, 'rod')))
    }

    if (!type || type === '渔轮') {
      const rows = await queryTable(env.DB, 'reels', searchQuery)
      results = results.concat(rows.map(row => sanitizeEquipmentData(row, 'reel')))
    }

    const response = jsonResponse(results)
    if (cacheable) putCache(request, response.clone())
    return response
  } catch (error) {
    return errorResponse(error)
  }
}
