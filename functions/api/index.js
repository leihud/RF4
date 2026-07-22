import { Hono } from 'hono'

const app = new Hono()

app.get('/equipment', async (c) => {
  const { type } = c.req.query()
  const { DB } = c.env
  
  try {
    let query = 'SELECT * FROM equipment'
    const params = []
    
    if (type) {
      query += ' WHERE equipmentType = ?'
      params.push(type)
    }
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/equipment/search', async (c) => {
  const { q, type } = c.req.query()
  const { DB } = c.env
  
  try {
    let query = 'SELECT * FROM equipment WHERE equipmentName LIKE ?'
    const params = [`%${q || ''}%`]
    
    if (type) {
      query += ' AND equipmentType = ?'
      params.push(type)
    }
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/rods', async (c) => {
  const { category, q } = c.req.query()
  const { DB } = c.env
  
  try {
    let query = 'SELECT * FROM rods'
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
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/rods/categories', async (c) => {
  const { DB } = c.env
  
  try {
    const result = await DB.prepare('SELECT DISTINCT category FROM rods WHERE category IS NOT NULL ORDER BY category').all()
    return c.json(result.results.map(r => r.category))
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/reels', async (c) => {
  const { category, q } = c.req.query()
  const { DB } = c.env
  
  try {
    let query = 'SELECT * FROM reels'
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
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/reels/categories', async (c) => {
  const { DB } = c.env
  
  try {
    const result = await DB.prepare('SELECT DISTINCT category FROM reels WHERE category IS NOT NULL ORDER BY category').all()
    return c.json(result.results.map(r => r.category))
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/health', async (c) => {
  const { DB } = c.env
  
  try {
    if (!DB) {
      return c.json({ status: 'error', message: 'DB not available' }, 500)
    }
    
    const result = await DB.prepare('SELECT COUNT(*) FROM equipment').all()
    return c.json({ 
      status: 'ok', 
      equipmentCount: result.results[0]['COUNT(*)'] 
    })
  } catch (error) {
    return c.json({ status: 'error', message: error.message }, 500)
  }
})

export default app
