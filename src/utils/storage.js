/**
 * localStorage 统一存取封装。
 *
 * 背景：页面多处散落 try/catch + JSON.stringify/parse 的存储样板，且 key 均为裸字符串。
 * 统一收敛到本模块，集中 key 清单、容错（隐私模式/超配额/SSR 下静默降级）与序列化。
 * 存储不可用时一律静默降级，不影响主流程。
 */

/** 业务存储 key 清单（命名 `xxx_v1` 便于后续按版本迁移） */
export const STORAGE_KEYS = {
  /** 计算器状态 */
  calcState: 'calc_state_v1',
  /** 对比列表 */
  compareList: 'compare_list_v1',
  /** 方案列表筛选状态 */
  buildsFilters: 'builds_filters_v1',
  /** 价值统计清单 */
  valueList: 'value_list_v1',
  /** 本地点赞的方案 id 集合 */
  likedIds: 'build_liked_ids',
  /** 客户端指纹（点赞去重） */
  clientId: 'rf4_client_id',
  /** 亮/暗主题（原始文本 'light'/'dark'） */
  theme: 'rf4_theme',
  /** 用户"我的提交"本地索引 */
  mineBuilds: 'rf4_my_submissions'
}

function getStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch (_) {
    return null
  }
}

/**
 * 读取并反序列化 JSON 存储值；缺失/损坏/存储不可用时返回 fallback。
 * @param {string} key
 * @param {*} [fallback=null]
 */
export function readStorage(key, fallback = null) {
  const storage = getStorage()
  if (!storage) return fallback
  try {
    const raw = storage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch (_) {
    return fallback
  }
}

/** 序列化并写入 JSON 存储值（存储不可用时静默忽略） */
export function writeStorage(key, value) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (_) { /* 隐私模式/超配额：静默降级 */ }
}

/**
 * 读取原始文本存储值（不经过 JSON 序列化，供 'light'/'dark'、客户端指纹等使用）。
 * 与 writeText 配套，兼容历史非 JSON 数据。
 */
export function readText(key, fallback = null) {
  const storage = getStorage()
  if (!storage) return fallback
  try {
    const value = storage.getItem(key)
    return value === null ? fallback : value
  } catch (_) {
    return fallback
  }
}

/** 写入原始文本存储值（存储不可用时静默忽略） */
export function writeText(key, value) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(key, value)
  } catch (_) { /* 存储不可用：静默降级 */ }
}
