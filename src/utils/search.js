/**
 * 转义正则元字符
 */
export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 创建"以词边界、空白、下划线、连字符包裹"匹配的正则
 */
export function buildWordBoundaryRegex(query, flags = 'i') {
  const escaped = escapeRegExp(query)
  return new RegExp(`(?:^|\\s|_|-)${escaped}(?:$|\\s|_|-)`, flags)
}

/**
 * 装备列表的搜索过滤 + 排序
 * @param {Array} data 原始数据
 * @param {string} query 搜索词
 * @param {string[]} nameFields 用于匹配的字段名列表
 */
export function searchAndRankEquipment(data, query, nameFields = ['equipmentName', 'model']) {
  if (!query || !query.trim()) return data
  const q = query.trim().toLowerCase()
  const wordRegex = buildWordBoundaryRegex(q)

  const score = (item) => {
    for (const f of nameFields) {
      const v = (item[f] || '').toLowerCase()
      if (v === q) return 3
      if (v.startsWith(q)) return 2
      if (wordRegex.test(item[f] || '')) return 1
      if (v.includes(q)) return 0
    }
    return -1
  }

  return data
    .map((item, index) => ({ item, score: score(item), index }))
    .filter(({ score: s }) => s >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
}
