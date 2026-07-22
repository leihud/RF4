export function buildSearchQuery(tableName, category, q) {
  let query = `SELECT * FROM ${tableName}`
  const params = []
  
  if (category) {
    query += ' WHERE category = ?'
    params.push(category)
  }
  
  if (q && !category) {
    query += ' WHERE model LIKE ? OR equipmentName LIKE ?'
    params.push(`%${q}%`, `%${q}%`)
  } else if (q && category) {
    query += ' AND (model LIKE ? OR equipmentName LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  
  return { query, params }
}

export function buildCategoriesQuery(tableName) {
  return `SELECT DISTINCT category FROM ${tableName} WHERE category IS NOT NULL ORDER BY category`
}

export function buildEquipmentQuery(type) {
  let query = 'SELECT * FROM equipment'
  const params = []
  
  if (type) {
    query += ' WHERE equipmentType = ?'
    params.push(type)
  }
  
  return { query, params }
}

export function buildEquipmentSearchQuery(q, type) {
  let query = 'SELECT * FROM equipment WHERE equipmentName LIKE ?'
  const params = [`%${q || ''}%`]
  
  if (type) {
    query += ' AND equipmentType = ?'
    params.push(type)
  }
  
  return { query, params }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export function errorResponse(error) {
  return jsonResponse({ error: error.message }, 500)
}