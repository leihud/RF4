import { jsonResponse, errorResponse } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context

  try {
    const db = env.DB
    const result = await db.prepare('SELECT name, display_name, difficulty, min_tension, max_tension, description FROM fish_species ORDER BY display_name').all()
    
    return jsonResponse({
      success: true,
      data: result.results || []
    })
  } catch (error) {
    return errorResponse(error)
  }
}
