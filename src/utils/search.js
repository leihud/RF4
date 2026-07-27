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
