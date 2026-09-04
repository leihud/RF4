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
  // 自动拉黑阈值：累计被限流的请求数达到该值（≈连续 5 分钟持续超限）即视为脚本滥用
  AUTO_BAN_THRESHOLD: 60 * 5,
  // 自动解封时长：黑名单记录超过该时长未再活跃则自动解除（动态 IP 可能已易主）
  BAN_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
  // IP 黑名单存储键前缀
  BLACKLIST_PREFIX: 'rf4-blacklist:',
  // 速率限制计数存储键前缀
  RATE_LIMIT_PREFIX: 'rf4-ratelimit:'
}

/** 明显非浏览器的脚本/爬虫 UA 关键词（命中即拒绝，先于放行判断） */
const BLOCKED_UA_KEYWORDS = Object.freeze([
  'bot', 'crawl', 'spider', 'scrapy', 'curl', 'wget', 'libwww', 'python',
  'aiohttp', 'go-http-client', 'axios', 'node-fetch', 'postman', 'insomnia',
  'okhttp', 'httpclient', 'apache-httpclient', 'java/', 'phantomjs',
  'headlesschrome', 'headless', 'urllib', 'requests', 'fetch/',
  'googlebot', 'bingbot', 'bingpreview', 'baiduspider', 'yandex',
  'facebookexternalhit', 'slackbot', 'discordbot', 'telegrambot', 'whatsapp'
])

/**
 * 获取客户端真实 IP
 * @param {Request} request
 * @returns {string}
 */
export function getClientIP(request) {
  // 仅信任 Cloudflare 边缘注入的 CF-Connecting-IP。
  // 不再回退到 X-Forwarded-For：该头可由客户端伪造，
  // 回退会为「伪造 IP 绕过限流/黑名单」留出通道。
  const ip = request.headers.get('cf-connecting-ip')
  return (ip && ip.trim()) || 'unknown'
}

/**
 * 验证 User-Agent 是否合法
 * @param {Request} request
 * @returns {boolean}
 */
