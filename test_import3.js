async function testDuplicate() {
  const url = 'https://b7e96361.rf4-cxt.pages.dev/api/import_data'
  
  console.log('=== 测试重复数据 ===')
  const duplicateData = {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateData)
    })
    
    console.log('Status:', response.status)
    const text = await response.text()
    console.log('Response:', text)
  } catch (error) {
    console.error('Error:', error)
  }
  
  console.log('\n=== 测试密码错误 ===')
  const wrongPasswordData = {
    password: 'wrongpassword',
    type: '鱼竿',
    data: [{
      equipmentName: 'New Rod',
      model: 'TEST-002',
      category: '测试',
      subCategory: '测试',
      strengthKg: '6kg'
    }]
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrongPasswordData)
    })
    
    console.log('Status:', response.status)
    const text = await response.text()
    console.log('Response:', text)
  } catch (error) {
    console.error('Error:', error)
  }
}

testDuplicate()