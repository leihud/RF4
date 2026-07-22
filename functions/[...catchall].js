export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (path.startsWith('/api/')) {
    return handleApi(request, env)
  }

  return context.next()
}

async function handleApi(request, env) {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/api/equipment') {
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

  if (path === '/api/equipment/search') {
    const q = url.searchParams.get('q') || ''
    const type = url.searchParams.get('type')
    let query = 'SELECT * FROM equipment WHERE equipmentName LIKE ?'
    const params = [`%${q}%`]
    
    if (type) {
      query += ' AND equipmentType = ?'
      params.push(type)
    }
    
    const result = await env.DB.prepare(query).bind(...params).all()
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (path === '/api/rods') {
    const category = url.searchParams.get('category')
    const q = url.searchParams.get('q')
    let query = 'SELECT * FROM rods'
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

  if (path === '/api/rods/categories') {
    const result = await env.DB.prepare('SELECT DISTINCT category FROM rods WHERE category IS NOT NULL ORDER BY category').all()
    return new Response(JSON.stringify(result.results.map(r => r.category)), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (path === '/api/reels') {
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

  if (path === '/api/reels/categories') {
    const result = await env.DB.prepare('SELECT DISTINCT category FROM reels WHERE category IS NOT NULL ORDER BY category').all()
    return new Response(JSON.stringify(result.results.map(r => r.category)), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (path === '/api/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  })
}