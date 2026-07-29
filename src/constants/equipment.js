// 装备类型常量
export const EQUIPMENT_TYPES = ['鱼竿', '渔轮', '主线', '引线']

// 自定义输入类型(不参与搜索下拉)
export const CUSTOM_INPUT_TYPES = ['主线', '引线']

// 可搜索下拉的类型
export const SEARCHABLE_TYPES = ['鱼竿', '渔轮']

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

// 摩擦值建议阈值
export const FRICTION_TIP_HIGH = 25
export const FRICTION_TIP_LOW = 5

// 默认摩擦值（宝典通用规则上限 = 29 / 论坛规则上限 = 30，取两者交集的最大值）
export const DEFAULT_FRICTION = 29

// readExcel.js 中通过汉字 charCode 区分鱼竿/渔轮
// 鱼 = 40060, 渔 = 28180
export const HANZI_CHARCODE = {
  ROD: 40060,
  REEL: 28180
}

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
  1:   '一星级',
  2:   '二星级',
  3:   '三星级',
  4:   '四星级',
  5:   '五星级',
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

/** Object.freeze + 双映射：同时命中字符串 key / Number(key) */
export const RATING_ALIAS = Object.freeze(
  Object.keys(RATING_ALIAS_RAW).reduce((acc, k) => {
    acc[k] = RATING_ALIAS_RAW[k]
    return acc
  }, {})
)

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
