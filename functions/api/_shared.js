/**
 * Pages Functions 共享工具模块（下划线前缀文件不会被注册为路由）。
 * 统一 JSON 响应、数字提取、搜索归一化与 SQL 搜索条件构建，
 * 消除 equipment/rods/reels/import_data 各自复制一份的重复实现。
 *
 * 说明：前端与 Functions 同源部署（同一 Pages 域名），无需跨域访问，
 * 因此不再返回 Access-Control-Allow-* 通配头，收紧攻击面。
 */

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
export const SEARCH_FIELDS = Object.freeze(['model', 'equipmentName', 'category', 'subCategory'])

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
