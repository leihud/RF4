/**
 * GameKee 图鉴数据解析与清洗整合模块（纯函数，Node/测试共用）。
 *
 * 职责：
 *  1. 目录树递归展开（任意深度），叶子=无子节点，输出 {entryId, name, section, path}
 *  2. character-profile JSON → 清洗整合后的装备对象（名称/描述/属性键值对）
 *  3. 属性字段名归一：不同叫法同一数值 → 统一键名（别名表）
 *  4. 数值清洗："3/10"→3、">=6.5"→6.5、"35-160"→原样文本+null 数值、"-"/空→空串
 *  5. 竿/轮属性 → rods/reels 现有列映射（补齐用）；未映射属性保留在 extraAttrs
 */

/** 简单编辑器节点 → 纯文本（递归收集所有 text run） */
export function editorToText(node) {
  const out = []
  const walk = (e) => {
    if (e == null || typeof e !== 'object') return
    if (typeof e.text === 'string') out.push(e.text)
    for (const v of Object.values(e)) {
      if (v != null && typeof v === 'object') walk(v)
    }
  }
  walk(node)
  return cleanText(out.join(''))
}

/** 文本清洗：去 BOM/零宽字符、压缩空白、破折号占位归空 */
export function cleanText(s) {
  return String(s == null ? '' : s)
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-—－–]\s*$/, '')
}

/**
 * 从 content_json（字符串或对象）中找到 character-profile 节点。
 * 条目可能是富文本文章（无 profile）→ 返回 null。
 */
export function extractProfile(contentJson) {
  let root = contentJson
  if (typeof root === 'string') {
    const s = cleanText(root) === '' ? '' : root.replace(/^\uFEFF/, '').trim()
    if (!s) return null
    try { root = JSON.parse(s) } catch { return null }
  }
  const found = (function find(n) {
    if (!n || typeof n !== 'object') return null
    if (Array.isArray(n)) {
      for (const c of n) { const r = find(c); if (r) return r }
      return null
    }
    if (n.type === 'character-profile') return n
    for (const v of Object.values(n)) { const r = find(v); if (r) return r }
    return null
  })(root)
  return found && found.data ? found.data : null
}

/**
 * 数值清洗："3/10"→3（取分子）、"≥6.5"/">=6.5"→6.5、"6.2:1"→6.2、"470"→470、
 * "35-160"→null（区间留文本）、"-"/""→null
 */
