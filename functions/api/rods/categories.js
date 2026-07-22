import { buildCategoriesQuery, jsonResponse, errorResponse } from '../../_common.js'

export async function onRequestGet(context) {
  const { env } = context
  
  try {
    const query = buildCategoriesQuery('rods')
    const result = await env.DB.prepare(query).all()
    return jsonResponse(result.results.map(r => r.category))
  } catch (error) {
    return errorResponse(error)
  }
}