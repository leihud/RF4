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
function toSafeNumber(v, fallback = 0) {
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