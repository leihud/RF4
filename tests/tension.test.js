import { describe, it, expect } from 'vitest'
import {
  formatTension,
  calculateActualLockTension,
  calculateActualPanelTension,
  calculateCustomActualTension,
  getFrictionMax,
  clampFriction,
  buildMinTensionInfo
} from '../src/utils/tension.js'
import { CALC_RULES, WEAR_COEFFICIENT, FRICTION_GUIDE_MAX, FRICTION_FORUM_MAX } from '../src/constants/equipment.js'
import { safeToNumber } from '../src/utils/sanitize.js'

describe('formatTension', () => {
  it('保留两位小数', () => {
    expect(formatTension(1.005)).toBe('1.00')
    expect(formatTension(13)).toBe('13.00')
    expect(formatTension(2.345)).toBe('2.35')
  })

  it('非法输入兜底 0.00', () => {
    expect(formatTension(null)).toBe('0.00')
    expect(formatTension({})).toBe('0.00')
    expect(formatTension('abc')).toBe('0.00')
  })
})

describe('calculateActualLockTension', () => {
  it('鱼竿：锁轮拉力 × (1 - 0.7 × 磨损%)', () => {
    const rod = { equipmentType: '鱼竿', lockTension: 100, wear: 50 }
    expect(calculateActualLockTension(rod, CALC_RULES.GUIDE)).toBe(100 * (1 - WEAR_COEFFICIENT * 0.5))
  })

  it('渔轮宝典规则：与鱼竿同公式', () => {
    const reel = { equipmentType: '渔轮', lockTension: 60, wear: 10 }
    // 60 × (1 - 0.7 × 0.1) = 55.8（函数内部四舍五入到 2 位小数，避开浮点误差）
    expect(calculateActualLockTension(reel, CALC_RULES.GUIDE)).toBe(55.8)
  })

  it('渔轮论坛规则：0.3 保底 + 0.7 按磨损衰减', () => {
    const reel = { equipmentType: '渔轮', lockTension: 60, wear: 100 }
    expect(calculateActualLockTension(reel, CALC_RULES.FORUM)).toBe(18) // 60*0.3 + 60*0.7*0
  })

  it('lockTension 缺失时回退 maxTension', () => {
    const rod = { equipmentType: '鱼竿', maxTension: 10, wear: 0 }
    expect(calculateActualLockTension(rod, CALC_RULES.GUIDE)).toBe(10)
  })

  it('其他类型按 (1 - 磨损%) 衰减', () => {
    const line = { equipmentType: '主线', lockTension: 20, wear: 25 }
    expect(calculateActualLockTension(line, CALC_RULES.GUIDE)).toBe(15)
  })

  it('对象型字段兜底 0 不抛异常', () => {
    const bad = { equipmentType: '鱼竿', lockTension: {}, wear: [] }
    expect(calculateActualLockTension(bad, CALC_RULES.GUIDE)).toBe(0)
  })
})

describe('calculateActualPanelTension', () => {
  it('鱼竿：面板拉力 × (1 - 0.7 × 磨损%)，不受摩擦影响', () => {
    const rod = { equipmentType: '鱼竿', panelTension: 20, wear: 10 }
    expect(calculateActualPanelTension(rod, CALC_RULES.GUIDE, 15)).toBe(20 * (1 - WEAR_COEFFICIENT * 0.1))
  })

  it('渔轮宝典规则：按摩擦值/29 比例', () => {
    const reel = { equipmentType: '渔轮', panelTension: 29, wear: 0 }
    expect(calculateActualPanelTension(reel, CALC_RULES.GUIDE, 29)).toBe(29)
    expect(calculateActualPanelTension(reel, CALC_RULES.GUIDE, 14.5)).toBe(14.5)
  })

  it('渔轮论坛规则：按摩擦值/30 比例', () => {
    const reel = { equipmentType: '渔轮', panelTension: 30, wear: 0 }
    expect(calculateActualPanelTension(reel, CALC_RULES.FORUM, 30)).toBe(30)
    expect(calculateActualPanelTension(reel, CALC_RULES.FORUM, 15)).toBe(15)
  })

  it('panelTension 缺失时逐级回退 lockTension → maxTension', () => {
    const reel = { equipmentType: '渔轮', lockTension: 29, wear: 0 }
    expect(calculateActualPanelTension(reel, CALC_RULES.GUIDE, 29)).toBe(29)
    const reel2 = { equipmentType: '渔轮', maxTension: 29, wear: 0 }
    expect(calculateActualPanelTension(reel2, CALC_RULES.GUIDE, 29)).toBe(29)
  })

  it('其他类型直接返回面板拉力', () => {
    const line = { equipmentType: '主线', panelTension: 12, wear: 50 }
    expect(calculateActualPanelTension(line, CALC_RULES.GUIDE, 0)).toBe(12)
  })
})

describe('calculateCustomActualTension', () => {
  it('最大拉力 × (1 - 磨损%)', () => {
    expect(calculateCustomActualTension({ maxTension: 60, wear: 50 })).toBe(30)
  })

  it('空对象/null 兜底 0', () => {
    expect(calculateCustomActualTension(null)).toBe(0)
    expect(calculateCustomActualTension({})).toBe(0)
  })
})

describe('getFrictionMax / clampFriction', () => {
  it('宝典上限 29，论坛上限 30', () => {
    expect(getFrictionMax(CALC_RULES.GUIDE)).toBe(FRICTION_GUIDE_MAX)
    expect(getFrictionMax(CALC_RULES.FORUM)).toBe(FRICTION_FORUM_MAX)
  })

  it('clamp 到 [0, 上限] 且取整', () => {
    expect(clampFriction(-5, CALC_RULES.GUIDE)).toBe(0)
    expect(clampFriction(100, CALC_RULES.GUIDE)).toBe(29)
    expect(clampFriction(100, CALC_RULES.FORUM)).toBe(30)
    expect(clampFriction(14.6, CALC_RULES.GUIDE)).toBe(15)
    expect(clampFriction('abc', CALC_RULES.GUIDE)).toBe(0)
  })
})

describe('buildMinTensionInfo', () => {
  const toNum = (v) => {
    const n = safeToNumber(v, 0)
    return n == null ? 0 : n
  }

  it('取四个部位中的最小拉力项', () => {
    const info = buildMinTensionInfo(
      { '鱼竿': { id: 1 }, '渔轮': { id: 2 } },
      { '鱼竿': 13, '渔轮': 18 },
      { '主线': { maxTension: 60, wear: 0 }, '引线': { maxTension: 10, wear: 0 } },
      calculateCustomActualTension,
      toNum,
      formatTension
    )
    expect(info).toMatchObject({ type: '引线', value: 10, valueText: '10.00 kN' })
  })

  it('value <= 0 的项不参与比较', () => {
    const info = buildMinTensionInfo(
      { '鱼竿': { id: 1 } },
      { '鱼竿': 13 },
      { '主线': { maxTension: 0, wear: 0 }, '引线': null },
      calculateCustomActualTension,
      toNum,
      formatTension
    )
    expect(info).toMatchObject({ type: '鱼竿', value: 13 })
  })

  it('没有任何有效项时返回 null', () => {
    const info = buildMinTensionInfo({}, {}, {}, calculateCustomActualTension, toNum, formatTension)
    expect(info).toBeNull()
  })
})
