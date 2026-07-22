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

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const searchQuery = url.searchParams.get('q')
  const category = url.searchParams.get('category')
  const limit = parseInt(url.searchParams.get('limit')) || 10
  const offset = parseInt(url.searchParams.get('offset')) || 0
  
  try {
    let query = 'SELECT * FROM reels'
    let params = []
    let conditions = []
    
    if (searchQuery) {
      conditions.push('(LOWER(equipmentName) LIKE ? OR LOWER(model) LIKE ?)')
      const q = '%' + searchQuery.toLowerCase() + '%'
      params.push(q, q)
    }
    
    if (category) {
      conditions.push('category = ?')
      params.push(category)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY id LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const result = await env.DB.prepare(query).bind(...params).all()
    let results = result.results
    
    const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM reels').all()
    let total = countResult.results[0].total
    
    if (searchQuery || category) {
      const countQuery = 'SELECT COUNT(*) as total FROM reels WHERE ' + conditions.join(' AND ')
      const countRes = await env.DB.prepare(countQuery).bind(...params.slice(0, -2)).all()
      total = countRes.results[0].total
    }
    
    return jsonResponse({
      data: results,
      total,
      hasMore: offset + results.length < total
    })
  } catch (error) {
    console.error('Database query error:', error)
    return jsonResponse({ data: [], total: 0, hasMore: false })
  }
}
