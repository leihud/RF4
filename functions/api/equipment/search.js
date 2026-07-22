import { buildEquipmentSearchQuery, jsonResponse, errorResponse } from '../_common.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  const type = url.searchParams.get('type')
  
  try {
    const { query, params } = buildEquipmentSearchQuery(q, type)
    const result = await env.DB.prepare(query).bind(...params).all()
    return jsonResponse(result.results)
  } catch (error) {
    return errorResponse(error)
  }
}