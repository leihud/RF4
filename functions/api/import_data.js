import { jsonResponse, clearEquipmentCache, clientGuard, enforceBodyLimit } from './_shared.js'

/** 请求体上限：正常单次导入（≤2000 行）远低于此值 */
const MAX_BODY_BYTES = 10 * 1024 * 1024
/** 单次导入条数上限：防超大数组拖垮 D1 batch 写入配额 */
const MAX_IMPORT_ITEMS = 2000

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
  rating, weightG, adaptWeight, adaptWeightG, adaptWeightStar, goldPrice, silverPrice, lengthM
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

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
    item.testG ?? 0,
    item.sensitivity ?? 0,
    item.hardness || '',
    item.levelReq || '',
    item.structure || '',
    item.ability || '',
    item.rating || '',
    item.weightG || '',
    item.adaptWeight || '',
    item.adaptWeightG ?? 0,
    item.adaptWeightStar ?? 0,
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
    item.transmissionRatioStar ?? 0,
    item.enginePower || '',
    item.lineSpeed || '',
    item.lineSpeedStar ?? 0,
    item.size || '',
    item.form || '',
    item.frictionForce || '',
    item.frictionForceStar ?? 0,
    item.windingSpeed || '',
    item.test || '',
    item.testStar ?? 0,
    item.levelReq || '',
    item.spoolCapacity || '',
    item.obtainMethod || '',
    item.rating || '',
    item.adaptWeight || '',
    item.adaptWeightStar ?? 0,
    item.goldPrice || '',
    item.silverPrice || '',
    item.lockTension || '',
    item.lockTensionStar ?? 0,
    item.saltwaterResistant || ''
  )
}

/** 记录最后导入时间到 meta 表（失败不影响导入主流程） */
async function recordImportTime(db, type) {
  try {
    await db.prepare(
      `INSERT INTO meta (key, value, updated_at) VALUES ('last_import_at', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(`${new Date().toISOString()}|${type}`).run()
  } catch (_) { /* meta 写入失败不影响导入 */ }
}

/**
 * D1 batch 批量插入，替代逐条 INSERT + await（N 次往返 → 1 次往返）。
 * batch 整体失败（如个别行违反唯一约束）时回退逐条插入，保留成功/失败计数语义。
 */
async function importItems(db, data, insertSql, bindFn) {
  const stmts = data.map(item => bindFn(db.prepare(insertSql), item))
  try {
    await db.batch(stmts)
    return { successCount: data.length, failCount: 0, failedRows: [] }
  } catch (_) {
    let successCount = 0
    let failCount = 0
    const failedRows = []
    for (let i = 0; i < stmts.length; i++) {
      try {
        await stmts[i].run()
        successCount++
      } catch (error) {
        failCount++
        // 记录失败行号（对应 Excel 数据行）与原因，便于前端展示定位问题数据；最多回传 20 条避免响应过大
        if (failedRows.length < 20) {
          failedRows.push(`第${i + 1}行 ${data[i].model || data[i].equipmentName || ''}: ${error.message || '插入失败'}`)
        }
      }
    }
    return { successCount, failCount, failedRows }
  }
}

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    // 反爬保护：请求体上限 + UA/黑名单/限流，先于密码校验过滤脚本流量
    const bodyLimit = enforceBodyLimit(request, MAX_BODY_BYTES)
    if (!bodyLimit.ok) return bodyLimit.response
    const guard = await clientGuard(request, env.DB)
    if (!guard.allowed) {
      return jsonResponse({ success: false, message: guard.message }, guard.status)
    }

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
    if (data.length > MAX_IMPORT_ITEMS) {
      return jsonResponse({ success: false, message: `单次导入不能超过 ${MAX_IMPORT_ITEMS} 条` }, 400)
    }

    const db = env.DB
    const runImport = () => {
      if (normalizedType === '鱼竿') return importItems(db, data, ROD_INSERT_SQL, bindRod)
      return importItems(db, data, REEL_INSERT_SQL, bindReel)
    }

    // upsert 模式：直接覆盖已有型号，跳过查重
    if (upsert) {
      const result = await runImport()
      await clearEquipmentCache()
      await recordImportTime(db, normalizedType)
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

    const result = await runImport()

    // 导入成功后清除装备缓存并记录导入时间，确保下次请求拿到最新数据
    await clearEquipmentCache()
    await recordImportTime(db, normalizedType)

    return jsonResponse({
      success: true,
      message: `导入完成，成功${result.successCount}条，失败${result.failCount}条`,
      ...result
    })
  } catch (error) {
    console.error('导入失败:', error)
    // 不向前端回传 DB 内部细节
    return jsonResponse({ success: false, message: '服务器处理请求失败，请稍后重试' }, 500)
  }
}
