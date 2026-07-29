/**
 * 判断是否可安全做字符串操作：排除 null/undefined/对象/数组（对象
 * 没有正确的 valueOf/toString 时，String(obj) 会抛 "Cannot convert
 * object to primitive value"）
 */
function isStringable(v) {
  if (v == null) return false
  const t = typeof v
  return t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol'
}

/**
 * 转义正则元字符
 */
export function escapeRegExp(str) {
  if (!isStringable(str)) return ''
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 创建"以词边界、空白、下划线、连字符包裹"匹配的正则
 */
export function buildWordBoundaryRegex(query, flags = 'i') {
  const escaped = escapeRegExp(query)
  if (!escaped) return /(?!)/  // 永不匹配的空正则，避免 test 任何值
  return new RegExp(`(?:^|\\s|_|-)${escaped}(?:$|\\s|_|-)`, flags)
}

/**
 * 归一化字符串用于搜索比较：
 * - 转小写
 * - 移除所有空白字符
 * - 移除常见分隔符：- _ / . ,
 * 例："20 2S" → "202s"，"Admiral-2000S" → "admiral2000s"
 */
export function normalizeForSearch(str) {
  if (!isStringable(str)) return ''
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_/.,]/g, '')
}

/**
 * 装备搜索的统一字段集：计算器与参数对比页共用，保证两处搜索语义一致。
 * ratingAlias 是前端根据 rating 计算的中文别名（如“稀有级”），
 * 需要在数据加载时用 getRatingAlias 先补齐该字段。
 */
export const EQUIPMENT_SEARCH_FIELDS = Object.freeze([
  'model', 'equipmentName', 'category', 'subCategory', 'ratingAlias'
])

/**
 * 无搜索词时的默认排序：按 panelTension 升序（NaN 兜底 0）。
 * 计算器下拉与参数对比列表共用，保证两处默认展示顺序一致。
 * 强制 Number 转换避免对象型数值参与减法抛 Cannot convert object to primitive value。
 */
export function sortByPanelTension(list) {
  if (!Array.isArray(list)) return []
  return [...list].sort((a, b) => {
    const av = Number(a && a.panelTension)
    const bv = Number(b && b.panelTension)
    return (Number.isFinite(av) ? av : 0) - (Number.isFinite(bv) ? bv : 0)
  })
}

/**
 * 装备列表的搜索过滤 + 排序（支持去空格匹配）
 */
export function searchAndRankEquipment(data, query, nameFields = ['equipmentName', 'model']) {
  if (!Array.isArray(data)) return []
  if (!query || !query.trim()) return data
  const q = query.trim().toLowerCase()
  const qNorm = normalizeForSearch(q)
  const wordRegex = buildWordBoundaryRegex(q)

  const score = (item) => {
    if (!item || typeof item !== 'object') return -99
    for (const f of nameFields) {
      const raw = item[f]
      if (!isStringable(raw)) continue
      const vRaw = String(raw).toLowerCase()
      const vNorm = normalizeForSearch(raw)

      if (!vRaw && !vNorm) continue

      if (vRaw === q) return 3
      if (vRaw.startsWith(q)) return 2
      if (qNorm && vNorm === qNorm) return 1
      if (qNorm && vNorm.startsWith(qNorm)) return 0
      if (qNorm && vNorm.includes(qNorm)) return -1
      if (wordRegex.test(raw)) return -2
      if (vRaw.includes(q)) return -3
    }
    return -99
  }

  return data
    .map((item, index) => ({ item, score: score(item), index }))
    .filter(({ score: s }) => s > -99)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
}
