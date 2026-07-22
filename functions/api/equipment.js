export async function onRequestGet(context) {
  try {
    const { request, env } = context
    
    if (!env || !env.DB) {
      return new Response(JSON.stringify({ error: 'DB not available', envAvailable: !!env }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    
    let query = 'SELECT * FROM equipment'
    const params = []
    
    if (type) {
      query += ' WHERE equipmentType = ?'
      params.push(type)
    }
    
    const result = await env.DB.prepare(query).bind(...params).all()
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}