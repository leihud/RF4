import { describe, it, expect } from 'vitest'
import {
  safeToString,
  safeToNumber,
  sanitizeEquipmentFields,
  sanitizeEquipmentList
} from '../src/utils/sanitize.js'

describe('safeToString', () => {
  it('primitive 原样/转字符串', () => {
    expect(safeToString('abc')).toBe('abc')
    expect(safeToString(12)).toBe('12')
    expect(safeToString(true)).toBe('true')
  })

  it('null/undefined 返回 fallback', () => {
    expect(safeToString(null)).toBeNull()
    expect(safeToString(undefined, '-')).toBe('-')
  })

  it('对象走 JSON.stringify，空对象兜底 fallback', () => {
    expect(safeToString({ a: 1 })).toBe('{"a":1}')
    expect(safeToString({}, null)).toBeNull()
  })

  it('Date 转字符串不抛异常', () => {
    expect(typeof safeToString(new Date())).toBe('string')
  })
})

describe('safeToNumber', () => {
  it('数字/布尔/bigint 正常转换', () => {
    expect(safeToNumber(3.5)).toBe(3.5)
    expect(safeToNumber(true)).toBe(1)
    expect(safeToNumber(false)).toBe(0)
    expect(safeToNumber(10n)).toBe(10)
  })

  it('字符串去千分位逗号后转数字', () => {
    expect(safeToNumber('1,024.5')).toBe(1024.5)
    expect(safeToNumber('abc')).toBeNull()
    expect(safeToNumber('abc', 0)).toBe(0)
  })

  it('NaN/Infinity 兜底 fallback', () => {
    expect(safeToNumber(NaN, 0)).toBe(0)
    expect(safeToNumber(Infinity, 0)).toBe(0)
  })

  it('对象尝试提取数字，失败兜底', () => {
    expect(safeToNumber({}, null)).toBeNull()
    expect(safeToNumber({ toString: () => '12.5 kg' })).toBe(12.5)
  })
})

describe('sanitizeEquipmentFields', () => {
  it('primitive 字段原样保留', () => {
    const src = { model: 'A', lockTension: 60, ok: true, empty: null }
    expect(sanitizeEquipmentFields(src)).toEqual(src)
  })

  it('数值白名单字段的对象值转数字，失败兜底 null', () => {
    const out = sanitizeEquipmentFields({ lockTension: {}, wear: { toString: () => '15' } })
    expect(out.lockTension).toBeNull()
    expect(out.wear).toBe(15)
  })

  it('文本字段的对象值安全转字符串', () => {
    const out = sanitizeEquipmentFields({ description: { toString: () => 'desc' } })
    expect(out.description).toBe('desc')
  })

  it('空对象字段兜底 null，不留下空对象', () => {
    const out = sanitizeEquipmentFields({ meta: {} })
    expect(out.meta).toBeNull()
  })

  it('数组与嵌套对象递归清洗', () => {
    const out = sanitizeEquipmentFields([{ lockTension: {} }, { model: 'B' }])
    expect(out[0].lockTension).toBeNull()
    expect(out[1].model).toBe('B')
  })

  it('null/非对象输入原样返回', () => {
    expect(sanitizeEquipmentFields(null)).toBeNull()
    expect(sanitizeEquipmentFields('x')).toBe('x')
  })
})

describe('sanitizeEquipmentList', () => {
  it('批量清洗，非数组兜底空数组', () => {
    expect(sanitizeEquipmentList(null)).toEqual([])
    const out = sanitizeEquipmentList([{ lockTension: {} }])
    expect(out).toHaveLength(1)
    expect(out[0].lockTension).toBeNull()
  })
})
