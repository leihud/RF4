import { buildEquipmentQuery, jsonResponse, errorResponse } from './_common.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  
  try {
    const { query, params } = buildEquipmentQuery(type)
    const result = await env.DB.prepare(query).bind(...params).all()
    return jsonResponse(result.results)
  } catch (error) {
    return errorResponse(error)
  }
}