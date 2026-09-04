import { getRatingAlias } from '../constants/equipment.js'
import { sanitizeEquipmentList } from './sanitize.js'
import { parsePrice } from './display.js'
import { fetchWithTimeout } from './fetch.js'

/**
 * 装备数据加载共享模块（Calculator / ComparePage / BuildsList 等页面共用）。
 *
 * 三层缓存，逐层回退，把「每次进入页面全量下载竿轮数据」的耗时降到接近 0：
 *  1. 内存缓存（当前会话，5 分钟）：页面切换时直接复用，不发请求
 *  2. localStorage 持久缓存（跨会话/刷新）：命中后立即返回，
 *     同时后台节流刷新（SWR），避免每次访问都等待全量下载
 *  3. 网络兜底：以上缓存都没有时才请求 /api/rods + /api/reels
 *
 * 另带 single-flight 去重：同一时刻多个调用方（如并行的两个页面/组件）
 * 只发起一次网络请求，其余复用同一 Promise。
 */

/** 内存缓存 TTL（5 分钟） */
const MEMORY_CACHE_TTL = 5 * 60 * 1000
/** localStorage 缓存 key（数据结构变化时 bump schema 以整体失效） */
const PERSIST_KEY = 'rf4_equipment_cache_v1'
const PERSIST_SCHEMA = 1
/** 后台静默刷新的最小间隔：距上次成功网络拉取不足该值则直接复用持久缓存 */
const REFRESH_MIN_GAP = 60 * 1000

let _rodCache = null
let _reelCache = null
let _cacheTime = 0
/** 单飞：进行中的网络请求 Promise */
let _inflightPromise = null
/** 最近一次网络拉取成功的时间（用于节流后台刷新） */
let _lastNetworkAt = 0

/**
 * 从 localStorage 读取持久缓存。
 * @returns {{ rod: Array, reel: Array }|null}
 */
function readPersistedCache() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.schema === PERSIST_SCHEMA && Array.isArray(parsed.rod) && Array.isArray(parsed.reel)) {
      return parsed
    }
  } catch (_) { /* 缓存损坏/不可用时静默走网络 */ }
  return null
}

/** 写入持久缓存（容量不足/隐私模式等失败时静默降级） */
function writePersistedCache(rod, reel) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ schema: PERSIST_SCHEMA, rod, reel }))
  } catch (_) { /* 忽略 */ }
}

/**
 * 从 API 加载装备数据的共享逻辑。
 * Calculator 与 ComparePage 共用，消除重复的 fetch + 清洗 + 字段补齐代码。
 *
 * @param {string} apiPath  API 路径，如 '/api/equipment'、'/api/rods'
 * @param {object} [options]
 * @param {string} [options.equipmentType]  指定类型过滤（'鱼竿' | '渔轮'），仅 /api/equipment 有效
 * @param {Function} [options.enrich]  自定义字段补齐函数 (item) => item
 * @returns {Promise<{ data: Array, error: boolean }>}
 */
export async function loadEquipmentData(apiPath, options = {}) {
  const { equipmentType, enrich } = options

  try {
    const url = equipmentType ? `${apiPath}?type=${encodeURIComponent(equipmentType)}` : apiPath
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API响应错误 [${apiPath}]:`, response.status, errorText)
      return { data: [], error: true }
    }

    const raw = await response.json()
    const sanitized = sanitizeEquipmentList(Array.isArray(raw) ? raw : [])
    const data = sanitized.map(item => ({
      ...item,
      maxTension: item.panelTension ?? item.maxTension ?? null,
      ratingAlias: getRatingAlias(item.rating),
      ...(typeof enrich === 'function' ? enrich(item) : {})
    }))

    return { data, error: false }
  } catch (error) {
    console.error(`加载装备数据失败 [${apiPath}]:`, error)
    return { data: [], error: true }
  }
}

/** 组装内存/持久缓存命中结果（error 恒为 false，数据已在缓存时校验过非空） */
function cachedResult() {
  return { rodData: _rodCache, reelData: _reelCache, error: false }
}

/** 实际发起网络请求拉取竿轮数据；成功后同步更新内存缓存与 localStorage */
async function fetchRodAndReelData() {
  const [rodResult, reelResult] = await Promise.allSettled([
    loadEquipmentData('/api/rods', {
      enrich: (item) => ({ panelTension: parsePrice(item.strengthKg) || 0 })
    }),
    loadEquipmentData('/api/reels', {
      enrich: (item) => ({
        panelTension: parsePrice(item.frictionForce) || parsePrice(item.lockTension) || 0
      })
    })
  ])

  // loadEquipmentData 自身不抛异常（内部已捕获），这里兼容 rejected 状态双保险
  const rod = rodResult.status === 'fulfilled' ? rodResult.value : { data: [], error: true }
  const reel = reelResult.status === 'fulfilled' ? reelResult.value : { data: [], error: true }

  // 仅当两份数据都成功时写入缓存，避免缓存空数据
  if (!rod.error && !reel.error) {
    _rodCache = rod.data
    _reelCache = reel.data
    _cacheTime = Date.now()
    _lastNetworkAt = _cacheTime
    writePersistedCache(rod.data, reel.data)
  }

  return {
    rodData: rod.data,
    reelData: reel.data,
    error: rod.error && reel.error
  }
}

/**
 * 并行加载鱼竿和渔轮数据（对比页/计算器使用）。
 * 使用 Promise.allSettled 容错：单一接口失败时仍返回另一份数据，
 * 仅当两者都失败才报 error，避免一个接口抖动导致整页无数据。
 *
 * 缓存策略（详见文件头注释）：
 *  - 内存缓存新鲜 → 直接返回
 *  - 有 localStorage 持久缓存 → 立即返回并后台节流刷新（不阻塞 UI）
 *  - 都没有 → 走网络（single-flight，并发调用共享同一次请求）
 *
 * @returns {Promise<{ rodData: Array, reelData: Array, error: boolean }>}
 */
export async function loadRodAndReelData() {
  // 1. 命中内存缓存：页面切换等场景直接返回，不发请求
  if (_rodCache && _reelCache && Date.now() - _cacheTime < MEMORY_CACHE_TTL) {
    return cachedResult()
  }

  // 2. 已有网络请求在进行：复用同一 Promise，避免重复全量下载
  if (_inflightPromise) {
    return _inflightPromise
  }

  // 3. 命中 localStorage 持久缓存：立即返回缓存数据，同时后台静默刷新
  //    （距上次网络拉取 < REFRESH_MIN_GAP 时跳过刷新，防止高频刷新页面反复全量下载）
  const persisted = readPersistedCache()
  if (persisted) {
    _rodCache = persisted.rod
    _reelCache = persisted.reel
    _cacheTime = Date.now()

    if (Date.now() - _lastNetworkAt >= REFRESH_MIN_GAP) {
      _inflightPromise = fetchRodAndReelData()
      const inflight = _inflightPromise
      inflight.finally(() => {
        if (_inflightPromise === inflight) _inflightPromise = null
      }).catch(() => { /* 后台刷新失败不影响已返回的缓存数据 */ })
    }
    return cachedResult()
  }

  // 4. 无任何可用缓存：走网络（single-flight）
  _inflightPromise = fetchRodAndReelData()
  try {
    return await _inflightPromise
  } finally {
    _inflightPromise = null
  }
}
