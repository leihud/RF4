import { describe, it, expect } from 'vitest'
import { parsePrice, formatPrice, getMergedAdaptWeight } from '../src/utils/display.js'

describe('parsePrice', () => {
  it('从带逗号/单位的文本中提取数字', () => {
    expect(parsePrice('1,024.5 银币')).toBe(1024.5)
    expect(parsePrice('62801.52')).toBe(62801.52)
  })

  it('null/对象/无数字兜底 0', () => {
    expect(parsePrice(null)).toBe(0)
    expect(parsePrice({})).toBe(0)
    expect(parsePrice('免费')).toBe(0)
  })
})

describe('formatPrice', () => {
  it('固定两位小数并加千分位', () => {
    expect(formatPrice(62801.520000000004)).toBe('62,801.52')
    expect(formatPrice(40999.5)).toBe('40,999.50')
    expect(formatPrice(0)).toBe('0.00')
  })

  it('字符串价格先解析再格式化', () => {
    expect(formatPrice('1,024')).toBe('1,024.00')
  })

  it('null/非法值返回空串', () => {
    expect(formatPrice(null)).toBe('')
    expect(formatPrice(Infinity)).toBe('')
  })
})

describe('getMergedAdaptWeight', () => {
  it('优先级 1：文本型 adaptWeight', () => {
    expect(getMergedAdaptWeight({ adaptWeight: '5-25g', adaptWeightG: 30 }, '鱼竿')).toBe('5-25g')
  })

  it('优先级 2：adaptWeightStar', () => {
    expect(getMergedAdaptWeight({ adaptWeightStar: '★★★' }, '鱼竿')).toBe('★★★')
  })

  it('优先级 3：数字型 adaptWeightG 自动加 g 单位', () => {
    expect(getMergedAdaptWeight({ adaptWeightG: 30 }, '鱼竿')).toBe('30 g')
  })

  it('优先级 4：鱼竿 testG / 渔轮 test 兜底', () => {
    expect(getMergedAdaptWeight({ testG: 80 }, '鱼竿')).toBe('80 g')
    expect(getMergedAdaptWeight({ test: '10 kg' }, '渔轮')).toBe('10 kg')
  })

  it('都为空返回空串', () => {
    expect(getMergedAdaptWeight({}, '鱼竿')).toBe('')
    expect(getMergedAdaptWeight(null, '鱼竿')).toBe('')
  })
})
