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
    const result = await env.DB.prepare('SELECT COUNT(*) FROM equipment').all()
    return jsonResponse({ 
      status: 'ok', 
      equipmentCount: result.results[0]['COUNT(*)'] 
    })
  } catch (error) {
    return errorResponse(error)
  }
}