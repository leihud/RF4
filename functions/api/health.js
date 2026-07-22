export async function onRequestGet(context) {
  const { env } = context
  
  try {
    const result = await env.DB.prepare('SELECT COUNT(*) FROM equipment').all()
    return new Response(JSON.stringify({ 
      status: 'ok', 
      equipmentCount: result.results[0]['COUNT(*)'] 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}