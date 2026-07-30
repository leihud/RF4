import { jsonResponse, errorResponse, extractNumber, buildSearchWhere, SEARCH_FIELDS, NO_SEARCH_LIMIT, getCachedResponse, putCache } from './_shared.js'

/** rods 表行 → 前端统一装备结构（鱼竿） */
function mapRod(row) {
  return {
    id: row.id,
    equipmentType: '鱼竿',
    equipmentName: row.equipmentName,
    model: row.model,
    category: row.category,
    subCategory: row.subCategory,
    panelTension: extractNumber(row.strengthKg),
    lockTension: extractNumber(row.strengthKg),
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
  }
}

/** reels 表行 → 前端统一装备结构（渔轮） */
function mapReel(row) {
  return {
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
  }
}

/** 查询单表，搜索条件（统一字段 SEARCH_FIELDS 模糊匹配）下推到 SQL */
async function queryTable(db, table, searchQuery) {
  let sql = `SELECT * FROM ${table}`
  const binds = []
  if (searchQuery && searchQuery.trim()) {
    sql += ` WHERE ${buildSearchWhere(SEARCH_FIELDS, searchQuery, binds)}`
  } else {
    // 无搜索时全量返回（带安全上限防数据膨胀失控）
    sql += ` LIMIT ${NO_SEARCH_LIMIT}`
  }
  const result = await db.prepare(sql).bind(...binds).all()
  return result.results
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const searchQuery = url.searchParams.get('q')

  // 仅缓存无搜索的全量请求
  const cacheable = !searchQuery
  if (cacheable) {
    const cached = await getCachedResponse(request)
    if (cached) return cached
  }

  try {
    let results = []

    if (!type || type === '鱼竿') {
      const rows = await queryTable(env.DB, 'rods', searchQuery)
      results = results.concat(rows.map(mapRod))
    }

    if (!type || type === '渔轮') {
      const rows = await queryTable(env.DB, 'reels', searchQuery)
      results = results.concat(rows.map(mapReel))
    }

    const response = jsonResponse(results)
    if (cacheable) putCache(request, response.clone())
    return response
  } catch (error) {
    return errorResponse(error)
  }
}
