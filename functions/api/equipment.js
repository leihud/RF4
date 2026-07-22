export async function onRequestGet(context) {
  const { request } = context
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  
  const response = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/equipment.json')
  let data = await response.json()
  
  if (type) {
    data = data.filter(item => item.equipmentType === type)
  }
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}