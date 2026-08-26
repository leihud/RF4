import { describe, it, expect, beforeEach } from 'vitest'
import { encodePreset, decodePreset, getShareUrl } from '../src/utils/presetShare.js'

describe('encodePreset / decodePreset 往返', () => {
  it('完整状态编码后解码，字段全部还原', () => {
    const state = {
      rodModel: '测试鱼竿 X1',
      reelModel: 'Test Reel 3000',
      rodWear: 15,
      reelWear: 20,
      friction: 25,
      mainLineTension: 12.5,
      mainLineWear: 5,
      leaderLineTension: 8.8,
      leaderLineWear: 3,
      calculationRule: 'forum'
    }
    const encoded = encodePreset(state)
    expect(encoded.startsWith('p=')).toBe(true)

    const decoded = decodePreset('?' + encoded)
    expect(decoded).toEqual(state)
  })

  it('部分状态解码时缺失字段回退默认值', () => {
    const encoded = encodePreset({ rodModel: '鱼竿A', friction: 29 })
    const decoded = decodePreset(encoded)
    expect(decoded.rodModel).toBe('鱼竿A')
    expect(decoded.friction).toBe(29)
    expect(decoded.reelModel).toBe('')
    expect(decoded.rodWear).toBe(0)
    expect(decoded.calculationRule).toBe('guide')
  })

  it('编码结果是 URL 安全的（编码段不含 +、/、=）', () => {
    const encoded = encodePreset({ rodModel: '含中文和空格 的装备??' })
    const base64Part = encoded.slice(2) // 去掉 p= 前缀后仅校验编码段
    expect(base64Part).not.toMatch(/[+/=]/)
  })
})

describe('encodePreset 压缩策略', () => {
  it('全部为默认值时返回空字符串', () => {
    expect(encodePreset({})).toBe('')
    expect(encodePreset({ rodWear: 0, friction: 0, calculationRule: 'guide' })).toBe('')
  })
})

describe('decodePreset 防御性处理', () => {
  it('空输入返回 null', () => {
    expect(decodePreset(null)).toBeNull()
    expect(decodePreset(undefined)).toBeNull()
    expect(decodePreset('')).toBeNull()
  })

  it('查询串无 p 参数返回 null', () => {
    expect(decodePreset('?foo=bar')).toBeNull()
  })

  it('非法编码内容返回 null 而不抛异常', () => {
    expect(decodePreset('?p=!!!非法base64!!!')).toBeNull()
    expect(decodePreset('?p=aGVsbG8')).toBeNull() // 合法 base64 但非 JSON
  })

  it('支持带和不带 ? 前缀的查询串', () => {
    const encoded = encodePreset({ rodModel: '鱼竿B' })
    const bare = encoded.slice(2) // 去掉 p=
    expect(decodePreset(`p=${bare}`).rodModel).toBe('鱼竿B')
    expect(decodePreset(`?p=${bare}`).rodModel).toBe('鱼竿B')
  })
})

describe('getShareUrl', () => {
  beforeEach(() => {
    globalThis.window = { location: { origin: 'https://rf4.example.com', pathname: '/' } }
  })

  it('有内容时拼接完整分享链接', () => {
    const url = getShareUrl({ rodModel: '鱼竿C' })
    expect(url.startsWith('https://rf4.example.com/?p=')).toBe(true)
    expect(decodePreset(url.split('?')[1]).rodModel).toBe('鱼竿C')
  })

  it('空状态时返回当前页面地址', () => {
    expect(getShareUrl({})).toBe('https://rf4.example.com/')
  })
})
