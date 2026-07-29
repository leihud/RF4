import { describe, it, expect } from 'vitest'
import {
  escapeRegExp,
  buildWordBoundaryRegex,
  normalizeForSearch,
  searchAndRankEquipment,
  sortByPanelTension,
  EQUIPMENT_SEARCH_FIELDS
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

  it('数组含非对象项（null/undefined/字符串）时不抛异常且被过滤', () => {
    const dirty = [null, undefined, 'oops', 42, { model: 'Admiral' }]
    const result = searchAndRankEquipment(dirty, 'admiral', ['model'])
    expect(result).toHaveLength(1)
    expect(result[0].model).toBe('Admiral')
  })

  it('统一字段集支持按分类、评级原值与评级别名搜索（计算器/对比页一致性保障）', () => {
    const list = [
      { model: 'Admiral 2000S', category: '纺车轮', rating: 'S', ratingAlias: '稀有级' },
      { model: 'Neptun', category: '水滴轮', rating: '', ratingAlias: '常规' }
    ]
    // 按分类搜
    const byCategory = searchAndRankEquipment(list, '纺车轮', EQUIPMENT_SEARCH_FIELDS)
    expect(byCategory).toHaveLength(1)
    expect(byCategory[0].model).toBe('Admiral 2000S')
    // 按评级别名搜
    const byRating = searchAndRankEquipment(list, '稀有', EQUIPMENT_SEARCH_FIELDS)
    expect(byRating).toHaveLength(1)
    expect(byRating[0].ratingAlias).toBe('稀有级')
    // 按数据库 rating 原值搜
    const byRawRating = searchAndRankEquipment(list, 's', EQUIPMENT_SEARCH_FIELDS)
    expect(byRawRating.some(item => item.rating === 'S')).toBe(true)
  })
})

describe('EQUIPMENT_SEARCH_FIELDS', () => {
  it('字段集内容与顺序固定，且已冻结防篡改', () => {
    expect(EQUIPMENT_SEARCH_FIELDS).toEqual(['model', 'equipmentName', 'category', 'subCategory', 'rating', 'ratingAlias'])
    expect(Object.isFrozen(EQUIPMENT_SEARCH_FIELDS)).toBe(true)
  })
})

describe('sortByPanelTension', () => {
  it('按 panelTension 升序排列', () => {
    const list = [{ panelTension: 30 }, { panelTension: 10 }, { panelTension: 20 }]
    expect(sortByPanelTension(list).map(i => i.panelTension)).toEqual([10, 20, 30])
  })

  it('不修改原数组', () => {
    const list = [{ panelTension: 2 }, { panelTension: 1 }]
    sortByPanelTension(list)
    expect(list.map(i => i.panelTension)).toEqual([2, 1])
  })

  it('NaN/对象/缺失值兜底 0，不抛异常', () => {
    const list = [{ panelTension: 5 }, { panelTension: {} }, {}, null, { panelTension: -1 }]
    const sorted = sortByPanelTension(list)
    expect(sorted[0].panelTension).toBe(-1)
    expect(sorted[sorted.length - 1].panelTension).toBe(5)
  })

  it('非数组输入兜底空数组', () => {
    expect(sortByPanelTension(null)).toEqual([])
    expect(sortByPanelTension('x')).toEqual([])
  })
})
