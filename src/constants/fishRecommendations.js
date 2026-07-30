/**
 * 鱼种/场景推荐配置。
 * 根据目标鱼种和钓法，推荐装备参数范围。
 * 数据来源：RF4 游戏经验总结，后续可根据实际数据调整。
 */

/**
 * 鱼种推荐参数。
 * @typedef {object} FishRecommendation
 * @property {string} name 鱼种名称
 * @property {string} difficulty 难度等级
 * @property {number} minTension 推荐最小拉力(kN)
 * @property {number} maxTension 推荐最大拉力(kN)
 * @property {string[]} rodCategories 推荐鱼竿分类
 * @property {string[]} reelCategories 推荐渔轮分类
 * @property {string} tips 钓法提示
 */

/** @type {FishRecommendation[]} */
export const FISH_RECOMMENDATIONS = Object.freeze([
  {
    name: '鲫鱼',
    difficulty: '入门',
    minTension: 1.5,
    maxTension: 4,
    rodCategories: ['手竿', '博洛尼亚竿'],
    reelCategories: ['纺车式'],
    tips: '使用细线小钩，浮标钓法。手竿或轻型博洛尼亚竿即可。'
  },
  {
    name: '鲤鱼',
    difficulty: '初级',
    minTension: 4,
    maxTension: 12,
    rodCategories: ['鲤鱼竿', '博洛尼亚竿', '飞德竿'],
    reelCategories: ['纺车式'],
    tips: '底钓为主，需要较强的控鱼能力。鲤鱼竿专用性最强。'
  },
  {
    name: '草鱼',
    difficulty: '中级',
    minTension: 6,
    maxTension: 15,
    rodCategories: ['鲤鱼竿', '博洛尼亚竿'],
    reelCategories: ['纺车式'],
    tips: '力量较大，建议使用中重型装备，注意控线。'
  },
  {
    name: '鲟鱼',
    difficulty: '高级',
    minTension: 15,
    maxTension: 40,
    rodCategories: ['鲤鱼竿', '枪柄竿'],
    reelCategories: ['鼓轮', '动力鼓轮', '纺车式'],
    tips: '需要重型装备，建议使用鼓轮或动力鼓轮配合强力鱼竿。'
  },
  {
    name: '狗鱼',
    difficulty: '中级',
    minTension: 5,
    maxTension: 15,
    rodCategories: ['纺车竿', '枪柄竿'],
    reelCategories: ['纺车式', '鼓轮', '水滴轮'],
    tips: '路亚钓法，需要快速收线能力。纺车竿或枪柄竿均可。'
  },
  {
    name: '鲈鱼',
    difficulty: '中级',
    minTension: 4,
    maxTension: 12,
    rodCategories: ['纺车竿', '枪柄竿'],
    reelCategories: ['纺车式', '水滴轮'],
    tips: '路亚钓法为主，建议使用中轻型路亚装备。'
  },
  {
    name: '鳊鱼',
    difficulty: '初级',
    minTension: 3,
    maxTension: 8,
    rodCategories: ['博洛尼亚竿', '飞德竿', '手竿'],
    reelCategories: ['纺车式'],
    tips: '浮标或底钓均可，中等拉力装备即可应对。'
  },
  {
    name: '丁鱥',
    difficulty: '初级',
    minTension: 3,
    maxTension: 10,
    rodCategories: ['博洛尼亚竿', '飞德竿', 'PICKER竿'],
    reelCategories: ['纺车式'],
    tips: '底钓为主，飞德竿或PICKER竿效果最佳。'
  },
  {
    name: '哲罗鱼',
    difficulty: '高级',
    minTension: 10,
    maxTension: 30,
    rodCategories: ['枪柄竿', '纺车竿'],
    reelCategories: ['鼓轮', '水滴轮', '纺车式'],
    tips: '大型掠食鱼，需要重型路亚装备，建议使用鼓轮。'
  },
  {
    name: '鱼',
    difficulty: '高级',
    minTension: 8,
    maxTension: 25,
    rodCategories: ['纺车竿', '枪柄竿'],
    reelCategories: ['纺车式', '鼓轮'],
    tips: '洄游鱼种，力量强劲，需要中高拉力装备。'
  }
])

/**
 * 根据鱼种名称查找推荐配置。
 * @param {string} fishName 鱼种名称
 * @returns {FishRecommendation|null}
 */
export function findFishRecommendation(fishName) {
  if (!fishName) return null
  const normalized = fishName.trim()
  return FISH_RECOMMENDATIONS.find(f => f.name === normalized) || null
}

/**
 * 根据鱼种推荐，筛选兼容的装备。
 * @param {FishRecommendation} rec 推荐配置
 * @param {Array} equipmentData 装备数据列表
 * @param {string} equipmentType '鱼竿' | '渔轮'
 * @returns {Array} 兼容的装备列表
 */
export function filterEquipmentByRecommendation(rec, equipmentData, equipmentType) {
  if (!rec || !Array.isArray(equipmentData)) return []
  const categories = equipmentType === '鱼竿' ? rec.rodCategories : rec.reelCategories
  return equipmentData.filter(item =>
    item.equipmentType === equipmentType && categories.includes(item.category)
  )
}
