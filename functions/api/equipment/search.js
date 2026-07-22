export async function onRequestGet(context) {
  const { request } = context
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  const type = url.searchParams.get('type')
  
  const response = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/equipment.json')
  let data = await response.json()
  
  data = data.filter(item => {
    const matchName = item.equipmentName && item.equipmentName.includes(q)
    if (type) {
      return matchName && item.equipmentType === type
    }
    return matchName
  })
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}