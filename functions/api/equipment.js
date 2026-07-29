import { jsonResponse, errorResponse, extractNumber, buildSearchWhere } from './_shared.js'

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

/** 查询单表，搜索条件（model/equipmentName 模糊匹配）下推到 SQL */
async function queryTable(db, table, searchQuery) {
  let sql = `SELECT * FROM ${table}`
  const binds = []
  if (searchQuery && searchQuery.trim()) {
    sql += ` WHERE ${buildSearchWhere(['model', 'equipmentName'], searchQuery, binds)}`
  }
  const result = await db.prepare(sql).bind(...binds).all()
  return result.results
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const searchQuery = url.searchParams.get('q')

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

    return jsonResponse(results)
  } catch (error) {
    return errorResponse(error)
  }
}
