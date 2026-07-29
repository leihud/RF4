import { describe, it, expect } from 'vitest'
import { getRatingAlias, RATING_ALIAS } from '../src/constants/equipment.js'

describe('getRatingAlias', () => {
  it('空值/空串返回「常规」', () => {
    expect(getRatingAlias(null)).toBe('常规')
    expect(getRatingAlias(undefined)).toBe('常规')
    expect(getRatingAlias('')).toBe('常规')
    expect(getRatingAlias('   ')).toBe('常规')
  })

  it('命中映射表返回中文别名', () => {
    expect(getRatingAlias('S')).toBe('稀有级')
    expect(getRatingAlias('SS')).toBe('传说级')
    expect(getRatingAlias(1)).toBe('一星级')
    expect(getRatingAlias('3')).toBe('三星级')
  })

  it('未命中映射时直接返回数据库原值（不追加「级」后缀）', () => {
    expect(getRatingAlias('黄金')).toBe('黄金')
    expect(getRatingAlias('T0')).toBe('T0')
    expect(getRatingAlias(99)).toBe('99')
  })

  it('对象/非法输入兜底「常规」', () => {
    expect(getRatingAlias({})).toBe('常规')
    expect(getRatingAlias(NaN)).toBe('常规')
  })

  it('映射表已冻结防篡改', () => {
    expect(Object.isFrozen(RATING_ALIAS)).toBe(true)
  })
})
