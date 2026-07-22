function buildEquipmentQuery(type) {
  let query = 'SELECT * FROM equipment'
  const params = []
  
  if (type) {
    query += ' WHERE equipmentType = ?'
    params.push(type)
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
  const type = url.searchParams.get('type')
  
  try {
    const { query, params } = buildEquipmentQuery(type)
    const result = await env.DB.prepare(query).bind(...params).all()
    return jsonResponse(result.results)
  } catch (error) {
    return errorResponse(error)
  }
}