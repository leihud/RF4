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

// 默认摩擦值
export const DEFAULT_FRICTION = 15

// readExcel.js 中通过汉字 charCode 区分鱼竿/渔轮
// 鱼 = 40060, 渔 = 28180
export const HANZI_CHARCODE = {
  ROD: 40060,
  REEL: 28180
}
