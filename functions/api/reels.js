import { jsonResponse, buildSearchWhere } from './_shared.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const searchQuery = url.searchParams.get('q')
  const category = url.searchParams.get('category')

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
      conds.push(buildSearchWhere(['model', 'equipmentName'], searchQuery, binds))
    }

    let sql = 'SELECT * FROM reels'
    if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`
    // 搜索时最多返回 50 条；无搜索时全量返回
    if (hasSearch) sql += ' LIMIT 50'

    const result = await env.DB.prepare(sql).bind(...binds).all()
    return jsonResponse(result.results)
  } catch (error) {
    console.error('Database query error:', error)
    return jsonResponse([])
  }
}
