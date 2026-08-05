import { jsonResponse, errorResponse } from './_shared.js'

const INSERT_SQL = `INSERT INTO recommended_builds (
  name,
  rod_model, rod_name, rod_category, rod_price, rod_tension,
  reel_model, reel_name, reel_category, reel_price, reel_tension,
  main_line_tension, main_line_wear, main_line_material, main_line_diameter, main_line_length,
  leader_line_tension, leader_line_wear, leader_line_material, leader_line_diameter, leader_line_length,
  hook_name,
  calculation_rule, friction,
  description, suitable_fish, suitable_map,
  is_approved
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

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
      build.rodTension || 0,
      build.reelModel || '',
      build.reelName || '',
      build.reelCategory || '',
      build.reelPrice || 0,
      build.reelTension || 0,
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
      build.suitableMap || '',
      0  // 新提交的方案默认未审核
    ).run()

    return jsonResponse({
      success: true,
      message: '推荐装备搭配已保存，等待审核',
      id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('保存失败:', error)
    return errorResponse(error)
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return jsonResponse({ success: false, message: '缺少方案ID' }, 400)
    }

    const db = env.DB
    await db.prepare('DELETE FROM recommended_builds WHERE id = ?').bind(id).run()

    return jsonResponse({ success: true, message: '方案已删除' })
  } catch (error) {
    console.error('删除失败:', error)
    return errorResponse(error)
  }
}

export async function onRequestPut(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    const { id, isApproved } = body

    if (!id) {
      return jsonResponse({ success: false, message: '缺少方案ID' }, 400)
    }

    const db = env.DB
    await db.prepare('UPDATE recommended_builds SET is_approved = ? WHERE id = ?')
      .bind(isApproved ? 1 : 0, id)
      .run()

    return jsonResponse({ 
      success: true, 
      message: isApproved ? '方案已通过审核' : '方案已取消审核' 
    })
  } catch (error) {
    console.error('审核操作失败:', error)
    return errorResponse(error)
  }
}

export async function onRequestGet(context) {
  const { env, request } = context
  const url = new URL(request.url)
  const fishName = url.searchParams.get('fish')
  const adminMode = url.searchParams.get('admin') === 'true'

  try {
    const db = env.DB
    
    let query = 'SELECT * FROM recommended_builds'
    let bindings = []
    const conditions = []
    
    // 非管理员模式只显示已审核的方案
    if (!adminMode) {
      conditions.push('is_approved = 1')
    }
    
    // 如果指定了鱼种，添加过滤条件
    if (fishName) {
      conditions.push('suitable_fish LIKE ?')
      bindings.push(`%${fishName}%`)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY created_at DESC'
    
    const result = await db.prepare(query).bind(...bindings).all()
    
    return jsonResponse({
      success: true,
      data: result.results || []
    })
  } catch (error) {
    return errorResponse(error)
  }
}
