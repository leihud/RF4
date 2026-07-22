export async function onRequestGet(context) {
  const { env } = context
  
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ status: 'error', message: 'DB not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const result = await env.DB.prepare('SELECT 1 as test').all()
    return new Response(JSON.stringify({ 
      status: 'ok', 
      test: result.results[0].test 
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