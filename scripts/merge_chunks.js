import fs from 'fs'
import path from 'path'

const chunksDir = path.join(process.cwd(), 'migrations', 'chunks')
const outputDir = path.join(process.cwd(), 'migrations')

const equipmentFiles = []
const rodsFiles = []
const reelsFiles = []

fs.readdirSync(chunksDir).forEach(file => {
  if (file.startsWith('0002_equipment_')) {
    equipmentFiles.push(file)
  } else if (file.startsWith('0002_rods_')) {
    rodsFiles.push(file)
  } else if (file.startsWith('0002_reels_')) {
    reelsFiles.push(file)
  }
})

equipmentFiles.sort((a, b) => parseInt(a.split('_')[2]) - parseInt(b.split('_')[2]))
rodsFiles.sort((a, b) => parseInt(a.split('_')[2]) - parseInt(b.split('_')[2]))
reelsFiles.sort((a, b) => parseInt(a.split('_')[2]) - parseInt(b.split('_')[2]))

let content = '-- Migration: Insert initial data from JSON files\n-- Generated automatically by merge_chunks.js\n\nBEGIN TRANSACTION;\n\n-- Insert equipment data\n'

equipmentFiles.forEach(file => {
  const filePath = path.join(chunksDir, file)
  content += fs.readFileSync(filePath, 'utf-8') + '\n'
})

content += '\n-- Insert rods data\n'

rodsFiles.forEach(file => {
  const filePath = path.join(chunksDir, file)
  content += fs.readFileSync(filePath, 'utf-8') + '\n'
})

content += '\n-- Insert reels data\n'

reelsFiles.forEach(file => {
  const filePath = path.join(chunksDir, file)
  content += fs.readFileSync(filePath, 'utf-8') + '\n'
})

content += '\nCOMMIT;'

fs.writeFileSync(path.join(outputDir, '0002_insert_data.sql'), content)

console.log('✓ Migration file generated: migrations/0002_insert_data.sql')
console.log(`- Equipment chunks: ${equipmentFiles.length}`)
console.log(`- Rods chunks: ${rodsFiles.length}`)
console.log(`- Reels chunks: ${reelsFiles.length}`)