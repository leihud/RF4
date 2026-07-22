import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'

const app = express()
const port = 8787

app.use(cors())
app.use(express.json())

const equipmentData = JSON.parse(fs.readFileSync(path.join(path.dirname(import.meta.url).replace('file:///', ''), '../public/equipment.json'), 'utf-8'))
const rodData = JSON.parse(fs.readFileSync(path.join(path.dirname(import.meta.url).replace('file:///', ''), '../public/rod_compare.json'), 'utf-8'))
const reelData = JSON.parse(fs.readFileSync(path.join(path.dirname(import.meta.url).replace('file:///', ''), '../public/reel_compare.json'), 'utf-8'))

app.get('/api/equipment', async (req, res) => {
  const { type } = req.query
  let data = equipmentData
  if (type) {
    data = data.filter(item => item.equipmentType === type)
  }
  res.json(data)
})

app.get('/api/equipment/search', async (req, res) => {
  const { q, type } = req.query
  let data = equipmentData
  if (q) {
    data = data.filter(item => 
      item.equipmentName.toLowerCase().includes(q.toLowerCase())
    )
  }
  if (type) {
    data = data.filter(item => item.equipmentType === type)
  }
  res.json(data)
})

app.get('/api/rods', async (req, res) => {
  const { category, q } = req.query
  let data = rodData
  if (category) {
    data = data.filter(item => item.category === category)
  }
  if (q) {
    data = data.filter(item => 
      item.model.toLowerCase().includes(q.toLowerCase()) ||
      item.equipmentName.toLowerCase().includes(q.toLowerCase())
    )
  }
  res.json(data)
})

app.get('/api/rods/categories', async (req, res) => {
  const categories = [...new Set(rodData.map(item => item.category).filter(Boolean))].sort()
  res.json(categories)
})

app.get('/api/reels', async (req, res) => {
  const { category, q } = req.query
  let data = reelData
  if (category) {
    data = data.filter(item => item.category === category)
  }
  if (q) {
    data = data.filter(item => 
      item.model.toLowerCase().includes(q.toLowerCase()) ||
      item.equipmentName.toLowerCase().includes(q.toLowerCase())
    )
  }
  res.json(data)
})

app.get('/api/reels/categories', async (req, res) => {
  const categories = [...new Set(reelData.map(item => item.category).filter(Boolean))].sort()
  res.json(categories)
})

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`)
})