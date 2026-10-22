import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  parseCsvLine,
  parseRuNumber,
  parseLinesCsv,
  parseHooksCsv,
  parseCalcOptions,
  extractPageTitle,
  parseWeightTable
} from '../scripts/stats-parser.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFileSync(join(__dirname, 'fixtures', name), 'utf8')

describe('parseCsvLine', () => {
  it('处理引号包裹的逗号', () => {
    expect(parseCsvLine('A,"6,8",B')).toEqual(['A', '6,8', 'B'])
  })
  it('处理转义引号', () => {
    expect(parseCsvLine('"say ""hi""",x')).toEqual(['say "hi"', 'x'])
  })
})

describe('parseRuNumber', () => {
  it('逗号小数归一化', () => {
    expect(parseRuNumber('6,8')).toBe(6.8)
    expect(parseRuNumber('0,18')).toBe(0.18)
  })
  it('纯数字', () => {
    expect(parseRuNumber('19')).toBe(19)
  })
  it('未知值 ? / - / 空 → null', () => {
    expect(parseRuNumber('?')).toBeNull()
    expect(parseRuNumber('-')).toBeNull()
    expect(parseRuNumber('')).toBeNull()
  })
})

describe('parseLinesCsv（真实 fixture）', () => {
  const rows = parseLinesCsv(fixture('potryasov-lines.csv'))
  it('解析出全部数据行', () => {
    expect(rows.length).toBeGreaterThan(300)
  })
  it('首行数据字段正确（Carp Super Soft Braid 20LB 0,18mm）', () => {
    const first = rows[0]
    expect(first.name).toBe('Carp Super Soft Braid 20LB')
    expect(first.strength_kg).toBe(6.8)
    expect(first.diameter_mm).toBe(0.18)
    expect(first.length_m).toBe(20)
    expect(first.price).toBe(34.9)
  })
  it('同一型号按线径逐行展开', () => {
    const diameters = rows.filter(r => r.name === 'Carp Super Soft Braid 20LB').map(r => r.diameter_mm)
    expect(diameters).toContain(0.2)
    expect(diameters).toContain(0.4)
  })
})

describe('parseHooksCsv（真实 fixture）', () => {
  const rows = parseHooksCsv(fixture('potryasov-hooks.csv'))
  it('解析出型号行并跳过空钩号格', () => {
    expect(rows.length).toBeGreaterThan(20)
    const stinger = rows.find(r => r.name === 'Stinger Triple')
    expect(stinger.type).toBe('Тройник')
    const s1 = stinger.strength.find(s => s.size === 'S1')
    expect(s1.kg).toBe(6.1)
    // S7 为空，不应出现在 strength 里
    expect(stinger.strength.find(s => s.size === 'S7')).toBeUndefined()
  })
  it('无空格钩号也解析（纯数字单元格）', () => {
    const rage = rows.find(r => r.name === 'Rage Treble')
    expect(rage).toBeDefined()
    expect(rage.strength.length).toBeGreaterThan(0)
  })
})

describe('parseCalcOptions', () => {
  it('从 Tilda calc 页 HTML 提取型号=数值', () => {
    const html = '<select><option value="Admiral 1000s = 9.00">Admiral 1000s</option><option value="Model X = 12,5">X</option><option value="Unknown = ?">U</option></select>'
    const rows = parseCalcOptions(html)
    expect(rows).toEqual([
      { model: 'Admiral 1000s', strength_kg: 9 },
      { model: 'Model X', strength_kg: 12.5 }
    ])
  })
  it('无 option 时返回空', () => {
    expect(parseCalcOptions('<div>no data</div>')).toEqual([])
  })
  it('过滤齿轮磨损系数行（0-100% 非型号）', () => {
    const html = `<select>
      <option value="Admiral 1000s = 9.00">A</option>
      <option value="0% = 1">0</option>
      <option value="50% = 0.5">50</option>
      <option value="100% = 0">100</option>
      <option value="25 = 0.25">25</option>
    </select>`
    const rows = parseCalcOptions(html)
    expect(rows).toEqual([{ model: 'Admiral 1000s', strength_kg: 9 }])
  })
})

describe('extractPageTitle', () => {
  it('提取标题并去除站名后缀', () => {
    const html = '<html><head><title>Спиннинги — Potryasov Game</title></head></html>'
    expect(extractPageTitle(html)).toBe('Спиннинги')
  })
  it('无标题返回空串', () => {
    expect(extractPageTitle('<div>x</div>')).toBe('')
    expect(extractPageTitle('')).toBe('')
  })
})

describe('parseWeightTable（真实 rf4stat fixture）', () => {
  const rows = parseWeightTable(fixture('rf4stat-weight.html'))
  it('解析出全部鱼种行', () => {
    expect(rows.length).toBeGreaterThan(250)
  })
  it('首行字段完整（C2超级怪胎）', () => {
    const first = rows[0]
    expect(first.slug).toBe('s_freaks')
    expect(first.name).toBe('C2超级怪胎')
    expect(first.trophy_weight).toBe(30000)
    expect(first.super_trophy_weight).toBe(40000)
    expect(first.max_record_weight).toBe(49820)
    expect(first.max_record_date).toBe('2025-02-24')
    expect(first.max_record_player).toBe('Anpaer')
    expect(first.rarity).toBe('稀有')
  })
  it('所有行都有名称与 slug', () => {
    expect(rows.every(r => r.name && r.slug)).toBe(true)
  })
})
