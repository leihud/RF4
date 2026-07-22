export async function onRequestGet(context) {
  const { env } = context
  
  try {
    const result = await env.DB.prepare('SELECT DISTINCT category FROM rods WHERE category IS NOT NULL ORDER BY category').all()
    return new Response(JSON.stringify(result.results.map(r => r.category)), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}