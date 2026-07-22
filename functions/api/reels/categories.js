function buildCategoriesQuery(tableName) {
  return `SELECT DISTINCT category FROM ${tableName} WHERE category IS NOT NULL ORDER BY category`
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
  const { env } = context
  
  try {
    const query = buildCategoriesQuery('reels')
    const result = await env.DB.prepare(query).all()
    return jsonResponse(result.results.map(r => r.category))
  } catch (error) {
    return errorResponse(error)
  }
}