export async function onRequestGet(context) {
  const { env } = context
  
  const result = await env.DB.prepare('SELECT DISTINCT category FROM reels WHERE category IS NOT NULL ORDER BY category').all()
  return new Response(JSON.stringify(result.results.map(r => r.category)), {
    headers: { 'Content-Type': 'application/json' }
  })
}