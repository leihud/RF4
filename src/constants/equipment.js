// 装备类型常量
export const EQUIPMENT_TYPES = ['鱼竿', '渔轮', '主线', '引线', '鱼钩']

// 自定义输入类型(不参与搜索下拉)
export const CUSTOM_INPUT_TYPES = ['主线', '引线', '鱼钩']

// 可搜索下拉的类型
export const SEARCHABLE_TYPES = ['鱼竿', '渔轮']

// 线材材质选项
export const LINE_MATERIALS = Object.freeze([
  { value: '', label: '未选择' },
  { value: '氟碳线', label: '氟碳线' },
  { value: '编织线', label: '编织线' },
  { value: '尼龙线', label: '尼龙线' },
  { value: '钢', label: '钢' }
])

// 计算规则
export const CALC_RULES = {
  GUIDE: 'guide',
  FORUM: 'forum'
}

export const CALC_RULE_OPTIONS = [
  { value: CALC_RULES.GUIDE, label: '宝典通用规则' },
  { value: CALC_RULES.FORUM, label: '论坛计算规则' }
]

// 公式常量
// 磨损对鱼竿/渔轮的实际拉力影响系数(0.7)
export const WEAR_COEFFICIENT = 0.7

// 宝典通用规则下的摩擦值上限
export const FRICTION_GUIDE_MAX = 29

// 论坛规则下的摩擦值上限
export const FRICTION_FORUM_MAX = 30

// 默认摩擦值（宝典通用规则上限 = 29 / 论坛规则上限 = 30，取两者交集的最大值）
export const DEFAULT_FRICTION = 29

/**
 * 装备评级 rating → 中文别名映射。
 * 说明：
 *  - 当前 migrations 中 rods/reels 的 rating 字段多为空字符串（未维护），这里先给出一套
 *    覆盖常见取值的映射：支持数字 1~5 / 星级字符串 ⭐⭐⭐⭐⭐ / 或自定义字符串
 *    后续用户若在数据库里填入新的 rating 字符串，只需在下方 RATING_ALIAS 追加一对 key→value
 *  - 未命中任何映射、且 rawRating 非空（非 ''/null/undefined）：直接返回数据库原值兜底，
 *    避免以后填了新值前端显示空
 *  - rawRating 为空：返回 '常规'（不突出，不干扰大部分装备的默认展示）
 */
const RATING_ALIAS_RAW = {
  '1': '一星级',
  '2': '二星级',
  '3': '三星级',
  '4': '四星级',
  '5': '五星级',
  '⭐': '一星级',
  '⭐⭐': '二星级',
  '⭐⭐⭐': '三星级',
  '⭐⭐⭐⭐': '四星级',
  '⭐⭐⭐⭐⭐': '五星级',
  'C': '普通级',
  'B': '优良级',
  'A': '高级',
  'S': '稀有级',
  'SS': '传说级',
  'SSS': '神话级'
}

/** Object.freeze：JS 对象键始终为字符串，数字键 1-5 与字符串键 '1'-'5' 重复，已移除 */
export const RATING_ALIAS = Object.freeze(
  Object.keys(RATING_ALIAS_RAW).reduce((acc, k) => {
    acc[k] = RATING_ALIAS_RAW[k]
    return acc
  }, {})
)

/**
 * ── 鱼竿-渔轮兼容性规则 ──
 *
 * 手竿：无法装备任何渔轮
 * 博洛尼亚竿、竞赛竿、飞德竿、派克竿、鲤鱼竿、直柄路亚竿：仅支持纺车轮
 * 枪柄路亚竿：仅支持鼓轮、水滴轮
 * 其他鱼竿类型：不限制
 */

/** 无法装备任何渔轮的鱼竿分类 */
export const ROD_NO_REEL_CATEGORIES = Object.freeze(['手竿', '新年系列 手竿'])

/** 仅支持纺车轮的鱼竿分类 */
export const ROD_SPINNING_ONLY_CATEGORIES = Object.freeze([
  '博洛尼亚竿', '赛竿', '飞德竿', 'PICKER竿', '鲤鱼竿', '纺车竿',
  '新年系列 博洛尼亚', '新年系列 纺车竿', '新年系列 飞德竿'
])

/** 仅支持鼓轮/水滴轮的鱼竿分类 */
export const ROD_BAITCAST_ONLY_CATEGORIES = Object.freeze(['枪柄竿'])

/** 纺车式渔轮分类 */
export const SPINNING_REEL_CATEGORIES = Object.freeze(['纺车式', '新年系列 纺车式'])

/** 鼓轮/水滴轮渔轮分类 */
export const BAITCAST_REEL_CATEGORIES = Object.freeze(['鼓轮', '水滴轮', '动力鼓轮', '新年系列 鼓轮', '新年系列 动力鼓轮'])

/**
 * 根据鱼竿分类获取兼容的渔轮分类列表。
 * 返回 null 表示不限制（所有渔轮均可）；返回空数组表示无兼容渔轮。
 * @param {string|null} rodCategory 鱼竿的 category 字段
 * @returns {string[]|null}
 */
export function getCompatibleReelTypes(rodCategory) {
  if (!rodCategory) return null
  if (ROD_NO_REEL_CATEGORIES.includes(rodCategory)) return []
  if (ROD_SPINNING_ONLY_CATEGORIES.includes(rodCategory)) return [...SPINNING_REEL_CATEGORIES]
  if (ROD_BAITCAST_ONLY_CATEGORIES.includes(rodCategory)) return [...BAITCAST_REEL_CATEGORIES]
  return null
}

/**
 * 检查鱼竿与渔轮是否兼容。
 * @param {object|null} rod 鱼竿装备对象
 * @param {object|null} reel 渔轮装备对象
 * @returns {boolean}
 */
export function isRodReelCompatible(rod, reel) {
  if (!rod || !reel) return true
  const compatible = getCompatibleReelTypes(rod.category)
  if (compatible === null) return true
  return compatible.includes(reel.category)
}

/**
 * 把 rating 原始值（可能是数字 / 星级字符串 / 空）转成中文别名。
 * 保证不会返回 null/undefined；未命中映射时直接返回数据库原值（不再追加「级」后缀）。
 */
export function getRatingAlias(rawRating) {
  if (rawRating == null) return '常规'
  if (typeof rawRating === 'string') {
    const trim = rawRating.trim()
    if (!trim) return '常规'
    if (RATING_ALIAS[trim] != null) return RATING_ALIAS[trim]
    // 字符串数字 "3" → Number(trim) 作为 key 再查一次
    const asNum = Number(trim)
    if (Number.isFinite(asNum) && RATING_ALIAS[asNum] != null) return RATING_ALIAS[asNum]
    // 都没命中：直接展示数据库原值
    return trim
  }
  if (typeof rawRating === 'number') {
    if (!Number.isFinite(rawRating)) return '常规'
    if (RATING_ALIAS[rawRating] != null) return RATING_ALIAS[rawRating]
    return String(rawRating)
  }
  if (typeof rawRating === 'bigint' || typeof rawRating === 'boolean') {
    if (RATING_ALIAS[rawRating] != null) return RATING_ALIAS[rawRating]
    return String(rawRating)
  }
  return '常规'
}
