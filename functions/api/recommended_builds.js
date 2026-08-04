import { jsonResponse, errorResponse } from './_shared.js'

const INSERT_SQL = `INSERT INTO recommended_builds (
  name,
  rod_model, rod_name, rod_category,
  reel_model, reel_name, reel_category,
  main_line_tension, main_line_wear, main_line_material,
  leader_line_tension, leader_line_wear, leader_line_material,
  hook_name,
  calculation_rule, friction,
  description, suitable_fish, suitable_map
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    const { build } = body

    if (!build) {
      return jsonResponse({ success: false, message: '缺少装备数据' }, 400)
    }

    const db = env.DB
    const stmt = db.prepare(INSERT_SQL)
    const result = await stmt.bind(
      build.name || '',
      build.rodModel || '',
      build.rodName || '',
      build.rodCategory || '',
      build.reelModel || '',
      build.reelName || '',
      build.reelCategory || '',
      build.mainLineTension || 0,
      build.mainLineWear || 0,
      build.mainLineMaterial || '',
      build.leaderLineTension || 0,
      build.leaderLineWear || 0,
      build.leaderLineMaterial || '',
      build.hookName || '',
      build.calculationRule || 'guide',
      build.friction || 0,
      build.description || '',
      build.suitableFish || '',
      build.suitableMap || ''
    ).run()

    return jsonResponse({
      success: true,
      message: '推荐装备搭配已保存',
      id: result.meta.last_row_id
    })
  } catch (error) {
    return errorResponse(error)
  }
}
