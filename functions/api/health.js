import { jsonResponse, errorResponse } from './_common.js'

export async function onRequestGet(context) {
  const { env } = context
  
  try {
    const result = await env.DB.prepare('SELECT COUNT(*) FROM equipment').all()
    return jsonResponse({ 
      status: 'ok', 
      equipmentCount: result.results[0]['COUNT(*)'] 
    })
  } catch (error) {
    return errorResponse(error)
  }
}