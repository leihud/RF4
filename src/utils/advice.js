import {
  calculateActualLockTension,
  calculateActualPanelTension,
  calculateCustomActualTension
} from './tension.js'
import { FRICTION_TIP_HIGH, FRICTION_TIP_LOW, CALC_RULES } from '../constants/equipment.js'

// 建议等级
export const ADVICE_LEVEL = {
  OPTIMAL: 'optimal',   // ✅
  WARNING: 'warning',   // ⚠️
  DANGER: 'danger'      // ❌
}

const LEVEL_PREFIX = {
  [ADVICE_LEVEL.OPTIMAL]: '✅',
  [ADVICE_LEVEL.WARNING]: '⚠️',
  [ADVICE_LEVEL.DANGER]: '❌'
}

/**
 * 汇总各项实际拉力,作为建议生成的输入
 * tension utils 返回字符串,此处统一 parseFloat
 */
export function buildTensionContext({
  rod,
  reel,
  mainLine,
  leader,
  friction,
  calcRule
}) {
  const rodTension = rod ? parseFloat(calculateActualPanelTension(rod, calcRule, friction)) : 0
  const reelLockTension = reel ? parseFloat(calculateActualLockTension(reel, calcRule)) : 0
  const reelPanelTension = reel ? parseFloat(calculateActualPanelTension(reel, calcRule, friction)) : 0
  const mainLineTension = mainLine.maxTension > 0 ? parseFloat(calculateCustomActualTension(mainLine)) : 0
  const leaderTension = leader.maxTension > 0 ? parseFloat(calculateCustomActualTension(leader)) : 0
  return {
    rodTension,
    reelLockTension,
    reelPanelTension,
    mainLineTension,
    leaderTension,
    friction
  }
}

function hasRodReelAndMain(ctx) {
  return ctx.rodTension > 0 && ctx.reelPanelTension > 0 && ctx.mainLineTension > 0
}

// 生成单条建议(常态:看 panel)
function buildNormalAdvice(ctx) {
  const { rodTension, reelPanelTension, mainLineTension, leaderTension } = ctx

  if (rodTension <= 0) return { level: ADVICE_LEVEL.WARNING, text: '请配置鱼竿来完成装备搭配。' }
  if (ctx.reelPanelTension <= 0) return { level: ADVICE_LEVEL.WARNING, text: '请配置渔轮来完成装备搭配。' }
  if (mainLineTension <= 0) return { level: ADVICE_LEVEL.WARNING, text: '请配置主线来完成装备搭配。' }

  const hasLeader = leaderTension > 0

  if (hasLeader) {
    if (leaderTension > rodTension) {
      return { level: ADVICE_LEVEL.DANGER, text: '致命危险!引线拉力超过鱼竿极限,中大鱼直接爆竿,建议大幅降低引线拉力。' }
    }
    if (reelPanelTension <= leaderTension && reelPanelTension <= mainLineTension && reelPanelTension <= rodTension) {
      return { level: ADVICE_LEVEL.DANGER, text: '高危!渔轮实际面板拉力为最小,大鱼猛冲会过载磨损渔轮,建议调整摩擦值或增大渔轮拉力。' }
    }
    if (mainLineTension === leaderTension) {
      return { level: ADVICE_LEVEL.WARNING, text: '主线与引线拉力相等,过载可能同时断裂,建议降低引线或增大主线拉力。' }
    }
    if (leaderTension <= mainLineTension && leaderTension <= reelPanelTension && leaderTension <= rodTension) {
      return { level: ADVICE_LEVEL.OPTIMAL, text: '常态搭配合理,过载优先拉断低成本引线,保护主线、渔轮、鱼竿。' }
    }
    if (mainLineTension <= leaderTension && mainLineTension <= reelPanelTension && mainLineTension <= rodTension) {
      return { level: ADVICE_LEVEL.OPTIMAL, text: '常态搭配合理,过载优先拉断主线,保护渔轮、鱼竿;建议搭配低拉力引线降低损耗成本。' }
    }
    return null
  }

  if (reelPanelTension <= mainLineTension && reelPanelTension <= rodTension) {
    return { level: ADVICE_LEVEL.DANGER, text: '高危!渔轮实际面板拉力为最小,会过载磨损渔轮,建议调整摩擦值或增大渔轮拉力。' }
  }
  if (mainLineTension <= reelPanelTension && mainLineTension <= rodTension) {
    return { level: ADVICE_LEVEL.OPTIMAL, text: '常态搭配合理,过载优先拉断主线,保护渔轮、鱼竿;建议搭配低拉力引线降低损耗。' }
  }
  return { level: ADVICE_LEVEL.DANGER, text: '致命危险!鱼竿拉力为最小,中大鱼直接爆竿,请调整配置。' }
}

