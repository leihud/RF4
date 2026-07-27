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
  const cleaned = String(str).replace(/,/g, '')
  const match = cleaned.match(/[\d.]+/)
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
        form: row.form,
        testG: row.testG,
        sensitivity: row.sensitivity,
        hardness: row.hardness,
        levelReq: row.levelReq,
        structure: row.structure,
        ability: row.ability,
        rating: row.rating,
        weightG: row.weightG,
        adaptWeight: row.adaptWeight,
        adaptWeightG: row.adaptWeightG,
        adaptWeightStar: row.adaptWeightStar,
        silverPrice: row.silverPrice,
        goldPrice: row.goldPrice,
        lengthM: row.lengthM,
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
        lockTensionStar: row.lockTensionStar,
        frictionForce: row.frictionForce,
        frictionForceStar: row.frictionForceStar,
        transmissionRatio: row.transmissionRatio,
        transmissionRatioStar: row.transmissionRatioStar,
        enginePower: row.enginePower,
        lineSpeed: row.lineSpeed,
        lineSpeedStar: row.lineSpeedStar,
        windingSpeed: row.windingSpeed,
        size: row.size,
        form: row.form,
        test: row.test,
        testStar: row.testStar,
        rating: row.rating,
        levelReq: row.levelReq,
        spoolCapacity: row.spoolCapacity,
        obtainMethod: row.obtainMethod,
        adaptWeight: row.adaptWeight,
        adaptWeightG: row.adaptWeightG,
        adaptWeightStar: row.adaptWeightStar,
        silverPrice: row.silverPrice,
        goldPrice: row.goldPrice,
        saltwaterResistant: row.saltwaterResistant,
        description: row.description
      }))
      results = results.concat(reelsData)
    }

    // 搜索过滤：同时支持原始匹配和归一化（去空格/分隔符）匹配
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const qNorm = q
        .replace(/\s+/g, '')
        .replace(/[-_/.,]/g, '')
      results = results.filter(item => {
        const fields = [item.model, item.equipmentName].filter(Boolean).map(String)
        for (const f of fields) {
          const low = f.toLowerCase()
          const norm = low
            .replace(/\s+/g, '')
            .replace(/[-_/.,]/g, '')
          if (low === q) return true
          if (low.startsWith(q)) return true
          if (qNorm && norm === qNorm) return true
          if (qNorm && norm.startsWith(qNorm)) return true
          if (qNorm && norm.includes(qNorm)) return true
          if (low.includes(q)) return true
        }
        return false
      })
    }
    
    return jsonResponse(results)
  } catch (error) {
    return errorResponse(error)
  }
}
