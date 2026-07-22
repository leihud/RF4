export async function onRequestGet(context) {
  const response = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/rod_compare.json')
  const data = await response.json()
  
  const categories = [...new Set(data.filter(item => item.category).map(item => item.category))].sort()
  
  return new Response(JSON.stringify(categories), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}