import { jsonResponse } from './_shared.js'

/**
 * 线材参数库查询：返回全部线材（数据量小，一次全量返回）
 */
export async function onRequestGet(context) {
  try {
    const result = await context.env.DB.prepare('SELECT * FROM lines ORDER BY id').all()
    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('读取线材库失败:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}
