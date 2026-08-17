/**
 * 装备数据字段 primitive 化工具：
 * 防止 D1/后端返回的某些字段是对象（如 BigInt、自定义包装、空对象等），
 * 触发 "Cannot convert object to primitive value"。
 *
 * 原则：
 *  - null/undefined：保留（便于调用方判断是否为空）
 *  - string/number/boolean/bigint/symbol：保留（primitive 类型安全）
 *  - plain object / array / Date / 其他对象类型：
 *      * 数字字段（lockTension、panelTension、maxTension、silverPrice、
 *        goldPrice、wear、friction、strengthKg、testG、adaptWeightG、
 *        adaptWeightStar、lengthM、weightG、levelReq、rating 等）：
 *        尝试 Number(obj)，NaN 则兜底为 null
 *      * 其他字段（名称、分类、描述、文本适配重等）：
 *        尝试安全 toString，兜底 null
 */

/** 参与数值运算的字段名白名单 */
const NUMERIC_KEYS = new Set([
  'id',
  'lockTension', 'panelTension', 'maxTension', 'minTension',
  'silverPrice', 'goldPrice', 'price',
  'wear', 'friction', 'frictionForce',
  'strengthKg', 'panelStrength',
  'testG', 'adaptWeightG', 'adaptWeightStar',
  'lengthM', 'weightG',
  'levelReq', 'rating',
  'numBearings', 'numBearingsPlus',
  'gearRatio'
])

function isPrimitive(v) {
  if (v == null) return true
  const t = typeof v
  return t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol'
}

/**
 * 把非 primitive 值安全转成字符串：对象 try JSON.stringify 再退回空串
 * 不会触发隐式 toString 抛错
 */
export function safeToString(v, fallback = null) {
  if (v == null) return fallback
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint' || typeof v === 'symbol') {
    return String(v)
  }
  if (typeof v === 'object') {
    try {
      const s = typeof v.toString === 'function' ? v.toString() : null
      if (s != null && s !== '[object Object]' && s !== '') return s
    } catch (_) { /* ignore */ }
    try {
      const s = JSON.stringify(v)
      return s && s !== '{}' && s !== '[]' ? s : fallback
    } catch (_) { /* ignore */ }
    return fallback
  }
  return fallback
}

/**
 * 把非 primitive 值安全转成数值：
 * 先 Number(v) → 若 NaN 再尝试字符串提取数字 → 兜底 null
 */
export function safeToNumber(v, fallback = null) {
  if (v == null) return fallback
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, ''))
    return Number.isFinite(n) ? n : fallback
  }
  if (typeof v === 'object') {
    try {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    } catch (_) { /* ignore */ }
    const s = safeToString(v, '')
    if (s) {
      const match = String(s).replace(/,/g, '').match(/-?[\d.]+/)
      if (match) {
        const n = parseFloat(match[0])
        if (Number.isFinite(n)) return n
      }
    }
    return fallback
  }
  return fallback
}

/**
 * 组件通用安全转数值：薄包装 safeToNumber。
 * null/undefined 兜底 fallback（默认 0），防止隐式转换报错。
 */
export function toSafeNumber(v, fallback = 0) {
  const n = safeToNumber(v, fallback)
  return n == null ? fallback : n
}

/**
 * 组件通用安全转展示值：薄包装 safeToString。
 * null/undefined 兜底 fallback（默认 ''），防止模板插值对象触发隐式 toString 报错。
 */
export function toSafeDisplay(v, fallback = '') {
  const s = safeToString(v, fallback)
  return s == null ? fallback : s
}

/**
 * 深度清洗单个装备对象（或任意对象）所有字段：
 * 把对象型字段全部转成 primitive，从源头消除隐式转换风险
 */
export function sanitizeEquipmentFields(src) {
  if (src == null) return src
  if (Array.isArray(src)) {
    return src.map(item => sanitizeEquipmentFields(item))
  }
  if (typeof src !== 'object') return src

  const out = {}
  for (const key of Object.keys(src)) {
    const raw = src[key]
    if (isPrimitive(raw)) {
      out[key] = raw
      continue
    }
    // 递归嵌套对象/数组
    if (Array.isArray(raw)) {
      out[key] = raw.map(item => sanitizeEquipmentFields(item))
      continue
    }
    if (typeof raw === 'object') {
      // Date 直接转字符串
      if (raw instanceof Date) {
        out[key] = safeToString(raw, null)
        continue
      }
      // 数值字段名 → 尝试转数字
      if (NUMERIC_KEYS.has(key)) {
        out[key] = safeToNumber(raw, null)
        continue
      }
      // 文本字段：先尝试安全字符串；若返回空串且对象是 plain object，再尝试递归
      const s = safeToString(raw, null)
      if (s != null) {
        out[key] = s
      } else {
        // 兜底：递归清洗（可能是嵌套描述对象）
        out[key] = sanitizeEquipmentFields(raw)
        // 若递归后仍是对象且没有实际数据，返回 null 避免留下空对象
        if (out[key] && typeof out[key] === 'object') {
          const keys = Object.keys(out[key])
          if (keys.length === 0) out[key] = null
        }
      }
      continue
    }
    out[key] = raw
  }
  return out
}

/** 批量清洗装备数据数组 */
export function sanitizeEquipmentList(list) {
  if (!Array.isArray(list)) return []
  return list.map(item => sanitizeEquipmentFields(item))
}
