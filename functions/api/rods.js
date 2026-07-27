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

function normalizeSearch(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_/.,]/g, '')
}

function matchSearch(field, q, qNorm) {
  if (!field) return false
  const low = String(field).toLowerCase()
  const norm = normalizeSearch(field)
  if (low === q) return true
  if (low.startsWith(q)) return true
  if (qNorm && norm === qNorm) return true
  if (qNorm && norm.startsWith(qNorm)) return true
  if (qNorm && norm.includes(qNorm)) return true
  if (low.includes(q)) return true
  return false
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
    
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const qNorm = normalizeSearch(q)
      results = results.filter(item =>
        matchSearch(item.model, q, qNorm) ||
        matchSearch(item.equipmentName, q, qNorm)
      )
    }

    // 搜索时最多返回 50 条；无搜索时全量返回
    if (searchQuery && searchQuery.trim()) {
      results = results.slice(0, 50)
    }
    
    return jsonResponse(results)
  } catch (error) {
    console.error('Database query error:', error)
    return jsonResponse([])
  }
}
