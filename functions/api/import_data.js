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

async function validatePassword(env, password) {
  const importPassword = env.IMPORT_PASSWORD
  if (!importPassword) {
    return { valid: false, message: '未配置导入密码' }
  }
  if (!password) {
    return { valid: false, message: '请输入密码' }
  }
  if (password !== importPassword) {
    return { valid: false, message: '密码错误' }
  }
  return { valid: true, message: '' }
}

async function checkDuplicates(db, type, data) {
  const table = type === '鱼竿' ? 'rods' : 'reels'
  const duplicates = []
  
  for (const item of data) {
    const model = item.model || ''
    if (!model) continue
    
    const result = await db.prepare(`SELECT model FROM ${table} WHERE model = ?`).bind(model).first()
    if (result) {
      duplicates.push(model)
    }
  }
  
  return duplicates
}

async function importRods(db, data) {
  let successCount = 0
  let failCount = 0
  
  for (const item of data) {
    try {
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
      successCount++
    } catch (error) {
      failCount++
    }
  }
  
  return { successCount, failCount }
}

async function importReels(db, data) {
  let successCount = 0
  let failCount = 0
  
  for (const item of data) {
    try {
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
          item.transmissionRatioStar || 0,
          item.enginePower || '',
          item.lineSpeed || '',
          item.lineSpeedStar || 0,
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
      successCount++
    } catch (error) {
      failCount++
    }
  }
  
  return { successCount, failCount }
}

export async function onRequestOptions(context) {
  return jsonResponse({}, 200)
}

export async function onRequestPost(context) {
  const { request, env } = context
  
  try {
    const body = await request.json()
    const { password, type, data } = body
    
    const passwordValidation = await validatePassword(env, password)
    if (!passwordValidation.valid) {
      return jsonResponse({ success: false, message: passwordValidation.message }, 401)
    }
    
    if (!type) {
      return jsonResponse({ success: false, message: '请指定类型' }, 400)
    }
    const normalizedType = type.trim()
    if (normalizedType !== '鱼竿' && normalizedType !== '渔轮') {
      return jsonResponse({ success: false, message: '请指定正确的类型（鱼竿或渔轮）' }, 400)
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return jsonResponse({ success: false, message: '数据不能为空' }, 400)
    }
    
    const db = env.DB
    const duplicates = await checkDuplicates(db, normalizedType, data)
    
    if (duplicates.length > 0) {
      return jsonResponse({
        success: false,
        message: `发现重复数据，以下型号已存在：${duplicates.join(', ')}`,
        duplicates
      }, 409)
    }
    
    const result = normalizedType === '鱼竿' 
      ? await importRods(db, data)
      : await importReels(db, data)
    
    return jsonResponse({
      success: true,
      message: `导入完成，成功${result.successCount}条，失败${result.failCount}条`,
      ...result
    })
  } catch (error) {
    return jsonResponse({ success: false, message: error.message }, 500)
  }
}