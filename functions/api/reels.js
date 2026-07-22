export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')
  
  let query = 'SELECT * FROM reels'
  const params = []
  
  if (category) {
    query += ' WHERE category = ?'
    params.push(category)
  }
  
  if (q && !category) {
    query += ' WHERE model LIKE ? OR equipmentName LIKE ?'
    params.push(`%${q}%`, `%${q}%`)
  } else if (q && category) {
    query += ' AND (model LIKE ? OR equipmentName LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  
  const result = await env.DB.prepare(query).bind(...params).all()
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json' }
  })
}