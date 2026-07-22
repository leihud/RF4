export async function onRequestGet(context) {
  const { request } = context
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q') || ''
  
  const response = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/reel_compare.json')
  let data = await response.json()
  
  if (category) {
    data = data.filter(item => item.category === category)
  }
  
  if (q) {
    data = data.filter(item => {
      const matchModel = item.model && item.model.includes(q)
      const matchName = item.equipmentName && item.equipmentName.includes(q)
      return matchModel || matchName
    })
  }
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}