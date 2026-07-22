import { buildSearchQuery, jsonResponse, errorResponse } from '../_common.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')
  
  try {
    const { query, params } = buildSearchQuery('reels', category, q)
    const result = await env.DB.prepare(query).bind(...params).all()
    return jsonResponse(result.results)
  } catch (error) {
    return errorResponse(error)
  }
}