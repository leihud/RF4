import { jsonResponse } from './_shared.js'

/**
 * 元信息查询：返回 meta 表键值对（如最后导入时间），供前端展示数据新鲜度
 */
export async function onRequestGet(context) {
  try {
    const result = await context.env.DB.prepare('SELECT key, value, updated_at FROM meta').all()
    const data = {}
    for (const row of result.results || []) {
      data[row.key] = row.value
    }
    return jsonResponse({ success: true, data })
  } catch (error) {
    console.error('读取元信息失败:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}
