function buildSearchQuery(tableName, category, q) {
  let query = `SELECT * FROM ${tableName}`
  const params = []
  
  if (category) {
    query += ' WHERE category = ?'
    params.push(category)
  }
  
  if (q && !category) {
    query += ' WHERE model LIKE ? OR equipmentName LIKE ?'
    params.push(`%${q}%`, `%${q}%`)
  } else if (q && category) {
    query += ' AND (model LIKE ? OR equipmentName LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  
  return { query, params }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

function errorResponse(error) {
  return jsonResponse({ error: error.message }, 500)
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')
  
  try {
    const { query, params } = buildSearchQuery('reels', category, q)
    const result = await env.DB.prepare(query).bind(...params).all()
    return jsonResponse(result.results)
  } catch (error) {
    return errorResponse(error)
  }
}