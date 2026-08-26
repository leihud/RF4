import { describe, it, expect } from 'vitest'
import {
  getCompatibleReelTypes,
  isRodReelCompatible,
  ROD_NO_REEL_CATEGORIES,
  ROD_SPINNING_ONLY_CATEGORIES,
  ROD_BAITCAST_ONLY_CATEGORIES,
  SPINNING_REEL_CATEGORIES,
  BAITCAST_REEL_CATEGORIES
} from '../src/constants/equipment.js'

describe('getCompatibleReelTypes', () => {
  it('空分类返回 null（不限制）', () => {
    expect(getCompatibleReelTypes(null)).toBeNull()
    expect(getCompatibleReelTypes(undefined)).toBeNull()
    expect(getCompatibleReelTypes('')).toBeNull()
  })

  it('手竿类返回空数组（无法装备任何渔轮）', () => {
    for (const category of ROD_NO_REEL_CATEGORIES) {
      expect(getCompatibleReelTypes(category)).toEqual([])
    }
  })

  it('仅纺车轮的鱼竿分类返回纺车轮分类列表', () => {
    for (const category of ROD_SPINNING_ONLY_CATEGORIES) {
      expect(getCompatibleReelTypes(category)).toEqual([...SPINNING_REEL_CATEGORIES])
    }
  })

  it('枪柄竿返回鼓轮/水滴轮分类列表', () => {
    for (const category of ROD_BAITCAST_ONLY_CATEGORIES) {
      expect(getCompatibleReelTypes(category)).toEqual([...BAITCAST_REEL_CATEGORIES])
    }
  })

  it('未分类的鱼竿返回 null（不限制）', () => {
    expect(getCompatibleReelTypes('海竿')).toBeNull()
  })

  it('返回值是副本，修改不影响原常量', () => {
    const result = getCompatibleReelTypes(ROD_SPINNING_ONLY_CATEGORIES[0])
    result.push('篡改值')
    expect(SPINNING_REEL_CATEGORIES).not.toContain('篡改值')
  })
})

describe('isRodReelCompatible', () => {
  it('鱼竿或渔轮缺失时视为兼容（不做校验）', () => {
    expect(isRodReelCompatible(null, { category: '纺车式' })).toBe(true)
    expect(isRodReelCompatible({ category: '手竿' }, null)).toBe(true)
  })

  it('手竿与任何渔轮都不兼容', () => {
    expect(isRodReelCompatible({ category: '手竿' }, { category: '纺车式' })).toBe(false)
    expect(isRodReelCompatible({ category: '手竿' }, { category: '鼓轮' })).toBe(false)
  })

  it('纺车竿只兼容纺车式渔轮', () => {
    const rod = { category: ROD_SPINNING_ONLY_CATEGORIES[0] }
    expect(isRodReelCompatible(rod, { category: '纺车式' })).toBe(true)
    expect(isRodReelCompatible(rod, { category: '鼓轮' })).toBe(false)
  })

  it('枪柄竿只兼容鼓轮/水滴轮', () => {
    const rod = { category: '枪柄竿' }
    expect(isRodReelCompatible(rod, { category: '水滴轮' })).toBe(true)
    expect(isRodReelCompatible(rod, { category: '纺车式' })).toBe(false)
  })

  it('不限制分类的鱼竿兼容所有渔轮', () => {
    const rod = { category: '海竿' }
    expect(isRodReelCompatible(rod, { category: '纺车式' })).toBe(true)
    expect(isRodReelCompatible(rod, { category: '鼓轮' })).toBe(true)
  })
})
