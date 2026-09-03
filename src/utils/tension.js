import {
  WEAR_COEFFICIENT,
  FRICTION_GUIDE_MAX,
  FRICTION_FORUM_MAX,
  CALC_RULES
} from '../constants/equipment.js'

/**
 * 安全转数值：对象/数组/NaN/非数值字符串一律兜底为 0
 * 防止 "Cannot convert object to primitive value" 等隐式转换异常
 */
export function toSafeNumber(v, fallback = 0) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
  if (v == null) return fallback
  // 跳过对象类型（包括数组、Date），避免 valueOf/toString 抛出隐式转换异常
  if (typeof v === 'object') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function round(value, digits = 2) {
  const safeValue = toSafeNumber(value, 0)
  const factor = 10 ** digits
  return Math.round(safeValue * factor) / factor
}

export function formatTension(value) {
  return round(value, 2).toFixed(2)
}

export function calculateActualLockTension(equipment, calcRule) {
  const wear = toSafeNumber(equipment && equipment.wear, 0)
  const lockTension = toSafeNumber(
    (equipment && equipment.lockTension) != null ? equipment.lockTension : (equipment && equipment.maxTension),
    0
  )
  const type = equipment && equipment.equipmentType

  if (type === '鱼竿') {
    return round(lockTension * (1 - WEAR_COEFFICIENT * wear / 100))
  }
  if (type === '渔轮') {
    if (calcRule === CALC_RULES.FORUM) {
      return round(lockTension * 0.3 + lockTension * 0.7 * (1 - wear / 100))
    }
    return round(lockTension * (1 - WEAR_COEFFICIENT * wear / 100))
  }
  return round(lockTension * (1 - wear / 100))
}

export function calculateActualPanelTension(equipment, calcRule, friction = 0) {
  const wear = toSafeNumber(equipment && equipment.wear, 0)
  const panelTension = toSafeNumber(
    (equipment && equipment.panelTension) != null
      ? equipment.panelTension
      : (equipment && equipment.lockTension) != null
        ? equipment.lockTension
        : (equipment && equipment.maxTension),
    0
  )
  const type = equipment && equipment.equipmentType
  const frictionSafe = toSafeNumber(friction, 0)

  if (type === '鱼竿') {
    return round(panelTension * (1 - WEAR_COEFFICIENT * wear / 100))
  }
  if (type === '渔轮') {
    const wearRatio = toSafeNumber(wear / 100, 0)
    const frictionMax = calcRule === CALC_RULES.FORUM ? FRICTION_FORUM_MAX : FRICTION_GUIDE_MAX
    const frictionRatio = frictionMax > 0 ? frictionSafe / frictionMax : 0
    if (calcRule === CALC_RULES.FORUM) {
      return round((panelTension * (1 - wearRatio) / FRICTION_FORUM_MAX) * frictionSafe)
    }
    return round(panelTension * (1 - wearRatio) * frictionRatio)
  }
  return round(panelTension)
}

export function calculateCustomActualTension(item) {
  const wear = toSafeNumber(item && item.wear, 0)
  const maxTension = toSafeNumber(item && item.maxTension, 0)
  return round(maxTension * (1 - wear / 100))
}

export function getFrictionMax(calcRule) {
  return calcRule === CALC_RULES.FORUM ? FRICTION_FORUM_MAX : FRICTION_GUIDE_MAX
}

export function clampFriction(value, calcRule) {
  const safeValue = toSafeNumber(value, 0)
  const max = toSafeNumber(getFrictionMax(calcRule), 0)
  return Math.max(0, Math.min(max, Math.round(safeValue)))
}

/**
 * 最小拉力信息工厂函数：在「锁轮下」与「常规下」两套对比中复用。
 *
 * 对比范围：鱼竿 / 渔轮 / 主线 / 引线 四个部位
 *  - 鱼竿/渔轮：取传入的 actualTensionMap[部位]（actualLockTensionMap 或 actualPanelTensionMap）
 *  - 主线/引线：用 calculateCustomActualTension(item)（customEquipment 里的录入）
 *  - value <= 0 的项（未选择/未录入/异常值）跳过不参与
 *
 * 输出：
 *  - null：没有任何有效拉力项
 *  - { type, label, value, valueText }：值最小的那一项，valueText 格式为 "X.XX kN"
 */
export function buildMinTensionInfo(
  selectedEquipmentMap,
  actualTensionMap,
  customEquipment,
  calculateCustomActualTension,
  safeToNumber,
  formatTension
) {
  const candidates = []
  const pushCandidate = (type, label, rawValue) => {
    const v = safeToNumber(rawValue)
    if (v > 0) candidates.push({ type, label, value: v })
  }

  const hasEqMap = selectedEquipmentMap && typeof selectedEquipmentMap === 'object'
  const hasActualMap = actualTensionMap && typeof actualTensionMap === 'object'
  if (hasEqMap && hasActualMap) {
    if (selectedEquipmentMap['鱼竿']) pushCandidate('鱼竿', '鱼竿', actualTensionMap['鱼竿'])
    if (selectedEquipmentMap['渔轮']) pushCandidate('渔轮', '渔轮', actualTensionMap['渔轮'])
  }

  const hasCustom = customEquipment && typeof customEquipment === 'object'
  if (hasCustom && typeof calculateCustomActualTension === 'function') {
    const mainLine = customEquipment['主线']
    if (mainLine && safeToNumber(mainLine.maxTension) > 0) {
      pushCandidate('主线', '主线', calculateCustomActualTension(mainLine))
    }
    const leader = customEquipment['引线']
    if (leader && safeToNumber(leader.maxTension) > 0) {
      pushCandidate('引线', '引线', calculateCustomActualTension(leader))
    }
  }

  if (!candidates.length) return null
  const min = candidates.reduce((a, b) => (b.value < a.value ? b : a))
  return { ...min, valueText: `${formatTension(min.value)} kN` }
}