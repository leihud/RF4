import {
  WEAR_COEFFICIENT,
  FRICTION_GUIDE_MAX,
  FRICTION_FORUM_MAX,
  CALC_RULES
} from '../constants/equipment.js'

/**
 * 将数字四舍五入到指定小数位,返回数字
 */
function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * 统一格式化:返回 2 位小数字符串(便于模板直接展示)
 */
function fmt(value) {
  return round(value, 2).toFixed(2)
}

/**
 * 计算实际锁轮拉力(返回字符串,如 "12.00")
 */
export function calculateActualLockTension(equipment, calcRule) {
  const wear = equipment.wear || 0
  const lockTension = equipment.lockTension || equipment.maxTension || 0
  const type = equipment.equipmentType

  if (type === '鱼竿') {
    return fmt(lockTension * (1 - WEAR_COEFFICIENT * wear / 100))
  }
  if (type === '渔轮') {
    if (calcRule === CALC_RULES.FORUM) {
      return fmt(lockTension * 0.3 + lockTension * 0.7 * (1 - wear / 100))
    }
    return fmt(lockTension * (1 - WEAR_COEFFICIENT * wear / 100))
  }
  return fmt(lockTension * (1 - wear / 100))
}

/**
 * 计算实际面板拉力(返回字符串)
 */
export function calculateActualPanelTension(equipment, calcRule, friction = 0) {
  const wear = equipment.wear || 0
  const panelTension =
    equipment.panelTension || equipment.lockTension || equipment.maxTension || 0
  const type = equipment.equipmentType

  if (type === '鱼竿') {
    return fmt(panelTension * (1 - WEAR_COEFFICIENT * wear / 100))
  }
  if (type === '渔轮') {
    const wearRatio = wear / 100
    if (calcRule === CALC_RULES.FORUM) {
      return fmt((panelTension * (1 - wearRatio) / FRICTION_FORUM_MAX) * friction)
    }
    const frictionRatio = friction / FRICTION_GUIDE_MAX
    return fmt(panelTension * (1 - wearRatio) * frictionRatio)
  }
  return fmt(panelTension)
}

/**
 * 主线/引线的自定义实际拉力(返回字符串)
 */
export function calculateCustomActualTension(item) {
  const wear = item.wear || 0
  return fmt(item.maxTension * (1 - wear / 100))
}

/**
 * 将摩擦值夹到合法范围
 */
export function clampFriction(value) {
  if (value == null || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(FRICTION_GUIDE_MAX, Math.round(value)))
}
