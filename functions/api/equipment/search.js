export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  const type = url.searchParams.get('type')
  
  try {
    let query = 'SELECT * FROM equipment WHERE equipmentName LIKE ?'
    const params = [`%${q || ''}%`]
    
    if (type) {
      query += ' AND equipmentType = ?'
      params.push(type)
    }
    
    const result = await env.DB.prepare(query).bind(...params).all()
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}