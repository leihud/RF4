export async function onRequestGet(context) {
  const { request, env } = context
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
}