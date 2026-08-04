import { jsonResponse, errorResponse } from './_shared.js'

const INSERT_SQL = `INSERT INTO recommended_builds (
  name,
  rod_model, rod_name, rod_category, rod_price,
  reel_model, reel_name, reel_category, reel_price,
  main_line_tension, main_line_wear, main_line_material, main_line_diameter, main_line_length,
  leader_line_tension, leader_line_wear, leader_line_material, leader_line_diameter, leader_line_length,
  hook_name,
  calculation_rule, friction,
  description, suitable_fish, suitable_map
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    console.log('接收到的数据:', JSON.stringify(body, null, 2))
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
      build.rodPrice || 0,
      build.reelModel || '',
      build.reelName || '',
      build.reelCategory || '',
      build.reelPrice || 0,
      build.mainLineTension || 0,
      build.mainLineWear || 0,
      build.mainLineMaterial || '',
      build.mainLineDiameter || 0,
      build.mainLineLength || 0,
      build.leaderLineTension || 0,
      build.leaderLineWear || 0,
      build.leaderLineMaterial || '',
      build.leaderLineDiameter || 0,
      build.leaderLineLength || 0,
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
    console.error('保存失败:', error)
    return errorResponse(error)
  }
}

export async function onRequestGet(context) {
  const { env, request } = context
  const url = new URL(request.url)
  const fishName = url.searchParams.get('fish')

  try {
    const db = env.DB
    
    let query = 'SELECT * FROM recommended_builds ORDER BY created_at DESC'
    let bindings = []
    
    // 如果指定了鱼种，添加过滤条件
    if (fishName) {
      query = 'SELECT * FROM recommended_builds WHERE suitable_fish LIKE ? ORDER BY created_at DESC LIMIT 10'
      bindings = [`%${fishName}%`]
    }
    
    const result = await db.prepare(query).bind(...bindings).all()
    
    return jsonResponse({
      success: true,
      data: result.results || []
    })
  } catch (error) {
    return errorResponse(error)
  }
}
