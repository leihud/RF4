/**
 * 装备方案 URL 编码/解码：将当前计算器状态压缩为短 URL 参数，
 * 实现方案保存为书签或分享给他人，无需后端存储。
 *
 * 编码字段：竿型号、轮型号、竿磨损、轮磨损、摩擦值、主线拉力/磨损、引线拉力/磨损、计算规则
 */

const PRESET_PREFIX = 'p='

/**
 * 将计算器状态编码为 URL 查询字符串片段。
 * @param {object} state
 * @returns {string} 如 "p=xxx"
 */
export function encodePreset(state) {
  const payload = {
    r: state.rodModel || '',
    l: state.reelModel || '',
    rw: state.rodWear || 0,
    lw: state.reelWear || 0,
    f: state.friction || 0,
    ml: state.mainLineTension || 0,
    mw: state.mainLineWear || 0,
    ll: state.leaderLineTension || 0,
    lw2: state.leaderLineWear || 0,
    rule: state.calculationRule || 'guide'
  }

  // 移除默认值以缩短 URL
  const compact = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v !== 0 && v !== '' && v !== 'guide') {
      compact[k] = v
    }
  }

  if (Object.keys(compact).length === 0) return ''

  const json = JSON.stringify(compact)
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${PRESET_PREFIX}${encoded}`
}

/**
 * 从 URL 查询字符串解码装备方案。
 * @param {string} queryString  URL 查询字符串（含 ? 或不含均可）
 * @returns {object|null} 解码后的状态，无 preset 时返回 null
 */
export function decodePreset(queryString) {
  if (!queryString) return null

  const qs = queryString.startsWith('?') ? queryString.slice(1) : queryString
  const params = new URLSearchParams(qs)
  const encoded = params.get('p')

  if (!encoded) return null

  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(padded)))
    const compact = JSON.parse(json)

    return {
      rodModel: compact.r || '',
      reelModel: compact.l || '',
      rodWear: compact.rw || 0,
      reelWear: compact.lw || 0,
      friction: compact.f || 0,
      mainLineTension: compact.ml || 0,
      mainLineWear: compact.mw || 0,
      leaderLineTension: compact.ll || 0,
      leaderLineWear: compact.lw2 || 0,
      calculationRule: compact.rule || 'guide'
    }
  } catch (error) {
    console.error('解码装备方案失败:', error)
    return null
  }
}

/**
 * 生成完整的分享 URL。
 * @param {object} state 计算器状态
 * @returns {string} 完整 URL
 */
export function getShareUrl(state) {
  const preset = encodePreset(state)
  if (!preset) return window.location.origin + window.location.pathname
  return `${window.location.origin}${window.location.pathname}?${preset}`
}
