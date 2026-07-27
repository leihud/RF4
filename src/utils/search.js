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
 * 归一化字符串用于搜索比较：
 * - 转小写
 * - 移除所有空白字符
 * - 移除常见分隔符：- _ / . ,
 * 例："20 2S" → "202s"，"Admiral-2000S" → "admiral2000s"
 */
export function normalizeForSearch(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_/.,]/g, '')
}

/**
 * 装备列表的搜索过滤 + 排序（支持去空格匹配）
 * 匹配优先级（从高到低）：
 *   3 = 原始字段精确匹配
 *   2 = 原始字段前缀匹配
 *   1 = 归一化后精确匹配（如"202S" == "20 2S"去空格后）
 *   0 = 归一化后前缀匹配
 *  -1 = 归一化后子串包含匹配
 *  -2 = 原始字段子串包含匹配（保底）
 *  -99 = 不匹配
 * @param {Array} data 原始数据
 * @param {string} query 搜索词
 * @param {string[]} nameFields 用于匹配的字段名列表
 */
export function searchAndRankEquipment(data, query, nameFields = ['equipmentName', 'model']) {
  if (!query || !query.trim()) return data
  const q = query.trim().toLowerCase()
  const qNorm = normalizeForSearch(q)
  const wordRegex = buildWordBoundaryRegex(q)

  const score = (item) => {
    for (const f of nameFields) {
      const vRaw = (item[f] || '').toLowerCase()
      const vNorm = normalizeForSearch(item[f])

      if (!vRaw && !vNorm) continue

      // 3 分：原始精确
      if (vRaw === q) return 3
      // 2 分：原始前缀
      if (vRaw.startsWith(q)) return 2
      // 1 分：归一化精确（例："202s" == "20 2s" 归一化后）
      if (qNorm && vNorm === qNorm) return 1
      // 0 分：归一化前缀
      if (qNorm && vNorm.startsWith(qNorm)) return 0
      // -1 分：归一化子串包含
      if (qNorm && vNorm.includes(qNorm)) return -1
      // -2 分：词边界
      if (wordRegex.test(item[f] || '')) return -2
      // -3 分：原始子串（保底）
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