export function isValidUserAgent(request) {
  const ua = (request.headers.get('user-agent') || '').trim()
  if (!ua) return false

  // 命中明显的脚本/爬虫 UA 直接拒绝
  const low = ua.toLowerCase()
  if (BLOCKED_UA_KEYWORDS.some(keyword => low.includes(keyword))) return false

  // 真实浏览器（含移动端 WebView）UA 均以 "Mozilla/" 开头；
  // 基础层反爬到此为止，更严格的 Bot 防护需在 Cloudflare WAF/机器人管理侧配置
  return /^mozilla\//.test(low)
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
      'SELECT id, last_request_at FROM rate_limits WHERE ip = ? AND is_blacklisted = 1 LIMIT 1'
    ).bind(ip).first()
    if (!result) return false

    // 自动解封：黑名单记录长期无新请求多半属于动态 IP 已易主，
    // 避免永久误伤 NAT / 运营商共享 IP 的后继使用者
    const last = result.last_request_at ? new Date(result.last_request_at).getTime() : Number.NaN
    if (!Number.isNaN(last) && Date.now() - last > ANTI_SCRAPING_CONFIG.BAN_DURATION_MS) {
      await db.prepare(
        'UPDATE rate_limits SET is_blacklisted = 0, is_suspicious = 0, request_count = 0 WHERE id = ?'
      ).bind(result.id).run()
      return false
    }
    return true
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
    const nowIso = new Date(now).toISOString()
    
    // 读取该 IP 当前记录（rate_limits 表 UNIQUE(ip)，每 IP 仅一行）
    const row = await db.prepare(
      'SELECT request_count, last_request_at FROM rate_limits WHERE ip = ?'
    ).bind(ip).first()
    
    // 上次请求仍在窗口内则累加计数，否则重置为 0
    let currentCount = 0
    if (row && row.last_request_at) {
      const lastTime = new Date(row.last_request_at).getTime()
      if (!Number.isNaN(lastTime) && lastTime > windowStart) {
        currentCount = row.request_count || 0
      }
    }
    
    if (currentCount >= maxRequests) {
      // 超限：标记可疑并累加计数（upsert 避免 UNIQUE 冲突）。
      // 累计超过阈值（≈连续 5 分钟持续超限）自动升级为黑名单，供 isIPBlacklisted 消费
      await db.prepare(
        `INSERT INTO rate_limits (ip, request_count, last_request_at, is_suspicious)
         VALUES (?, 1, ?, 1)
         ON CONFLICT(ip) DO UPDATE SET request_count = rate_limits.request_count + 1, last_request_at = excluded.last_request_at, is_suspicious = 1`
      ).bind(ip, nowIso, nowIso).run()
      await db.prepare(
        'UPDATE rate_limits SET is_blacklisted = 1 WHERE ip = ? AND is_blacklisted = 0 AND request_count >= ?'
      ).bind(ip, ANTI_SCRAPING_CONFIG.AUTO_BAN_THRESHOLD).run()
      return { allowed: false, remaining: 0 }
    }
    
    // 未超限：单次 upsert 累加计数，替代原 DELETE+COUNT+INSERT 三次操作
    await db.prepare(
      `INSERT INTO rate_limits (ip, request_count, last_request_at)
       VALUES (?, 1, ?)
       ON CONFLICT(ip) DO UPDATE SET request_count = ?, last_request_at = ?`
    ).bind(ip, nowIso, currentCount + 1, nowIso).run()
    
    return { allowed: true, remaining: maxRequests - currentCount - 1 }
  } catch (e) {
    console.error('检查速率限制失败:', e)
    // 限流状态不可用（表异常/DB 故障）时按保守策略拒绝而非放行，
    // 避免「DB 抖动 = 限流失效」的绕过路径；DB 恢复后自动恢复
    return { allowed: false, remaining: 0, message: '请求过于频繁，请稍后重试' }
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
export async function putCache(request, response, ttl = EQUIPMENT_CACHE_TTL) {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(CACHE_PREFIX)
    // Cache API 要求响应带有 Content-Length 或 Transfer-Encoding
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', `public, max-age=${ttl}`)
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

/** 方案缓存：独立缓存库 + 较短 TTL（300s），兼顾性能与审核/点赞的时效性 */
const BUILDS_CACHE_NAME = 'rf4-builds-v1'
const BUILDS_CACHE_TTL = 300

export async function getBuildsCachedResponse(request) {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(BUILDS_CACHE_NAME)
    return await cache.match(request)
  } catch (_) {
    return null
  }
}

export async function putBuildsCache(request, response) {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(BUILDS_CACHE_NAME)
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', `public, max-age=${BUILDS_CACHE_TTL}`)
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

export async function clearBuildsCache() {
  if (typeof caches === 'undefined') return
  try {
    await caches.delete(BUILDS_CACHE_NAME)
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

export function errorResponse(error, status = 500) {
  // 统一错误契约 { success:false, message }；
  // 不向前端回传 DB 等内部实现细节，调用方应先在 catch 中用 console.error 记录原始错误
  return jsonResponse({ success: false, message: '服务器处理请求失败，请稍后重试' }, status)
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
      frictionForceStar: row.frictionForceStar,
      transmissionRatio: row.transmissionRatio,
      transmissionRatioStar: row.transmissionRatioStar,
      lineSpeed: row.lineSpeed,
      lineSpeedStar: row.lineSpeedStar,
      windingSpeed: row.windingSpeed,
      spoolCapacity: row.spoolCapacity,
      saltwaterResistant: row.saltwaterResistant,
      adaptWeight: row.adaptWeight,
      adaptWeightStar: row.adaptWeightStar,
      adaptWeightG: row.adaptWeightG,
      test: row.test,
      testStar: row.testStar,
      lockTensionStar: row.lockTensionStar,
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

/**
 * 装备查询 handler 工厂（rods/reels 共用）。
 * 合并反扒检查、缓存、SQL 构建与数据脱敏，消除 rods.js/reels.js 95% 代码重复。
 * 缓存检查在反扒 DB 写入之前，合法无搜索请求命中缓存时跳过 3 次 rate_limit DB 操作。
 */
export function createEquipmentHandler(tableName, sanitizeType) {
  return async function onRequestGet(context) {
    const { request, env } = context
    const url = new URL(request.url)
    const searchQuery = url.searchParams.get('q')
    const category = url.searchParams.get('category')

    // 反扒检查：UA 验证（纯内存，无 DB 开销）
    if (!isValidUserAgent(request)) {
      return jsonResponse({ error: 'Invalid User-Agent' }, 403)
    }

    const clientIP = getClientIP(request)

    // 缓存优先：合法无搜索请求命中缓存时，跳过后续 3 次 rate_limit DB 操作
    const cacheable = !searchQuery
    if (cacheable) {
      const cached = await getCachedResponse(request)
      if (cached) return cached
    }

    // IP 黑名单（需 DB 读取）
    if (await isIPBlacklisted(clientIP, env.DB)) {
      return jsonResponse({ error: 'IP blocked' }, 403)
    }

    // 请求频率限制（需 DB 读写）
    const rateCheck = await checkRateLimit(clientIP, env.DB)
    if (!rateCheck.allowed) {
      return jsonResponse({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      }, 429)
    }

    try {
      const conds = []
      const binds = []
      if (category) {
        conds.push('category = ?')
        binds.push(category)
      }
      const hasSearch = !!(searchQuery && searchQuery.trim())
      if (hasSearch) {
        conds.push(buildSearchWhere(SEARCH_FIELDS, searchQuery, binds))
      }

      let sql = `SELECT * FROM ${tableName}`
      if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`
      sql += hasSearch ? ' LIMIT 50' : ` LIMIT ${NO_SEARCH_LIMIT}`

      const result = await env.DB.prepare(sql).bind(...binds).all()
      const sanitizedResults = result.results.map(row => sanitizeEquipmentData(row, sanitizeType))
      const response = jsonResponse(sanitizedResults)
      // 用 waitUntil 确保缓存写入在响应返回后仍能完成；
      // 直接 fire-and-forget 会因执行上下文销毁而取消写入，导致缓存永不命中
      if (cacheable && typeof context.waitUntil === 'function') {
        context.waitUntil(putCache(request, response.clone()))
      }
      return response
    } catch (error) {
      console.error('Database query error:', error)
      return jsonResponse([])
    }
  }
}
