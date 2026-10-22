import { describe, it, expect } from 'vitest'
import {
  editorToText,
  cleanText,
  cleanNumber,
  extractProfile,
  extractProfiles,
  parseProfile,
  isValidProfileName,
  flattenTree,
  mapAttrsToColumns,
  normalizeAttrKey,
  ROD_ATTR_COLUMNS,
  REEL_ATTR_COLUMNS
} from '../scripts/gamekee-parser.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8').replace(/^\uFEFF/, ''))

describe('cleanText', () => {
  it('去 BOM/零宽字符并压缩空白', () => {
    expect(cleanText('\uFEFF\u200B鲤 鱼 竿\u200D')).toBe('鲤 鱼 竿')
  })
  it('孤立破折号占位归空', () => {
    expect(cleanText('-')).toBe('')
    expect(cleanText('—')).toBe('')
  })
  it('null/undefined 安全', () => {
    expect(cleanText(null)).toBe('')
  })
})

describe('cleanNumber', () => {
  it('评分 3/10 → 3', () => {
    expect(cleanNumber('3/10')).toBe(3)
  })
  it('≥6.5 / >=6.5 → 6.5', () => {
    expect(cleanNumber('≥6.5')).toBe(6.5)
    expect(cleanNumber('>= 6.5')).toBe(6.5)
  })
  it('区间 35-160 → null（保留文本）', () => {
    expect(cleanNumber('35-160')).toBeNull()
  })
  it('- 与空 → null', () => {
    expect(cleanNumber('-')).toBeNull()
    expect(cleanNumber('')).toBeNull()
  })
  it('普通数值', () => {
    expect(cleanNumber('470')).toBe(470)
    expect(cleanNumber('6.2')).toBe(6.2)
  })
})

describe('editorToText', () => {
  it('递归拼接多段 text run', () => {
    expect(editorToText({ data: [{ children: [{ text: '锁轮' }, { text: '拉力' }] }] })).toBe('锁轮拉力')
  })
  it('空安全', () => {
    expect(editorToText(null)).toBe('')
  })
})

describe('normalizeAttrKey', () => {
  it('同值异名字段归一', () => {
    expect(normalizeAttrKey('摩擦制动')).toBe('摩擦制动力')
    expect(normalizeAttrKey('摩擦力')).toBe('摩擦制动力')
    expect(normalizeAttrKey('适配重(克)')).toBe('适配重')
    expect(normalizeAttrKey('测试(克)')).toBe('测试')
    expect(normalizeAttrKey('重量')).toBe('质量')
  })
  it('未命中保留原名', () => {
    expect(normalizeAttrKey('自定义字段')).toBe('自定义字段')
  })
})

describe('isValidProfileName（坏 profile 名字过滤）', () => {
  it('正常型号名通过', () => {
    expect(isValidProfileName('Venga 6000')).toBe(true)
    expect(isValidProfileName('Hydra G2 30s')).toBe(true)
    expect(isValidProfileName('Atlas Marker 4.0LB')).toBe(true)
  })
  it('整页内容拼进名字的坏 profile 被拒', () => {
    const bad = 'Venga 6000能力：无Hydra G2 – 是Syberia公司制造的新一代纺车式卷线轮。 评级 Hydra G2 30s'
    expect(isValidProfileName(bad)).toBe(false)
  })
  it('超长名字被拒', () => {
    expect(isValidProfileName('A'.repeat(61))).toBe(false)
  })
  it('含描述句号的被拒', () => {
    expect(isValidProfileName('某轮。描述文本')).toBe(false)
  })
  it('空名被拒', () => {
    expect(isValidProfileName('')).toBe(false)
  })
})

