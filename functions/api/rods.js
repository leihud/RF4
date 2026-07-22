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

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const searchQuery = url.searchParams.get('q')
  const category = url.searchParams.get('category')
  
  try {
    const result = await env.DB.prepare('SELECT * FROM rods').all()
    let results = result.results
    
    if (category) {
      results = results.filter(item => item.category === category)
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      results = results.filter(item => 
        (item.equipmentName && item.equipmentName.toLowerCase().includes(q)) ||
        (item.model && item.model.toLowerCase().includes(q))
      ).slice(0, 50)
    }
    
    return jsonResponse(results)
  } catch (error) {
    console.error('Database query error:', error)
    return jsonResponse([])
  }
}
