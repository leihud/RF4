async function testImport() {
  const url = 'https://a5b0d235.rf4-cxt.pages.dev/api/import_data'
  const data = {
    password: 'rf4password',
    type: '鱼竿',
    data: [{
      equipmentName: 'Test Rod',
      model: 'TEST-001',
      category: '测试',
      subCategory: '测试',
      strengthKg: '5kg'
    }]
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    console.log('Response:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error)
  }
}

testImport()