export function cleanNumber(text) {
  const s = cleanText(text)
  if (!s || s === '-') return null
  const ratio = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*\d+$/) // 3/10 评分
  if (ratio) return Number(ratio[1])
  const ge = s.match(/^(?:[≥>]+\s*=?\s*|>=\s*)(\d+(?:\.\d+)?)/) // ≥6.5 / >=6.5 必须带前缀
  if (ge) {
    const n = Number(ge[1])
    return Number.isFinite(n) ? n : null
  }
  const colon = s.match(/^(\d+(?:\.\d+)?)\s*:\s*\d+/) // 6.2:1 传动比
  if (colon) {
    const n = Number(colon[1])
    return Number.isFinite(n) ? n : null
  }
  const plain = s.match(/^(\d+(?:\.\d+)?)$/)
  if (plain) {
    const n = Number(plain[1])
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * 属性字段名归一表：原始字段名（清洗后）→ 标准键。
 * 同一数值不同叫法在这里收敛；未命中的保留原名（去首尾空白）。
 */
export const ATTR_KEY_ALIASES = Object.freeze({
  // 通用
  '形式': '形式',
  '大小': '大小',
  '测试': '测试',
  '测试(克)': '测试',
  '测试克重': '测试',
  '等级要求': '等级要求',
  '银币': '银币',
  '金币': '金币',
  '评级': '评级',
  '防海水': '防海水',
  '适配重': '适配重',
  '适配重(克)': '适配重',
  '适配重量': '适配重',
  // 渔轮
  '传动比': '传动比',
  '传动比(星)': '传动比星',
  '摩擦制动力': '摩擦制动力',
  '摩擦制动': '摩擦制动力',
  '摩擦力': '摩擦制动力',
  '锁轮拉力': '锁轮拉力',
  '线速': '线速',
  '线速(星)': '线速星',
  '线杯容量': '线杯容量',
  '获取方式': '获取方式',
  '引擎功率': '引擎功率',
  '回收速度': '线速',
  // 鱼竿
  '灵敏度': '灵敏度',
  '结构': '结构',
  '硬度': '硬度',
  '能力': '能力',
  '长度': '长度',
  '长度(米)': '长度',
  '强度': '强度',
  '强度(公斤)': '强度',
  '质量': '质量',
  '质量(克)': '质量',
  '重量': '质量'
})

/** 归一属性键名 */
export function normalizeAttrKey(rawTitle) {
  const t = cleanText(rawTitle)
  return ATTR_KEY_ALIASES[t] || t
}

/**
 * character-profile → 装备对象：
 * { name, descTitle, description, attrs: [{key, raw, value, num}], attrsMap }
 */
export function parseProfile(profile) {
  if (!profile) return null
  const name = editorToText(profile.name)
  const descTitle = editorToText(profile.descTitle)
  const description = editorToText(profile.desc)
  const attrs = []
  const attrsMap = {}
  for (const a of profile.attrList || []) {
    const raw = cleanText(editorToText(a.title))
    if (!raw) continue
    const key = normalizeAttrKey(raw)
    const value = editorToText(a.content)
    const item = { key, raw, value, num: cleanNumber(value) }
    // 同键重复：保留非空值，其余丢弃
    const prev = attrsMap[key]
    if (prev == null || (prev.value === '' && value !== '')) {
      const idx = attrs.findIndex((x) => x.key === key)
      if (idx >= 0) attrs[idx] = item
      else attrs.push(item)
      attrsMap[key] = item
    }
  }
  return { name, descTitle, description, attrs, attrsMap }
}

/** 目录树递归展开：叶子=无 child/child 为空；返回 [{entryId, name, section, path}] */
export function flattenTree(entryList, sectionFilter = null) {
  const out = []
  const walk = (node, section, path) => {
    if (!node || node.id == null) return
    const name = cleanText(node.name)
    const nextPath = path ? `${path}→${name}` : name
    const children = Array.isArray(node.child) ? node.child.filter(Boolean) : []
    if (children.length === 0) {
      if (!name) return // 空名占位节点跳过
      if (!sectionFilter || sectionFilter.includes(section)) {
        out.push({ entryId: node.id, name, section, path: nextPath })
      }
    } else {
      for (const c of children) walk(c, section, nextPath)
    }
  }
  for (const top of entryList || []) {
    const sec = cleanText(top.name)
    walk(top, sec, '')
  }
  return out
}

/**
 * 属性 → rods 表现有列映射（补齐用）。返回 {column: value}，只含有映射且值非空的。
 * 目录路径提供 category（如 渔竿图鉴→SPOD→SPOD竿 中的「SPOD竿」父级名）。
 */
export const ROD_ATTR_COLUMNS = Object.freeze({
  '测试': 'testG',
  '灵敏度': 'sensitivity',
  '硬度': 'hardness',
  '结构': 'structure',
  '能力': 'ability',
  '评级': 'rating',
  '质量': 'weightG',
  '适配重': 'adaptWeight',
  '等级要求': 'levelReq',
  '长度': 'lengthM',
  '强度': 'strengthKg',
  '银币': 'silverPrice',
  '金币': 'goldPrice'
})

/** 属性 → reels 表现有列映射 */
export const REEL_ATTR_COLUMNS = Object.freeze({
  '大小': 'size',
  '形式': 'form',
  '测试': 'test',
  '传动比': 'transmissionRatio',
  '传动比星': 'transmissionRatioStar',
  '摩擦制动力': 'frictionForce',
  '锁轮拉力': 'lockTension',
  '线速': 'lineSpeed',
  '线速星': 'lineSpeedStar',
  '线杯容量': 'spoolCapacity',
  '获取方式': 'obtainMethod',
  '等级要求': 'levelReq',
  '适配重': 'adaptWeight',
  '防海水': 'saltwaterResistant',
  '评级': 'rating',
  '银币': 'silverPrice',
  '金币': 'goldPrice'
})

/**
 * 把解析后的属性按映射表转成列值对象。
 * @param {object} parsed parseProfile 的结果
 * @param {object} columnMap ROD_ATTR_COLUMNS / REEL_ATTR_COLUMNS
 * @returns {{columns: object, extraAttrs: object}} columns=可直落列；extraAttrs=未映射属性（键→值）
 */
export function mapAttrsToColumns(parsed, columnMap) {
  const columns = {}
  const extraAttrs = {}
  for (const a of parsed.attrs) {
    const col = columnMap[a.key]
    const val = a.value === '' ? null : (a.num != null ? a.num : a.value)
    if (col && val != null && val !== '') columns[col] = val
    else if (!col && val != null && val !== '') extraAttrs[a.key] = a.value
  }
  return { columns, extraAttrs }
}
