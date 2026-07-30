import { getRatingAlias } from '../constants/equipment.js'
import { sanitizeEquipmentList } from './sanitize.js'

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
    const response = await fetch(url)

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

    console.log(`装备数据加载成功 [${apiPath}]:`, data.length, '条')
    return { data, error: false }
  } catch (error) {
    console.error(`加载装备数据失败 [${apiPath}]:`, error)
    return { data: [], error: true }
  }
}

/**
 * 并行加载鱼竿和渔轮数据（对比页使用）。
 * @returns {Promise<{ rodData: Array, reelData: Array, error: boolean }>}
 */
export async function loadRodAndReelData() {
  const [rodResult, reelResult] = await Promise.all([
    loadEquipmentData('/api/rods', {
      enrich: (item) => ({ panelTension: safeExtractNumber(item.strengthKg) || 0 })
    }),
    loadEquipmentData('/api/reels', {
      enrich: (item) => ({
        panelTension: safeExtractNumber(item.frictionForce) || safeExtractNumber(item.lockTension) || 0
      })
    })
  ])

  if (rodResult.error || reelResult.error) {
    return { rodData: [], reelData: [], error: true }
  }

  console.log(
    '装备对比数据加载成功:',
    rodResult.data.length, '条鱼竿,',
    reelResult.data.length, '条渔轮'
  )

  return {
    rodData: rodResult.data,
    reelData: reelResult.data,
    error: false
  }
}

/**
 * 安全提取数值：对象/NaN/非数值字符串兜底为 0
 */
function safeExtractNumber(str) {
  if (str == null) return 0
  if (typeof str === 'object') return 0
  const cleaned = String(str).replace(/,/g, '')
  const match = cleaned.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}
