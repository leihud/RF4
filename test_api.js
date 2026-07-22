async function testApi() {
  const url = 'https://a5b0d235.rf4-cxt.pages.dev/api/rods'
  
  try {
    const response = await fetch(url)
    const text = await response.text()
    console.log('Status:', response.status)
    console.log('Response:', text.substring(0, 500))
  } catch (error) {
    console.error('Error:', error)
  }
}

testApi()