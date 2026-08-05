import { jsonResponse, buildSearchWhere, SEARCH_FIELDS, NO_SEARCH_LIMIT, getCachedResponse, putCache, getClientIP, isValidUserAgent, isIPBlacklisted, checkRateLimit, sanitizeEquipmentData } from './_shared.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const searchQuery = url.searchParams.get('q')
  const category = url.searchParams.get('category')

  // 反扒检查：验证 User-Agent
  if (!isValidUserAgent(request)) {
    return jsonResponse({ error: 'Invalid User-Agent' }, 403)
  }

  // 获取客户端 IP
  const clientIP = getClientIP(request)
  
  // 检查 IP 是否在黑名单中
  if (await isIPBlacklisted(clientIP, env.DB)) {
    return jsonResponse({ error: 'IP blocked' }, 403)
  }

  // 检查请求频率
  const rateCheck = await checkRateLimit(clientIP, env.DB)
  if (!rateCheck.allowed) {
    return jsonResponse({ 
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.'
    }, 429)
  }

  // 仅缓存无搜索的全量请求（搜索请求结果不确定，不适合缓存）
  const cacheable = !searchQuery
  if (cacheable) {
    const cached = await getCachedResponse(request)
    if (cached) return cached
  }

  try {
    // 过滤条件下推到 SQL，避免全表取回后再 JS 过滤
    const conds = []
    const binds = []
    if (category) {
      conds.push('category = ?')
      binds.push(category)
    }
    const hasSearch = !!(searchQuery && searchQuery.trim())
    if (hasSearch) {
      conds.push(buildSearchWhere(SEARCH_FIELDS, searchQuery, binds))
    }

    let sql = 'SELECT * FROM rods'
    if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`
    // 搜索时最多返回 50 条；无搜索时全量返回（带安全上限防数据膨胀失控）
    sql += hasSearch ? ' LIMIT 50' : ` LIMIT ${NO_SEARCH_LIMIT}`

    const result = await env.DB.prepare(sql).bind(...binds).all()
    const sanitizedResults = result.results.map(row => sanitizeEquipmentData(row, 'rod'))
    const response = jsonResponse(sanitizedResults)
    if (cacheable) putCache(request, response.clone())
    return response
  } catch (error) {
    console.error('Database query error:', error)
    return jsonResponse([])
  }
}
