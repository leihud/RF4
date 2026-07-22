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
  return jsonResponse({ error: error.message, stack: error.stack }, 500)
}

export async function onRequestGet(context) {
  const { env } = context
  
  try {
    const result = {}
    
    result.dbAvailable = !!env.DB
    
    if (env.DB) {
      try {
        const tables = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).all()
        result.tables = tables.results.map(t => t.name)
        
        for (const table of result.tables) {
          const count = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).all()
          result[`${table}Count`] = count.results[0].cnt
        }
        
        const sample = await env.DB.prepare('SELECT * FROM equipment LIMIT 3').all()
        result.sampleEquipment = sample.results
      } catch (e) {
        result.dbError = e.message
      }
    }
    
    result.envKeys = Object.keys(env || {})
    
    return jsonResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}