describe('extractProfile / parseProfile（真实 fixture）', () => {
  const reelCj = fixture('gamekee-contentjson-reel.json')
  it('提取 character-profile 并解析全字段', () => {
    const profile = extractProfile(reelCj)
    expect(profile).not.toBeNull()
    const parsed = parseProfile(profile)
    expect(parsed.name).toBe('Profisher')
    expect(parsed.description).toContain('Express Fishing')
    const keys = parsed.attrsMap
    expect(keys['形式'].value).toBe('水滴轮')
    expect(keys['大小'].value).toBe('LP')
    expect('-').toBe('-') // 占位：防海水为 "-" 时 value 清洗后为空
  })

  it('非图鉴富文本返回 null', () => {
    expect(extractProfile({ children: [{ type: 'paragraph', children: [{ text: '普通文章' }] }] })).toBeNull()
    expect(extractProfile('')).toBeNull()
    expect(extractProfile('非JSON')).toBeNull()
  })

  it('extractProfiles：一个页面含多个尺寸变体（真实 Albacore fixture）', () => {
    const detail = fixture('gamekee-detail-reel-albacore.json')
    const profiles = extractProfiles(detail.data.content_json)
    expect(profiles).toHaveLength(2)
    const parsed1 = parseProfile(profiles[0])
    const parsed2 = parseProfile(profiles[1])
    expect(parsed1.name).toBe('Albacore 20')
    expect(parsed2.name).toBe('Albacore 40 DS')
    // 变体字段各自独立
    expect(parsed1.attrsMap['大小'].value).toBe('20')
    expect(parsed1.attrsMap['锁轮拉力'].num).toBe(205)
    expect(parsed2.attrsMap['大小'].value).toBe('40')
  })

  it('extractProfiles：非图鉴富文本返回空数组', () => {
    expect(extractProfiles({ children: [{ type: 'paragraph', children: [{ text: '普通文章' }] }] })).toEqual([])
    expect(extractProfiles('')).toEqual([])
  })

  it('同键重复保留非空值', () => {
    const profile = {
      name: { data: [{ children: [{ text: 'X' }] }] },
      descTitle: { data: [] },
      desc: { data: [] },
      attrList: [
        { title: { data: [{ children: [{ text: '评级' }] }] }, content: { data: [{ children: [{ text: '' }] }] } },
        { title: { data: [{ children: [{ text: '评级' }] }] }, content: { data: [{ children: [{ text: 'S' }] }] } }
      ]
    }
    const parsed = parseProfile(profile)
    expect(parsed.attrsMap['评级'].value).toBe('S')
    expect(parsed.attrs).toHaveLength(1)
  })
})

describe('flattenTree', () => {
  const tree = [
    {
      id: 1, name: '渔竿图鉴',
      child: [
        { id: 2, name: 'SPOD竿', child: [{ id: 3, name: 'Persey Spod' }, { id: 4, name: '  ' }] },
        { id: 5, name: '空分类', child: [] }
      ]
    },
    { id: 6, name: '食品图鉴', child: [{ id: 7, name: '玉米' }] }
  ]
  it('任意深度递归展开叶子，带分区与路径', () => {
    const leaves = flattenTree(tree)
    expect(leaves).toHaveLength(3)
    expect(leaves[0]).toEqual({ entryId: 3, name: 'Persey Spod', section: '渔竿图鉴', path: '渔竿图鉴→SPOD竿→Persey Spod' })
  })
  it('分区过滤', () => {
    const leaves = flattenTree(tree, ['食品图鉴'])
    expect(leaves.map((l) => l.name)).toEqual(['玉米'])
  })
})

describe('mapAttrsToColumns', () => {
  it('映射到 rods 现有列，未映射进 extraAttrs', () => {
    const parsed = parseProfile({
      name: { data: [{ children: [{ text: '测试竿' }] }] },
      descTitle: { data: [] },
      desc: { data: [] },
      attrList: [
        { title: { data: [{ children: [{ text: '强度(公斤)' }] }] }, content: { data: [{ children: [{ text: '25.2' }] }] } },
        { title: { data: [{ children: [{ text: '灵敏度' }] }] }, content: { data: [{ children: [{ text: '3/10' }] }] } },
        { title: { data: [{ children: [{ text: '银币' }] }] }, content: { data: [{ children: [{ text: '648' }] }] } },
        { title: { data: [{ children: [{ text: '神秘新属性' }] }] }, content: { data: [{ children: [{ text: '未知' }] }] } },
        { title: { data: [{ children: [{ text: '防海水' }] }] }, content: { data: [{ children: [{ text: '-' }] }] } }
      ]
    })
    const { columns, extraAttrs } = mapAttrsToColumns(parsed, ROD_ATTR_COLUMNS)
    expect(columns.strengthKg).toBe(25.2)
    expect(columns.sensitivity).toBe(3)
    expect(columns.silverPrice).toBe(648)
    expect(extraAttrs['神秘新属性']).toBe('未知')
    expect('防海水' in extraAttrs).toBe(false) // 空值不落
  })

  it('reels 映射含锁轮拉力与摩擦制动力（别名归一）', () => {
    const parsed = parseProfile({
      name: { data: [{ children: [{ text: '测试轮' }] }] },
      descTitle: { data: [] },
      desc: { data: [] },
      attrList: [
        { title: { data: [{ children: [{ text: '锁轮拉力' }] }] }, content: { data: [{ children: [{ text: '≥6.5' }] }] } },
        { title: { data: [{ children: [{ text: '摩擦制动' }] }] }, content: { data: [{ children: [{ text: '3.2' }] }] } }
      ]
    })
    const { columns } = mapAttrsToColumns(parsed, REEL_ATTR_COLUMNS)
    expect(columns.lockTension).toBe(6.5)
    expect(columns.frictionForce).toBe(3.2)
  })
})
