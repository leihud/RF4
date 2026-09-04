import { jsonResponse, errorResponse, getClientIP, isValidUserAgent, checkRateLimit, isIPBlacklisted, clientGuard, enforceBodyLimit, getBuildsCachedResponse, putBuildsCache, clearBuildsCache } from './_shared.js'

/** 验证管理员密码（写操作保护） */
function validateAdminPassword(env, password) {
  const importPassword = env.IMPORT_PASSWORD
  if (!importPassword) {
    return password && password.length > 0
  }
  return password === importPassword
}

/** 随机 64 位十六进制 token，标记“方案属于哪个提交者” */
function generateOwnerToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  }
  const bytes = new Uint8Array(32)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/** owner_token 格式校验：64 位小写十六进制 */
const OWNER_TOKEN_RE = /^[0-9a-f]{64}$/

/** 写操作请求体上限：提交方案含约 30 个短字段，正常远低于 64KB */
const MAX_BODY_BYTES = 64 * 1024
const MAX_SMALL_BODY_BYTES = 16 * 1024

/** 文本字段上限（DB 列为 TEXT，此上限仅为防脚本灌超长文本；正常填写远低于该值） */
const MAX_TEXT_LEN = 300
const MAX_DESCRIPTION_LEN = 1000
const MAX_REASON_LEN = 200

function cleanText(value, max = MAX_TEXT_LEN) {
  if (value == null) return ''
  const s = String(value)
  return s.length > max ? s.slice(0, max) : s
}

function cleanNumber(value, max = 999999999) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return n > max ? max : n
}

/**
 * 提交/更新前就地清洗 build 对象：文本截断 + 数值合法化。
 * 兼容 camelCase（计算器提交）与 snake_case（管理员编辑）两套字段名。
 */
