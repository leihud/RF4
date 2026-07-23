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
  
  try {
    let results = []
    
    if (!type || type === '鱼竿') {
      const rodsResult = await env.DB.prepare('SELECT * FROM rods').all()
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
    }
    
    if (!type || type === '渔轮') {
      const reelsResult = await env.DB.prepare('SELECT * FROM reels').all()
      const reelsData = reelsResult.results.map(row => ({
        id: row.id,
        equipmentType: '渔轮',
        equipmentName: row.equipmentName,
        model: row.model,
        category: row.category,
        subCategory: row.subCategory,
        panelTension: extractNumber(row.frictionForce) || extractNumber(row.lockTension),
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
    }
    
    return jsonResponse(results)
  } catch (error) {
    return errorResponse(error)
  }
}
