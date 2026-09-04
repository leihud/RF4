import { jsonResponse, errorResponse, getClientIP, isValidUserAgent, checkRateLimit, isIPBlacklisted, getBuildsCachedResponse, putBuildsCache, clearBuildsCache } from './_shared.js'

/** 验证管理员密码（写操作保护） */
function validateAdminPassword(env, password) {
  const importPassword = env.IMPORT_PASSWORD
  if (!importPassword) {
    return password && password.length > 0
  }
  return password === importPassword
}

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

    clearBuildsCache()
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
    const { id, password } = body

    if (!validateAdminPassword(env, password)) {
      return jsonResponse({ success: false, message: '需要管理员密码' }, 403)
    }

    if (!id) {
      return jsonResponse({ success: false, message: '缺少方案ID' }, 400)
    }

    const db = env.DB
    await db.prepare('DELETE FROM recommended_builds WHERE id = ?').bind(id).run()

    clearBuildsCache()
    return jsonResponse({ success: true, message: '方案已删除' })
  } catch (error) {
    console.error('删除失败:', error)
    return errorResponse(error)
  }
}

const UPDATE_SQL = `UPDATE recommended_builds SET
  name = ?,
  rod_model = ?, rod_name = ?, rod_category = ?, rod_price = ?, rod_tension = ?,
  reel_model = ?, reel_name = ?, reel_category = ?, reel_price = ?, reel_tension = ?,
  main_line_tension = ?, main_line_wear = ?, main_line_material = ?, main_line_diameter = ?, main_line_length = ?,
  leader_line_tension = ?, leader_line_wear = ?, leader_line_material = ?, leader_line_diameter = ?, leader_line_length = ?,
  hook_name = ?,
  calculation_rule = ?, friction = ?,
  description = ?, suitable_fish = ?, suitable_map = ?
WHERE id = ?`

const UPDATE_META_SQL = `UPDATE recommended_builds SET
  name = ?,
  description = ?, suitable_fish = ?, suitable_map = ?
WHERE id = ?`

export async function onRequestPatch(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    const { id, build, password } = body

    if (!validateAdminPassword(env, password)) {
      return jsonResponse({ success: false, message: '需要管理员密码' }, 403)
    }

    if (!id || !build) {
      return jsonResponse({ success: false, message: '缺少方案ID或数据' }, 400)
    }

    const db = env.DB

    // 判断是否包含装备数据（完整更新 vs 仅元数据更新）
    const hasEquipment = build.rodModel !== undefined || build.rod_model !== undefined

    if (hasEquipment) {
      // 完整更新（来自计算器提交）
      await db.prepare(UPDATE_SQL).bind(
        build.name || '',
        build.rodModel || '', build.rodName || '', build.rodCategory || '', build.rodPrice || 0, build.rodTension || 0,
        build.reelModel || '', build.reelName || '', build.reelCategory || '', build.reelPrice || 0, build.reelTension || 0,
        build.mainLineTension || 0, build.mainLineWear || 0, build.mainLineMaterial || '', build.mainLineDiameter || 0, build.mainLineLength || 0,
        build.leaderLineTension || 0, build.leaderLineWear || 0, build.leaderLineMaterial || '', build.leaderLineDiameter || 0, build.leaderLineLength || 0,
        build.hookName || '',
        build.calculationRule || 'guide', build.friction || 0,
        build.description || '', build.suitableFish || '', build.suitableMap || '',
        id
      ).run()
    } else {
      // 仅更新元数据（来自管理员编辑）
      await db.prepare(UPDATE_META_SQL).bind(
        build.name || '',
        build.description || '', build.suitable_fish || '', build.suitable_map || '',
        id
      ).run()
    }

    clearBuildsCache()
    return jsonResponse({ success: true, message: '方案已更新' })
  } catch (error) {
    console.error('更新方案失败:', error)
    return errorResponse(error)
  }
}

export async function onRequestPut(context) {
  const { request, env } = context

  try {
    const body = await request.json()
    const { id, isApproved, password, rejectReason } = body

    if (!validateAdminPassword(env, password)) {
      return jsonResponse({ success: false, message: '需要管理员密码' }, 403)
    }

    if (!id) {
      return jsonResponse({ success: false, message: '缺少方案ID' }, 400)
    }

    const db = env.DB
    // 通过审核时清空驳回原因；驳回时记录原因供提交者查看
    await db.prepare('UPDATE recommended_builds SET is_approved = ?, reject_reason = ? WHERE id = ?')
      .bind(isApproved ? 1 : 0, isApproved ? '' : (rejectReason || ''), id)
      .run()

    clearBuildsCache()
    return jsonResponse({ 
      success: true, 
      message: isApproved ? '方案已通过审核' : '方案已驳回' 
    })
  } catch (error) {
    console.error('审核操作失败:', error)
    return errorResponse(error)
  }
}

export async function onRequestGet(context) {
  const { env, request } = context

  // 反扒保护
  if (!isValidUserAgent(request)) {
    return jsonResponse({ success: false, message: 'Access denied' }, 403)
  }
  const clientIP = getClientIP(request)
  if (await isIPBlacklisted(clientIP, env.DB)) {
    return jsonResponse({ success: false, message: 'Access denied' }, 403)
  }
  const rateCheck = await checkRateLimit(clientIP, env.DB)
  if (!rateCheck.allowed) {
    return jsonResponse({ success: false, message: rateCheck.message || '请求过于频繁' }, 429)
  }

  const url = new URL(request.url)
  const fishName = url.searchParams.get('fish')
  const adminMode = url.searchParams.get('admin') === 'true'
  // 分页参数：limit 上限 200 防止滥用，不传则返回全部（兼容旧客户端）
  const limit = Math.min(parseInt(url.searchParams.get('limit'), 10) || 0, 200)
  const offset = parseInt(url.searchParams.get('offset'), 10) || 0

  // 管理视图（浏览未审核/已驳回方案）必须校验管理员密码，与写操作同一把锁；
  // 且管理响应绝不读写共享缓存，避免越权数据经 Cache API 泄漏给无密码请求
  if (adminMode) {
    const adminPassword =
      request.headers.get('x-admin-password') || url.searchParams.get('password') || ''
    if (!validateAdminPassword(env, adminPassword)) {
      return jsonResponse({ success: false, message: '需要管理员密码' }, 401)
    }
  } else {
    // 短 TTL 缓存（300s）：仅公开列表可缓存，写操作（提交/审核/删除/点赞）后会主动失效
    const cached = await getBuildsCachedResponse(request)
    if (cached) return cached
  }

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

    // 多取 1 条用于判断是否还有下一页，避免额外 COUNT 查询
    if (limit > 0) {
      query += ' LIMIT ? OFFSET ?'
      bindings = bindings.concat([limit + 1, offset])
    }

    const result = await db.prepare(query).bind(...bindings).all()
    let rows = result.results || []
    let hasMore = false
    if (limit > 0 && rows.length > limit) {
      rows = rows.slice(0, limit)
      hasMore = true
    }

    // 公开响应最小化：仅剔除管理专用字段 reject_reason（驳回原因可能含管理侧措辞）；
    // is_approved 保留（公开行恒为 1），页面模板依赖它判断“待审核/已驳回”标签的显隐
    if (!adminMode) {
      rows = rows.map(({ reject_reason, ...rest }) => rest)
    }

    const response = jsonResponse({
      success: true,
      data: rows,
      hasMore
    })
    if (!adminMode) putBuildsCache(request, response.clone())
    return response
  } catch (error) {
    console.error('查询方案失败:', error)
    return errorResponse(error)
  }
}
