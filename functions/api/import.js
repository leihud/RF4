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

function extractNumber(str) {
  if (!str) return 0
  const match = String(str).match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

async function fetchAndImportRods(env) {
  const response = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/rod_compare.json')
  if (!response.ok) throw new Error('Failed to fetch rod data')
  
  const data = await response.json()
  const db = env.DB
  
  await db.prepare('DELETE FROM rods').run()
  
  const batchSize = 50
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      await db.prepare(`INSERT INTO rods (
        equipmentName, equipmentType, category, subCategory, model, description,
        strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability,
        rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          item.equipmentName || '',
          item.equipmentType || '鱼竿',
          item.category || '',
          item.subCategory || '',
          item.model || '',
          item.description || '',
          item.strengthKg || '',
          item.form || '',
          item.testG || 0,
          item.sensitivity || 0,
          item.hardness || '',
          item.levelReq || '',
          item.structure || '',
          item.ability || '',
          item.rating || '',
          item.weightG || '',
          item.adaptWeight || '',
          item.adaptWeightG || 0,
          item.goldPrice || '',
          item.silverPrice || '',
          item.lengthM || ''
        ).run()
    }
  }
  
  return data.length
}

async function fetchAndImportReels(env) {
  const response = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/reel_compare.json')
  if (!response.ok) throw new Error('Failed to fetch reel data')
  
  const data = await response.json()
  const db = env.DB
  
  await db.prepare('DELETE FROM reels').run()
  
  const batchSize = 50
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      await db.prepare(`INSERT INTO reels (
        equipmentName, equipmentType, category, subCategory, model, description,
        transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar,
        size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar,
        levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar,
        goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          item.equipmentName || '',
          item.equipmentType || '渔轮',
          item.category || '',
          item.subCategory || '',
          item.model || '',
          item.description || '',
          item.transmissionRatio || '',
          item.transmissionRatioStar || '',
          item.enginePower || '',
          item.lineSpeed || '',
          item.lineSpeedStar || '',
          item.size || '',
          item.form || '',
          item.frictionForce || '',
          item.frictionForceStar || 0,
          item.windingSpeed || '',
          item.test || '',
          item.testStar || 0,
          item.levelReq || '',
          item.spoolCapacity || '',
          item.obtainMethod || '',
          item.rating || '',
          item.adaptWeight || '',
          item.adaptWeightStar || 0,
          item.goldPrice || '',
          item.silverPrice || '',
          item.lockTension || '',
          item.lockTensionStar || 0,
          item.saltwaterResistant || ''
        ).run()
    }
  }
  
  return data.length
}

async function fetchAndImportEquipment(env) {
  const response = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/equipment.json')
  if (!response.ok) throw new Error('Failed to fetch equipment data')
  
  const data = await response.json()
  const db = env.DB
  
  await db.prepare('DELETE FROM equipment').run()
  
  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      await db.prepare(`INSERT INTO equipment (
        equipmentType, equipmentName, lockTension, panelTension, price
      ) VALUES (?, ?, ?, ?, ?)`)
        .bind(
          item.equipmentType || '',
          item.equipmentName || '',
          extractNumber(item.lockTension),
          extractNumber(item.panelTension),
          extractNumber(item.price)
        ).run()
    }
  }
  
  return data.length
}

export async function onRequestGet(context) {
  const { env } = context
  
  try {
    const results = {}
    
    results.rods = await fetchAndImportRods(env)
    results.reels = await fetchAndImportReels(env)
    results.equipment = await fetchAndImportEquipment(env)
    
    return jsonResponse({ 
      success: true, 
      message: '数据导入完成', 
      results 
    })
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500)
  }
}