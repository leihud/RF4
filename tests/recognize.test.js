// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  parseItemsText,
  cleanItem,
  normalizeCompare,
  similarity,
  pickTopCandidates
} from '../functions/api/recognize.js'

describe('functions/api/recognize.js 纯函数', () => {
  describe('parseItemsText', () => {
    it('解析 Markdown 代码块里的 JSON', () => {
      const text = '```json\n{"items":[{"name":"TeleStick TL16","quantity":2}]}\n```'
      expect(parseItemsText(text)).toEqual([{ name: 'TeleStick TL16', quantity: 2 }])
    })

    it('解析裸 JSON 对象', () => {
      const text = '{"items":[{"name":"Blackwood Picker PSL98MH","quantity":1}]}'
      expect(parseItemsText(text)).toEqual([{ name: 'Blackwood Picker PSL98MH', quantity: 1 }])
    })

    it('兼容直接返回数组', () => {
      const text = '[{"name":"Spark 2 2000S","quantity":3}]'
      expect(parseItemsText(text)).toEqual([{ name: 'Spark 2 2000S', quantity: 3 }])
    })

    it('无效 JSON 返回空数组', () => {
      expect(parseItemsText('not json')).toEqual([])
      expect(parseItemsText('{"items":')).toEqual([])
    })

    it('没有 items 字段返回空数组', () => {
      expect(parseItemsText('{"data":[]}')).toEqual([])
    })
  })

  describe('cleanItem', () => {
    it('归一化名称与数量', () => {
      expect(cleanItem({ name: '  TeleStick TL16  ', quantity: '2' })).toEqual({
        name: 'TeleStick TL16',
        quantity: 2
      })
    })

    it('非法数量兜底为 1，且限制上限', () => {
      expect(cleanItem({ name: 'X', quantity: 'abc' }).quantity).toBe(1)
      expect(cleanItem({ name: 'X', quantity: 99999 }).quantity).toBe(999)
      expect(cleanItem({ name: 'X', quantity: -5 }).quantity).toBe(1)
    })

    it('超长名称截断', () => {
      const long = 'A'.repeat(200)
      expect(cleanItem({ name: long }).name.length).toBe(120)
    })
  })

  describe('normalizeCompare', () => {
    it('转小写并去除分隔符，保留中英文', () => {
      expect(normalizeCompare('Blackwood Picker PSL98MH')).toBe('blackwoodpickerpsl98mh')
      expect(normalizeCompare('Tagara II 6000')).toBe('tagaraii6000')
      expect(normalizeCompare('Kama Comfort FD360')).toBe('kamacomfortfd360')
    })
  })

  describe('similarity', () => {
    it('完全相等返回 1', () => {
      expect(similarity('blackwoodpickerpsl98mh', 'blackwoodpickerpsl98mh')).toBe(1)
    })

    it('包含关系得分高于 0.7', () => {
      const score = similarity('telesticktl16', 'telestick')
      expect(score).toBeGreaterThan(0.7)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('编辑距离近得分较高', () => {
      const score = similarity('tagaraii6000', 'tagaraii6000s')
      expect(score).toBeGreaterThan(0.6)
    })

    it('完全不相关得分低', () => {
      const score = similarity('abc123', 'xyz789')
      expect(score).toBeLessThan(0.5)
    })
  })

  describe('pickTopCandidates', () => {
    const rows = [
      { id: 1, model: 'TeleStick TL16', equipmentName: 'Express Fishing', category: 'TelePole', rating: '常见', form: 'Tele Pole' },
      { id: 2, model: 'TeleStick TL18', equipmentName: 'Express Fishing', category: 'TelePole', rating: '常见', form: 'Tele Pole' },
      { id: 3, model: 'Spark 2 2000S', equipmentName: 'Express Fishing', category: 'Spinning', rating: '常见', form: 'Spinning' },
      { id: 4, model: 'Blackwood Picker PSL98MH', equipmentName: 'Blackwood', category: 'Picker', rating: '常见', form: 'Picker' }
    ]

    it('返回最匹配的 topK 并按分数排序', () => {
      const candidates = rows.map((row) => ({ type: 'rod', row }))
      const top = pickTopCandidates(candidates, 'TeleStick TL16', 2)
      expect(top.length).toBe(2)
      expect(top[0].row.model).toBe('TeleStick TL16')
      expect(top[0].score).toBeGreaterThan(top[1].score)
    })

    it('只返回超过阈值的候选', () => {
      const candidates = rows.map((row) => ({ type: 'rod', row }))
      const top = pickTopCandidates(candidates, '完全不相关名称', 3)
      expect(top.length).toBe(0)
    })

    it('没有候选时返回空数组', () => {
      expect(pickTopCandidates([], 'X', 3)).toEqual([])
    })
  })
})
