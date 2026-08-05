/**
 * Pages Functions 共享工具模块（下划线前缀文件不会被注册为路由）。
 * 统一 JSON 响应、数字提取、搜索归一化与 SQL 搜索条件构建，
 * 消除 equipment/rods/reels/import_data 各自复制一份的重复实现。
 *
 * 说明：前端与 Functions 同源部署（同一 Pages 域名），无需跨域访问，
 * 因此不再返回 Access-Control-Allow-* 通配头，收紧攻击面。
 */

/** Cloudflare Cache API 缓存键前缀 */
const CACHE_PREFIX = 'rf4-api-v2:'
/** 装备数据缓存 TTL（1 小时，数据仅通过手动导入更新） */
const EQUIPMENT_CACHE_TTL = 3600

/** 反扒机制配置 */
export const ANTI_SCRAPING_CONFIG = {
  // 请求频率限制：每IP每分钟最大请求数
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 60,
    WINDOW_MS: 60000
  },
  // User-Agent 白名单关键词（允许包含这些关键词的UA访问）
  ALLOWED_UA_KEYWORDS: ['Mozilla', 'Chrome', 'Safari', 'Firefox', 'Edge'],
  // IP 黑名单存储键前缀
  BLACKLIST_PREFIX: 'rf4-blacklist:',
  // 速率限制计数存储键前缀
  RATE_LIMIT_PREFIX: 'rf4-ratelimit:'
}

/**
 * 获取客户端真实 IP
 * @param {Request} request
 * @returns {string}
 */
export function getClientIP(request) {
  // Cloudflare 会通过 CF-Connecting-IP 头传递真实 IP
  return request.headers.get('cf-connecting-ip') || 
         request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         'unknown'
}

/**
 * 验证 User-Agent 是否合法
 * @param {Request} request
 * @returns {boolean}
 */
export function isValidUserAgent(request) {
  const ua = request.headers.get('user-agent') || ''
  if (!ua) return false
  
  // 检查是否包含允许的关键词
  return ANTI_SCRAPING_CONFIG.ALLOWED_UA_KEYWORDS.some(keyword => 
    ua.includes(keyword)
  )
}

/**
 * 检查 IP 是否在黑名单中
 * @param {string} ip
 * @param {D1Database} db
 * @returns {Promise<boolean>}
 */
export async function isIPBlacklisted(ip, db) {
  if (!db || ip === 'unknown') return false
  
  try {
    const result = await db.prepare(
      'SELECT 1 FROM rate_limits WHERE ip = ? AND is_blacklisted = 1 LIMIT 1'
    ).bind(ip).first()
    return !!result
  } catch (e) {
    console.error('检查黑名单失败:', e)
    return false
  }
}

/**
 * 记录并检查请求频率
 * @param {string} ip
 * @param {D1Database} db
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
export async function checkRateLimit(ip, db) {
  if (!db || ip === 'unknown') {
    return { allowed: true, remaining: ANTI_SCRAPING_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE }
  }
  
  const maxRequests = ANTI_SCRAPING_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE
  
  try {
    const now = Date.now()
    const windowStart = now - ANTI_SCRAPING_CONFIG.RATE_LIMIT.WINDOW_MS
    
    // 清理过期记录
    await db.prepare(
      'DELETE FROM rate_limits WHERE ip = ? AND created_at < ?'
    ).bind(ip, new Date(windowStart).toISOString()).run()
    
    // 统计当前窗口内的请求数
    const countResult = await db.prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND created_at > ?'
    ).bind(ip, new Date(windowStart).toISOString()).first()
    
    const currentCount = countResult?.count || 0
    
    if (currentCount >= maxRequests) {
      // 超过限制，标记为可疑
      await db.prepare(
        'INSERT OR REPLACE INTO rate_limits (ip, request_count, last_request_at, is_suspicious) VALUES (?, ?, ?, 1)'
      ).bind(ip, currentCount + 1, new Date().toISOString()).run()
      return { allowed: false, remaining: 0 }
    }
    
    // 记录本次请求
    await db.prepare(
      'INSERT INTO rate_limits (ip, request_count, last_request_at) VALUES (?, 1, ?)'
    ).bind(ip, new Date().toISOString()).run()
    
    return { allowed: true, remaining: maxRequests - currentCount - 1 }
  } catch (e) {
    console.error('检查速率限制失败:', e)
    // 表不存在或其他错误时放行，避免阻塞正常请求
    return { allowed: true, remaining: maxRequests }
  }
}

/**
 * 尝试从 Cache API 读取缓存响应。
 * @param {Request} request 原始请求（用于生成缓存键）
 * @returns {Promise<Response|null>}
 */
export async function getCachedResponse(request) {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_PREFIX)
  return cache.match(request)
}

/**
 * 将响应写入 Cache API。
 * @param {Request} request 原始请求
 * @param {Response} response 待缓存的响应
 */
