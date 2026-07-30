import { jsonResponse, clearEquipmentCache } from './_shared.js'

function validatePassword(env, password) {
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

/** 单条 SQL IN 查询批量查重，替代逐条 SELECT（N+1） */
async function checkDuplicates(db, type, data) {
  const table = type === '鱼竿' ? 'rods' : 'reels'
  const models = [...new Set(data.map(item => item.model || '').filter(Boolean))]
  if (!models.length) return []

  const placeholders = models.map(() => '?').join(', ')
  const result = await db
    .prepare(`SELECT model FROM ${table} WHERE model IN (${placeholders})`)
    .bind(...models)
    .all()
  return result.results.map(row => row.model)
}

const ROD_INSERT_SQL = `INSERT OR REPLACE INTO rods (
  equipmentName, equipmentType, category, subCategory, model, description,
  strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability,
  rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

function bindRod(stmt, item) {
  return stmt.bind(
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
  )
}

const REEL_INSERT_SQL = `INSERT OR REPLACE INTO reels (
  equipmentName, equipmentType, category, subCategory, model, description,
  transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar,
  size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar,
  levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar,
  goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

function bindReel(stmt, item) {
  return stmt.bind(
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
  )
}

/**
 * D1 batch 批量插入，替代逐条 INSERT + await（N 次往返 → 1 次往返）。
 * batch 整体失败（如个别行违反唯一约束）时回退逐条插入，保留成功/失败计数语义。
 */
async function importItems(db, data, insertSql, bindFn) {
  const stmts = data.map(item => bindFn(db.prepare(insertSql), item))
  try {
    await db.batch(stmts)
    return { successCount: data.length, failCount: 0 }
  } catch (_) {
    let successCount = 0
    let failCount = 0
    for (const stmt of stmts) {
      try {
        await stmt.run()
        successCount++
      } catch (error) {
        failCount++
      }
    }
    return { successCount, failCount }
  }
}

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    const { password, type, data, upsert } = body

    const passwordValidation = validatePassword(env, password)
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

    // upsert 模式：直接覆盖已有型号，跳过查重
    if (upsert) {
      const result = normalizedType === '鱼竿'
        ? await importItems(db, data, ROD_INSERT_SQL, bindRod)
        : await importItems(db, data, REEL_INSERT_SQL, bindReel)
      await clearEquipmentCache()
      return jsonResponse({
        success: true,
        message: `覆盖导入完成，成功${result.successCount}条，失败${result.failCount}条`,
        mode: 'upsert',
        ...result
      })
    }

    // 普通模式：查重后插入
    const duplicates = await checkDuplicates(db, normalizedType, data)

    if (duplicates.length > 0) {
      return jsonResponse({
        success: false,
        message: `发现重复数据，以下型号已存在：${duplicates.join(', ')}`,
        duplicates
      }, 409)
    }

    const result = normalizedType === '鱼竿'
      ? await importItems(db, data, ROD_INSERT_SQL, bindRod)
      : await importItems(db, data, REEL_INSERT_SQL, bindReel)

    // 导入成功后清除装备缓存，确保下次请求拿到最新数据
    await clearEquipmentCache()

    return jsonResponse({
      success: true,
      message: `导入完成，成功${result.successCount}条，失败${result.failCount}条`,
      ...result
    })
  } catch (error) {
    return jsonResponse({ success: false, message: error.message }, 500)
  }
}
