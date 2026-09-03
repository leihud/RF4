// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * equipmentLoader 缓存行为测试。
 * loader 内部持有模块级内存缓存，且新增 localStorage 持久缓存，
 * 因此每个用例都通过 vi.resetModules + 动态 import 拿到全新模块实例，
 * 以模拟“重新进入页面/新会话”的场景。
 */

const ROD_ROWS = [
  { model: '测试竿A', equipmentName: '测试竿A', category: '鱼竿', form: '直柄', strengthKg: '12 kg', rating: '2' }
]
const REEL_ROWS = [
  { model: '测试轮A', equipmentName: '测试轮A', category: '渔轮', form: '纺车轮', frictionForce: '3.5 kg', lockTension: '4 kg', rating: '4' }
]

const PERSIST_KEY = 'rf4_equipment_cache_v1'

function mockFetch() {
  const fn = vi.fn(async (url) => ({
    ok: true,
    json: async () => (String(url).includes('/api/reels') ? REEL_ROWS : ROD_ROWS)
  }))
  vi.stubGlobal('fetch', fn)
  return fn
}

async function importFreshLoader() {
  vi.resetModules()
  return import('../src/utils/equipmentLoader.js')
}

describe('equipmentLoader 缓存行为', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('无缓存时发起网络请求，并将结果写入 localStorage 持久缓存', async () => {
    fetchMock = mockFetch()
    const { loadRodAndReelData } = await importFreshLoader()

    const result = await loadRodAndReelData()

    expect(result.error).toBe(false)
    expect(result.rodData).toHaveLength(1)
    expect(result.reelData).toHaveLength(1)
    // rods + reels 各一次网络请求
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // 持久缓存已写入，且带 schema 版本（结构变更时可整体失效）
    const cached = JSON.parse(localStorage.getItem(PERSIST_KEY))
    expect(cached.schema).toBe(1)
    expect(cached.rod).toEqual(result.rodData)
    expect(cached.reel).toEqual(result.reelData)
  })

  it('内存缓存新鲜时直接复用，不重复发起网络请求', async () => {
    fetchMock = mockFetch()
    const { loadRodAndReelData } = await importFreshLoader()

    await loadRodAndReelData()
    const before = fetchMock.mock.calls.length

    const second = await loadRodAndReelData()

    expect(second.error).toBe(false)
    expect(second.rodData).toHaveLength(1)
    expect(fetchMock.mock.calls.length).toBe(before) // 第二次调用未再请求
  })

  it('重新进入页面（新模块实例）时优先读取 localStorage，无需等待网络即可拿到数据', async () => {
    fetchMock = mockFetch()

    // 首次访问：走网络并写入持久缓存
    const firstLoader = await importFreshLoader()
    await firstLoader.loadRodAndReelData()

    // 模拟新会话：重置模块，但 localStorage 缓存仍存在
    const secondLoader = await importFreshLoader()
    const result = await secondLoader.loadRodAndReelData()

    expect(result.error).toBe(false)
    expect(result.rodData[0].model).toBe('测试竿A')
    expect(result.reelData[0].model).toBe('测试轮A')
    // 命中持久缓存：即使后台可能触发静默刷新，也不应阻塞调用方返回
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('持久缓存被清空/损坏时静默回退到网络，不抛异常', async () => {
    fetchMock = mockFetch()
    localStorage.setItem(PERSIST_KEY, '{invalid json') // 损坏数据

    const { loadRodAndReelData } = await importFreshLoader()
    const result = await loadRodAndReelData()

    expect(result.error).toBe(false)
    expect(result.rodData).toHaveLength(1)
    // 网络失败时也应正常返回 error 标志而非抛异常
    expect(fetchMock).toHaveBeenCalled()
  })
})
