import { describe, it, expect } from 'vitest'
import {
  escapeRegExp,
  buildWordBoundaryRegex,
  normalizeForSearch,
  searchAndRankEquipment
} from '../src/utils/search.js'

describe('escapeRegExp', () => {
  it('转义正则元字符', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c')
    expect(escapeRegExp('(1+2)')).toBe('\\(1\\+2\\)')
  })

  it('非字符串输入兜底空串', () => {
    expect(escapeRegExp(null)).toBe('')
    expect(escapeRegExp({})).toBe('')
    expect(escapeRegExp([])).toBe('')
  })
})

describe('buildWordBoundaryRegex', () => {
  it('以空白/下划线/连字符为边界匹配', () => {
    const re = buildWordBoundaryRegex('2000')
    expect(re.test('Admiral 2000 S')).toBe(true)
    expect(re.test('Admiral-2000-S')).toBe(true)
    expect(re.test('Admiral20005')).toBe(false)
  })

  it('空查询返回永不匹配的正则', () => {
    const re = buildWordBoundaryRegex('')
    expect(re.test('anything')).toBe(false)
  })
})

describe('normalizeForSearch', () => {
  it('转小写并移除空白与分隔符', () => {
    expect(normalizeForSearch('Admiral-2000S')).toBe('admiral2000s')
    expect(normalizeForSearch('20 2S')).toBe('202s')
    expect(normalizeForSearch('a_b/c.d,e')).toBe('abcde')
  })

  it('非字符串输入兜底空串', () => {
    expect(normalizeForSearch(null)).toBe('')
    expect(normalizeForSearch({})).toBe('')
  })
})

describe('searchAndRankEquipment', () => {
  const data = [
    { model: 'Admiral 2000S', equipmentName: 'A' },
    { model: 'Admiral', equipmentName: 'B' },
    { model: 'Super Admiral X', equipmentName: 'C' },
    { model: 'Neptun', equipmentName: 'D' }
  ]

  it('精确匹配排最前，前缀次之', () => {
    const result = searchAndRankEquipment(data, 'admiral', ['model'])
    expect(result[0].model).toBe('Admiral')
    expect(result[1].model).toBe('Admiral 2000S')
    // 无匹配的 Neptun 被过滤
    expect(result.some(item => item.model === 'Neptun')).toBe(false)
  })

  it('去空格/分隔符归一化匹配', () => {
    const result = searchAndRankEquipment(data, 'admiral2000s', ['model'])
    expect(result).toHaveLength(1)
    expect(result[0].model).toBe('Admiral 2000S')
  })

  it('空查询返回原数据', () => {
    expect(searchAndRankEquipment(data, '')).toBe(data)
    expect(searchAndRankEquipment(data, '   ')).toBe(data)
  })

  it('非数组输入兜底空数组', () => {
    expect(searchAndRankEquipment(null, 'a')).toEqual([])
    expect(searchAndRankEquipment({}, 'a')).toEqual([])
  })

  it('对象型字段不抛异常', () => {
    const dirty = [{ model: {}, equipmentName: 'Admiral' }]
    const result = searchAndRankEquipment(dirty, 'admiral', ['model', 'equipmentName'])
    expect(result).toHaveLength(1)
  })
})
