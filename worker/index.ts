import { Hono } from 'hono'
import { cors } from 'hono/cors'

export interface Env {
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

app.get('/api/equipment', async (c) => {
  const { type } = c.req.query()
  let query = 'SELECT * FROM equipment'
  const params: any[] = []
  
  if (type) {
    query += ' WHERE equipmentType = ?'
    params.push(type)
  }
  
  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(result.results)
})

app.get('/api/equipment/search', async (c) => {
  const { q, type } = c.req.query()
  let query = 'SELECT * FROM equipment WHERE equipmentName LIKE ?'
  const params = [`%${q || ''}%`]
  
  if (type) {
    query += ' AND equipmentType = ?'
    params.push(type)
  }
  
  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(result.results)
})

app.get('/api/rods', async (c) => {
  const { category, q } = c.req.query()
  let query = 'SELECT * FROM rods'
  const params: any[] = []
  
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
  
  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(result.results)
})

app.get('/api/rods/categories', async (c) => {
  const result = await c.env.DB.prepare('SELECT DISTINCT category FROM rods WHERE category IS NOT NULL ORDER BY category').all()
  return c.json(result.results.map((r: any) => r.category))
})

app.get('/api/reels', async (c) => {
  const { category, q } = c.req.query()
  let query = 'SELECT * FROM reels'
  const params: any[] = []
  
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
  
  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(result.results)
})

app.get('/api/reels/categories', async (c) => {
  const result = await c.env.DB.prepare('SELECT DISTINCT category FROM reels WHERE category IS NOT NULL ORDER BY category').all()
  return c.json(result.results.map((r: any) => r.category))
})

app.get('/api/health', async (c) => {
  return c.json({ status: 'ok' })
})

export default app