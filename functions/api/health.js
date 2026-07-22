export async function onRequestGet(context) {
  try {
    const { env } = context
    
    if (!env || !env.DB) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'DB not available',
        envAvailable: !!env,
        envKeys: env ? Object.keys(env).filter(k => !k.startsWith('_')) : []
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
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
      message: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}