function sanitizeBuildFields(build) {
  const textKeys = [
    'rodModel', 'rodName', 'rodCategory',
    'reelModel', 'reelName', 'reelCategory',
    'mainLineMaterial', 'leaderLineMaterial', 'hookName', 'calculationRule',
    'suitableFish', 'suitableMap',
    'rod_model', 'rod_name', 'rod_category',
    'reel_model', 'reel_name', 'reel_category',
    'suitable_fish', 'suitable_map'
  ]
  for (const key of textKeys) {
    if (build[key] != null) build[key] = cleanText(build[key])
  }
  if (build.name != null) build.name = cleanText(build.name)
  if (build.description != null) build.description = cleanText(build.description, MAX_DESCRIPTION_LEN)
  const numKeys = [
    'rodPrice', 'rodTension', 'reelPrice', 'reelTension',
    'mainLineTension', 'mainLineWear', 'mainLineDiameter', 'mainLineLength',
    'leaderLineTension', 'leaderLineWear', 'leaderLineDiameter', 'leaderLineLength',
    'friction',
    'rod_price', 'rod_tension', 'reel_price', 'reel_tension'
  ]
  for (const key of numKeys) {
    if (build[key] != null) build[key] = cleanNumber(build[key])
  }
  return build
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
  is_approved,
  owner_token
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    // 写操作反爬保护（UA/黑名单/限流）+ 请求体上限，先于解析挡掉脚本流量
    const bodyLimit = enforceBodyLimit(request, MAX_BODY_BYTES)
    if (!bodyLimit.ok) return bodyLimit.response
    const guard = await clientGuard(request, env.DB)
    if (!guard.allowed) {
      return jsonResponse({ success: false, message: guard.message }, guard.status)
    }

    const body = await request.json()
    const { build } = body

    if (!build || typeof build !== 'object' || Array.isArray(build)) {
      return jsonResponse({ success: false, message: '缺少装备数据' }, 400)
    }
    sanitizeBuildFields(build)

    // 每次新提交生成独立的 owner_token 返回给提交者，
    // 提交者保存在本地，凭其可在“我的提交”中查看/删除自己的方案
    const ownerToken = generateOwnerToken()

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
      0,  // 新提交的方案默认未审核
      ownerToken
    ).run()

    clearBuildsCache()
    return jsonResponse({
      success: true,
      message: '推荐装备搭配已保存，等待审核',
      id: result.meta.last_row_id,
      ownerToken
    })
  } catch (error) {
    console.error('保存失败:', error)
    return errorResponse(error)
  }
}
export async function onRequestDelete(context) {
  const { request, env } = context

  try {
    // 反爬保护 + 请求体上限（body 仅含 id/password/ownerToken，远小于 16KB）
    const bodyLimit = enforceBodyLimit(request, MAX_SMALL_BODY_BYTES)
    if (!bodyLimit.ok) return bodyLimit.response
    const guard = await clientGuard(request, env.DB)
    if (!guard.allowed) {
      return jsonResponse({ success: false, message: guard.message }, guard.status)
    }

    const body = await request.json()
    const { id, password, ownerToken } = body

    const buildId = Number(id)
    if (!Number.isInteger(buildId) || buildId <= 0) {
      return jsonResponse({ success: false, message: '缺少有效的方案ID' }, 400)
    }

    const db = env.DB

    if (ownerToken) {
      // 提交者删除自己提交的方案：owner_token 即“我拥有该方案”的凭据
      if (typeof ownerToken !== 'string' || !OWNER_TOKEN_RE.test(ownerToken)) {
        return jsonResponse({ success: false, message: '无效的提交凭证' }, 400)
      }
      const build = await db
        .prepare('SELECT id, owner_token FROM recommended_builds WHERE id = ?')
        .bind(buildId)
        .first()
      if (!build) {
        return jsonResponse({ success: false, message: '方案不存在' }, 404)
      }
      if (build.owner_token !== ownerToken) {
        return jsonResponse({ success: false, message: '无权删除该方案' }, 403)
      }
    } else if (!validateAdminPassword(env, password)) {
      // 管理员删除路径：仍要求管理员密码
      return jsonResponse({ success: false, message: '需要管理员密码' }, 403)
    }

    await db.prepare('DELETE FROM recommended_builds WHERE id = ?').bind(buildId).run()

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
    // 反爬保护 + 请求体上限
    const bodyLimit = enforceBodyLimit(request, MAX_SMALL_BODY_BYTES)
    if (!bodyLimit.ok) return bodyLimit.response
    const guard = await clientGuard(request, env.DB)
    if (!guard.allowed) {
      return jsonResponse({ success: false, message: guard.message }, guard.status)
    }

    const body = await request.json()
    const { id, build, password } = body

    if (!validateAdminPassword(env, password)) {
      return jsonResponse({ success: false, message: '需要管理员密码' }, 403)
    }

    if (!id || !build || typeof build !== 'object' || Array.isArray(build)) {
      return jsonResponse({ success: false, message: '缺少方案ID或数据' }, 400)
    }
    sanitizeBuildFields(build)

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
    // 反爬保护 + 请求体上限（body 仅含 id/isApproved/password/rejectReason）
    const bodyLimit = enforceBodyLimit(request, MAX_SMALL_BODY_BYTES)
    if (!bodyLimit.ok) return bodyLimit.response
    const guard = await clientGuard(request, env.DB)
    if (!guard.allowed) {
      return jsonResponse({ success: false, message: guard.message }, guard.status)
    }

    const body = await request.json()
    const { id, isApproved, password, rejectReason } = body

    if (!validateAdminPassword(env, password)) {
      return jsonResponse({ success: false, message: '需要管理员密码' }, 403)
    }

    if (!id) {
      return jsonResponse({ success: false, message: '缺少方案ID' }, 400)
    }

    const db = env.DB
    const rejectReasonText = cleanText(rejectReason, MAX_REASON_LEN)
    // 通过审核时清空驳回原因；驳回时记录原因供提交者查看
    await db.prepare('UPDATE recommended_builds SET is_approved = ?, reject_reason = ? WHERE id = ?')
      .bind(isApproved ? 1 : 0, isApproved ? '' : rejectReasonText, id)
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
  // 我的提交：提交者凭本地保存的 owner_token（支持重复参数传多个）查回自己的方案
  const mineTokens = url.searchParams
    .getAll('mine')
    .map(t => t.trim())
    .filter(Boolean)
  if (mineTokens.length > 100) {
    return jsonResponse({ success: false, message: '参数过多' }, 400)
  }
  if (mineTokens.some(t => !OWNER_TOKEN_RE.test(t))) {
    return jsonResponse({ success: false, message: '无效的提交凭证' }, 400)
  }
  // 分页参数：limit 上限 200 防止滥用，不传则返回全部（兼容旧客户端）
  const limit = Math.min(parseInt(url.searchParams.get('limit'), 10) || 0, 200)
  const offset = parseInt(url.searchParams.get('offset'), 10) || 0

  // mine 视图携带唯一性隐私凭证，绝不读写共享缓存；
  // 管理视图必须校验管理员密码且同样不缓存；仅公开列表使用短 TTL 缓存
  if (mineTokens.length === 0 && adminMode) {
    const adminPassword =
      request.headers.get('x-admin-password') || url.searchParams.get('password') || ''
    if (!validateAdminPassword(env, adminPassword)) {
      return jsonResponse({ success: false, message: '需要管理员密码' }, 401)
    }
  } else if (mineTokens.length === 0) {
    // 短 TTL 缓存（300s）：仅公开列表可缓存，写操作（提交/审核/删除/点赞）后会主动失效
    const cached = await getBuildsCachedResponse(request)
    if (cached) return cached
  }

  try {
    const db = env.DB

    let query = 'SELECT * FROM recommended_builds'
    let bindings = []
    const conditions = []

    if (mineTokens.length > 0) {
      // 我的提交：返回本人全部方案（含待审核/已驳回），保留 reject_reason 供提交者查看驳回原因
      conditions.push(`owner_token IN (${mineTokens.map(() => '?').join(', ')})`)
      bindings = bindings.concat(mineTokens)
    } else if (!adminMode) {
      // 非管理员公开模式只显示已审核的方案
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

    // 任何视图都不回传 owner_token（提交者本人也无需重复回显）；
    // 公开列表额外剔除管理专用字段 reject_reason（驳回原因可能含管理侧措辞）。
    // is_approved 保留（公开行恒为 1），页面模板依赖它判断“待审核/已驳回”标签的显隐
    rows = rows.map(row => {
      const { owner_token, ...rest } = row
      if (mineTokens.length === 0 && !adminMode) {
        const { reject_reason, ...publicRow } = rest
        return publicRow
      }
      return rest
    })

    const response = jsonResponse({
      success: true,
      data: rows,
      hasMore
    })
    if (mineTokens.length === 0 && !adminMode) putBuildsCache(request, response.clone())
    return response
  } catch (error) {
    console.error('查询方案失败:', error)
    return errorResponse(error)
  }
}
