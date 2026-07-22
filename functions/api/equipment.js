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

function errorResponse(error) {
  return jsonResponse({ error: error.message }, 500)
}

function extractNumber(str) {
  if (!str) return 0
  const match = String(str).match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const searchQuery = url.searchParams.get('q')
  const limit = parseInt(url.searchParams.get('limit')) || 10
  const offset = parseInt(url.searchParams.get('offset')) || 0
  
  try {
    let results = []
    let total = 0
    let hasMore = false
    
    if (!type || type === '鱼竿') {
      let query = 'SELECT * FROM rods'
      let params = []
      let conditions = []
      
      if (searchQuery) {
        conditions.push('(LOWER(equipmentName) LIKE ? OR LOWER(model) LIKE ?)')
        const q = '%' + searchQuery.toLowerCase() + '%'
        params.push(q, q)
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      
      query += ' ORDER BY id LIMIT ? OFFSET ?'
      params.push(limit, offset)
      
      const rodsResult = await env.DB.prepare(query).bind(...params).all()
      const rodsData = rodsResult.results.map(row => ({
        id: row.id,
        equipmentType: '鱼竿',
        equipmentName: row.equipmentName,
        model: row.model,
        category: row.category,
        subCategory: row.subCategory,
        panelTension: extractNumber(row.strengthKg),
        lockTension: 0,
        price: extractNumber(row.silverPrice),
        strengthKg: row.strengthKg,
        silverPrice: row.silverPrice,
        goldPrice: row.goldPrice,
        weightG: row.weightG,
        lengthM: row.lengthM,
        levelReq: row.levelReq,
        description: row.description
      }))
      results = results.concat(rodsData)
      
      const countQuery = searchQuery 
        ? 'SELECT COUNT(*) as total FROM rods WHERE (LOWER(equipmentName) LIKE ? OR LOWER(model) LIKE ?)'
        : 'SELECT COUNT(*) as total FROM rods'
      const countParams = searchQuery ? ['%' + searchQuery.toLowerCase() + '%', '%' + searchQuery.toLowerCase() + '%'] : []
      const countResult = await env.DB.prepare(countQuery).bind(...countParams).all()
      total = countResult.results[0].total
      hasMore = offset + rodsData.length < total
    }
    
    if (!type || type === '渔轮') {
      let query = 'SELECT * FROM reels'
      let params = []
      let conditions = []
      
      if (searchQuery) {
        conditions.push('(LOWER(equipmentName) LIKE ? OR LOWER(model) LIKE ?)')
        const q = '%' + searchQuery.toLowerCase() + '%'
        params.push(q, q)
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      
      query += ' ORDER BY id LIMIT ? OFFSET ?'
      params.push(limit, offset)
      
      const reelsResult = await env.DB.prepare(query).bind(...params).all()
      const reelsData = reelsResult.results.map(row => ({
        id: row.id,
        equipmentType: '渔轮',
        equipmentName: row.equipmentName,
        model: row.model,
        category: row.category,
        subCategory: row.subCategory,
        panelTension: extractNumber(row.lockTension),
        lockTension: extractNumber(row.lockTension),
        price: extractNumber(row.silverPrice),
        lockTensionValue: row.lockTension,
        frictionForce: row.frictionForce,
        frictionForceStar: row.frictionForceStar,
        silverPrice: row.silverPrice,
        goldPrice: row.goldPrice,
        transmissionRatio: row.transmissionRatio,
        levelReq: row.levelReq,
        description: row.description
      }))
      results = results.concat(reelsData)
      
      const countQuery = searchQuery 
        ? 'SELECT COUNT(*) as total FROM reels WHERE (LOWER(equipmentName) LIKE ? OR LOWER(model) LIKE ?)'
        : 'SELECT COUNT(*) as total FROM reels'
      const countParams = searchQuery ? ['%' + searchQuery.toLowerCase() + '%', '%' + searchQuery.toLowerCase() + '%'] : []
      const countResult = await env.DB.prepare(countQuery).bind(...countParams).all()
      total = countResult.results[0].total
      hasMore = offset + reelsData.length < total
    }
    
    return jsonResponse({
      data: results,
      total,
      hasMore
    })
  } catch (error) {
    return jsonResponse({ data: [], total: 0, hasMore: false })
  }
}