// 生成单条建议(锁轮:看 lock)
function buildLockAdvice(ctx) {
  const { rodTension, reelLockTension, mainLineTension, leaderTension } = ctx

  if (rodTension <= 0) return null
  if (ctx.reelLockTension <= 0) return null
  if (mainLineTension <= 0) return null

  const hasLeader = leaderTension > 0

  if (hasLeader) {
    if (leaderTension > rodTension) {
      return { level: ADVICE_LEVEL.DANGER, text: '致命危险!引线拉力超过鱼竿极限,中大鱼直接爆竿,建议大幅降低引线拉力。' }
    }
    if (reelLockTension <= leaderTension && reelLockTension <= mainLineTension && reelLockTension <= rodTension) {
      return { level: ADVICE_LEVEL.DANGER, text: '高危!渔轮实际锁轮拉力为最小,大鱼猛冲会过载磨损渔轮,建议增大渔轮锁轮拉力或更换拉力更小的引线。' }
    }
    if (mainLineTension === leaderTension) {
      return { level: ADVICE_LEVEL.WARNING, text: '主线与引线拉力相等,过载可能同时断裂,建议降低引线或增大主线拉力。' }
    }
    if (leaderTension <= mainLineTension && leaderTension <= reelLockTension && leaderTension <= rodTension) {
      return { level: ADVICE_LEVEL.OPTIMAL, text: '锁轮搭配合理,过载优先拉断低成本引线,保护主线、渔轮、鱼竿。' }
    }
    if (mainLineTension <= leaderTension && mainLineTension <= reelLockTension && mainLineTension <= rodTension) {
      return { level: ADVICE_LEVEL.OPTIMAL, text: '锁轮搭配合理,过载优先拉断主线,保护渔轮、鱼竿;建议搭配低拉力引线降低损耗成本。' }
    }
    return null
  }

  if (reelLockTension <= mainLineTension && reelLockTension <= rodTension) {
    return { level: ADVICE_LEVEL.DANGER, text: '高危!渔轮实际锁轮拉力为最小,会过载磨损渔轮,建议增大渔轮锁轮拉力或增加引线。' }
  }
  if (mainLineTension <= reelLockTension && mainLineTension <= rodTension) {
    return { level: ADVICE_LEVEL.OPTIMAL, text: '锁轮搭配合理,过载优先拉断主线,保护渔轮、鱼竿;建议搭配低拉力引线降低损耗。' }
  }
  return { level: ADVICE_LEVEL.DANGER, text: '致命危险!鱼竿拉力为最小,中大鱼直接爆竿,请调整配置。' }
}

function buildFrictionTip(ctx) {
  if (ctx.reelPanelTension <= 0 || ctx.mainLineTension <= 0) return null
  const f = ctx.friction || 0
  if (f > FRICTION_TIP_HIGH) {
    return { level: ADVICE_LEVEL.WARNING, text: `摩擦值建议:当前摩擦值(${f})较高,建议适当降低以保护渔轮内部结构。` }
  }
  if (f < FRICTION_TIP_LOW) {
    return { level: ADVICE_LEVEL.WARNING, text: `摩擦值建议:当前摩擦值(${f})较低,可适当提高以获得更好的控鱼效果。` }
  }
  return null
}

/**
 * 汇总所有建议
 * @returns {{ level: string, sections: Array<{ title: string, items: Array<{level,text}> }> } | null}
 */
export function buildAdvice(input) {
  const ctx = buildTensionContext(input)
  const nothingConfigured =
    ctx.rodTension === 0 &&
    ctx.reelPanelTension === 0 &&
    ctx.mainLineTension === 0 &&
    ctx.leaderTension === 0
  if (nothingConfigured) return null

  const sections = []
  const normal = buildNormalAdvice(ctx)
  if (normal) sections.push({ title: '常态建议', items: [normal] })

  const lock = buildLockAdvice(ctx)
  if (lock && ctx.reelLockTension !== ctx.reelPanelTension) {
    sections.push({ title: '锁轮建议', items: [lock] })
  }

  const frictionTip = buildFrictionTip(ctx)
  if (frictionTip) {
    sections.push({ title: '摩擦值', items: [frictionTip] })
  }

  if (sections.length === 0) {
    return {
      level: ADVICE_LEVEL.WARNING,
      sections: [{ title: '提示', items: [{ level: ADVICE_LEVEL.WARNING, text: '请检查装备配置。' }] }]
    }
  }

  // 汇总最高严重等级
  const allLevels = sections.flatMap(s => s.items.map(i => i.level))
  let overall = ADVICE_LEVEL.OPTIMAL
  if (allLevels.includes(ADVICE_LEVEL.DANGER)) overall = ADVICE_LEVEL.DANGER
  else if (allLevels.includes(ADVICE_LEVEL.WARNING)) overall = ADVICE_LEVEL.WARNING

  return { level: overall, sections }
}

// 暴露给模板用,避免 magic string
export const ADVICE_PREFIX = LEVEL_PREFIX
