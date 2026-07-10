import {
  WEAR_COEFFICIENT,
  FRICTION_GUIDE_MAX,
  FRICTION_FORUM_MAX,
  CALC_RULES
} from '../constants/equipment.js'

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function formatTension(value) {
  return round(value, 2).toFixed(2)
}

export function calculateActualLockTension(equipment, calcRule) {
  const wear = equipment.wear || 0
  const lockTension = equipment.lockTension || equipment.maxTension || 0
  const type = equipment.equipmentType

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
  const wear = equipment.wear || 0
  const panelTension =
    equipment.panelTension || equipment.lockTension || equipment.maxTension || 0
  const type = equipment.equipmentType

  if (type === '鱼竿') {
    return round(panelTension * (1 - WEAR_COEFFICIENT * wear / 100))
  }
  if (type === '渔轮') {
    const wearRatio = wear / 100
    const frictionMax = calcRule === CALC_RULES.FORUM ? FRICTION_FORUM_MAX : FRICTION_GUIDE_MAX
    const frictionRatio = friction / frictionMax
    if (calcRule === CALC_RULES.FORUM) {
      return round((panelTension * (1 - wearRatio) / FRICTION_FORUM_MAX) * friction)
    }
    return round(panelTension * (1 - wearRatio) * frictionRatio)
  }
  return round(panelTension)
}

export function calculateCustomActualTension(item) {
  const wear = item.wear || 0
  return round(item.maxTension * (1 - wear / 100))
}

export function getFrictionMax(calcRule) {
  return calcRule === CALC_RULES.FORUM ? FRICTION_FORUM_MAX : FRICTION_GUIDE_MAX
}

export function clampFriction(value, calcRule) {
  if (value == null || Number.isNaN(value)) return 0
  const max = getFrictionMax(calcRule)
  return Math.max(0, Math.min(max, Math.round(value)))
}