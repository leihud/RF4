import { getRatingAlias } from '../constants/equipment.js'
import { sanitizeEquipmentList } from './sanitize.js'
import { parsePrice } from './display.js'

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

    return { data, error: false }
  } catch (error) {
    console.error(`加载装备数据失败 [${apiPath}]:`, error)
    return { data: [], error: true }
  }
}

/**
 * 并行加载鱼竿和渔轮数据（对比页使用）。
 * 使用 Promise.allSettled 容错：单一接口失败时仍返回另一份数据，
 * 仅当两者都失败才报 error，避免一个接口抖动导致整页无数据。
 * @returns {Promise<{ rodData: Array, reelData: Array, error: boolean }>}
 */
export async function loadRodAndReelData() {
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

  return {
    rodData: rod.data,
    reelData: reel.data,
    error: rod.error && reel.error
  }
}

