import { Hono } from 'hono'
import { cors } from 'hono/cors'

export interface Env {
  DB: import('@cloudflare/workers-types').D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors())

async function initDatabase(db: D1Database) {
  try {
    const countResult = await db.prepare('SELECT COUNT(*) as count FROM equipment').first()
    if (countResult && (countResult as any).count > 0) {
      return
    }
  } catch {
  }

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipmentType TEXT NOT NULL,
      equipmentName TEXT NOT NULL,
      lockTension REAL DEFAULT 0,
      panelTension REAL DEFAULT 0,
      price REAL DEFAULT 0,
      UNIQUE(equipmentType, equipmentName)
    )
  `).run()

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS rods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipmentName TEXT NOT NULL,
      equipmentType TEXT DEFAULT '鱼竿',
      category TEXT,
      subCategory TEXT,
      model TEXT NOT NULL,
      description TEXT,
      strengthKg TEXT,
      form TEXT,
      testG INTEGER DEFAULT 0,
      sensitivity INTEGER DEFAULT 0,
      hardness TEXT,
      levelReq TEXT,
      structure TEXT,
      ability TEXT,
      rating TEXT,
      weightG TEXT,
      adaptWeight TEXT,
      adaptWeightG INTEGER DEFAULT 0,
      goldPrice TEXT,
      silverPrice TEXT,
      lengthM TEXT,
      UNIQUE(model)
    )
  `).run()

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS reels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipmentName TEXT NOT NULL,
      equipmentType TEXT DEFAULT '渔轮',
      category TEXT,
      subCategory TEXT,
      model TEXT NOT NULL,
      description TEXT,
      transmissionRatio TEXT,
      transmissionRatioStar TEXT,
      enginePower TEXT,
      lineSpeed TEXT,
      lineSpeedStar TEXT,
      size TEXT,
      form TEXT,
      frictionForce TEXT,
      frictionForceStar INTEGER DEFAULT 0,
      windingSpeed TEXT,
      test TEXT,
      testStar INTEGER DEFAULT 0,
      levelReq TEXT,
      spoolCapacity TEXT,
      obtainMethod TEXT,
      rating TEXT,
      adaptWeight TEXT,
      adaptWeightStar INTEGER DEFAULT 0,
      goldPrice TEXT,
      silverPrice TEXT,
      lockTension TEXT,
      lockTensionStar INTEGER DEFAULT 0,
      saltwaterResistant TEXT,
      UNIQUE(model)
    )
  `).run()

  const equipmentResponse = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/equipment.json')
  const equipmentData = await equipmentResponse.json()
  for (const item of equipmentData) {
    await db.prepare(
      'INSERT OR IGNORE INTO equipment (equipmentType, equipmentName, lockTension, panelTension, price) VALUES (?, ?, ?, ?, ?)'
    ).bind(item.equipmentType, item.equipmentName, item.lockTension || 0, item.panelTension || 0, item.price || 0).run()
  }

  const rodsResponse = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/rod_compare.json')
  const rodsData = await rodsResponse.json()
  for (const item of rodsData) {
    await db.prepare(
      'INSERT OR IGNORE INTO rods (equipmentName, equipmentType, category, subCategory, model, description, strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability, rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      item.equipmentName, item.equipmentType, item.category, item.subCategory, item.model, item.description,
      item.strengthKg, item.form, item.testG || 0, item.sensitivity || 0, item.hardness, item.levelReq,
      item.structure, item.ability, item.rating, item.weightG, item.adaptWeight, item.adaptWeightG || 0,
      item.goldPrice, item.silverPrice, item.lengthM
    ).run()
  }

  const reelsResponse = await fetch('https://raw.githubusercontent.com/leihud/RF4/main/public/reel_compare.json')
  const reelsData = await reelsResponse.json()
  for (const item of reelsData) {
    await db.prepare(
      'INSERT OR IGNORE INTO reels (equipmentName, equipmentType, category, subCategory, model, description, transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar, size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar, levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar, goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      item.equipmentName, item.equipmentType, item.category, item.subCategory, item.model, item.description,
      item.transmissionRatio, item.transmissionRatioStar, item.enginePower, item.lineSpeed, item.lineSpeedStar,
      item.size, item.form, item.frictionForce, item.frictionForceStar || 0, item.windingSpeed, item.test,
      item.testStar || 0, item.levelReq, item.spoolCapacity, item.obtainMethod, item.rating, item.adaptWeight,
      item.adaptWeightStar || 0, item.goldPrice, item.silverPrice, item.lockTension, item.lockTensionStar || 0,
      item.saltwaterResistant
    ).run()
  }
}

app.get('/api/equipment', async (c) => {
  await initDatabase(c.env.DB)
  
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
  await initDatabase(c.env.DB)
  
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
  await initDatabase(c.env.DB)
  
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
  await initDatabase(c.env.DB)
  
  const result = await c.env.DB.prepare('SELECT DISTINCT category FROM rods WHERE category IS NOT NULL ORDER BY category').all()
  return c.json(result.results.map((r: any) => r.category))
})

app.get('/api/reels', async (c) => {
  await initDatabase(c.env.DB)
  
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
  await initDatabase(c.env.DB)
  
  const result = await c.env.DB.prepare('SELECT DISTINCT category FROM reels WHERE category IS NOT NULL ORDER BY category').all()
  return c.json(result.results.map((r: any) => r.category))
})

app.get('/api/health', async (c) => {
  await initDatabase(c.env.DB)
  return c.json({ status: 'ok' })
})

app.get('*', async (c) => {
  const path = c.req.path
  const fileMap: Record<string, string> = {
    '/': '/index.html',
    '/compare': '/index.html'
  }
  
  const filePath = fileMap[path] || path
  const ext = filePath.split('.').pop()?.toLowerCase()
  
  const contentTypes: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    js: 'application/javascript',
    css: 'text/css',
    png: 'image/png',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    json: 'application/json'
  }
  
  const contentType = contentTypes[ext || ''] || 'text/plain'
  
  try {
    const response = await fetch(`https://raw.githubusercontent.com/leihud/RF4/main/dist${filePath}`)
    if (!response.ok) {
      return c.html('<h1>404 Not Found</h1>', 404)
    }
    const body = await response.arrayBuffer()
    return new Response(body, {
      headers: { 'Content-Type': contentType }
    })
  } catch {
    return c.html('<h1>500 Internal Server Error</h1>', 500)
  }
})

export default app