export async function putCache(request, response) {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(CACHE_PREFIX)
    // Cache API 要求响应带有 Content-Length 或 Transfer-Encoding
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', `public, max-age=${EQUIPMENT_CACHE_TTL}`)
    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
    await cache.put(request, cachedResponse)
  } catch (_) {
    // 缓存写入失败不影响主流程
  }
}

/**
 * 清除装备相关的所有缓存（导入新数据后调用）。
 */
export async function clearEquipmentCache() {
  if (typeof caches === 'undefined') return
  try {
    await caches.delete(CACHE_PREFIX)
  } catch (_) {}
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function errorResponse(error) {
  return jsonResponse({ error: error.message }, 500)
}

/**
 * 数据脱敏：返回前端需要的字段（含对比页所需）
 * 移除 description（过长文本）和内部元数据字段
 * @param {object} row 数据库原始行
 * @param {string} type 'rod' | 'reel'
 * @returns {object} 脱敏后的数据
 */
export function sanitizeEquipmentData(row, type) {
  if (type === 'rod') {
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
      rating: row.rating,
      ratingAlias: row.ratingAlias || '',
      weightG: row.weightG,
      lengthM: row.lengthM,
      strengthKg: row.strengthKg,
      testG: row.testG,
      sensitivity: row.sensitivity,
      hardness: row.hardness,
      form: row.form,
      structure: row.structure,
      ability: row.ability,
      adaptWeight: row.adaptWeight,
      adaptWeightStar: row.adaptWeightStar,
      adaptWeightG: row.adaptWeightG,
      levelReq: row.levelReq,
      silverPrice: extractNumber(row.silverPrice),
      goldPrice: extractNumber(row.goldPrice)
    }
  } else if (type === 'reel') {
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
      rating: row.rating,
      ratingAlias: row.ratingAlias || '',
      size: row.size,
      form: row.form,
      levelReq: row.levelReq,
      frictionForce: row.frictionForce,
      transmissionRatio: row.transmissionRatio,
      lineSpeed: row.lineSpeed,
      windingSpeed: row.windingSpeed,
      spoolCapacity: row.spoolCapacity,
      saltwaterResistant: row.saltwaterResistant,
      adaptWeight: row.adaptWeight,
      adaptWeightStar: row.adaptWeightStar,
      adaptWeightG: row.adaptWeightG,
      test: row.test,
      silverPrice: extractNumber(row.silverPrice),
      goldPrice: extractNumber(row.goldPrice)
    }
  }
  return row
}
/** 从 "12.5 kg" / "1,024" 这类文本中提取数字，失败兜底 0 */
export function extractNumber(str) {
  if (!str) return 0
  const cleaned = String(str).replace(/,/g, '')
  const match = cleaned.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

/**
 * 归一化搜索词：转小写 + 去空白 + 去常见分隔符
 * 与前端 src/utils/search.js 的 normalizeForSearch 保持一致
 * 例："Admiral-2000S" → "admiral2000s"
 */
export function normalizeSearch(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_/.,]/g, '')
}

/**
 * 后端统一的装备搜索字段（rods/reels/equipment 三个 API 共用）。
 * 与前端 EQUIPMENT_SEARCH_FIELDS 对齐，但不含 ratingAlias：
 * 它是前端根据 rating 计算的中文别名，数据库中不存在该列。
 */
export const SEARCH_FIELDS = Object.freeze(['model', 'equipmentName', 'category', 'subCategory', 'rating'])

/** 无搜索时的安全上限：防数据膨胀后单次全量返回失控（当前 rods≈780/reels≈460，余量充足） */
export const NO_SEARCH_LIMIT = 5000

/** 字段的 SQL 归一化表达式：LOWER + 去掉空格与 -_/., 分隔符（与 normalizeSearch 对齐） */
function normalizedFieldSql(field) {
  let expr = `LOWER(${field})`
  for (const ch of [' ', '-', '_', '/', '.', ',']) {
    expr = `REPLACE(${expr}, '${ch}', '')`
  }
  return expr
}

/**
 * 构建多字段模糊搜索的 SQL WHERE 片段（原文包含 或 归一化后包含），
 * 绑定参数按顺序追加进 binds 数组。数据过滤下推到 D1，避免全表取回后 JS 过滤。
 */
export function buildSearchWhere(fields, query, binds) {
  const q = String(query).trim().toLowerCase()
  const qNorm = normalizeSearch(q)
  const conds = []
  for (const f of fields) {
    conds.push(`instr(LOWER(${f}), ?) > 0`)
    binds.push(q)
    if (qNorm) {
      conds.push(`instr(${normalizedFieldSql(f)}, ?) > 0`)
      binds.push(qNorm)
    }
  }
  return `(${conds.join(' OR ')})`
}
