import fs from 'fs'

const equipmentData = JSON.parse(fs.readFileSync('public/equipment.json', 'utf-8'))
const rodData = JSON.parse(fs.readFileSync('public/rod_compare.json', 'utf-8'))
const reelData = JSON.parse(fs.readFileSync('public/reel_compare.json', 'utf-8'))

function generateEquipmentSQL(data) {
  const chunks = []
  let currentChunk = ''
  
  data.forEach((item, index) => {
    const sql = `INSERT OR IGNORE INTO equipment (equipmentType, equipmentName, lockTension, panelTension, price) VALUES ('${item.equipmentType}', '${item.equipmentName.replace(/'/g, "''")}', ${item.lockTension || 0}, ${item.panelTension || 0}, ${item.price || 0});\n`
    
    if (currentChunk.length + sql.length > 50000) {
      chunks.push(currentChunk)
      currentChunk = ''
    }
    currentChunk += sql
  })
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

function generateRodsSQL(data) {
  const chunks = []
  let currentChunk = ''
  
  data.forEach((item, index) => {
    const sql = `INSERT OR IGNORE INTO rods (equipmentName, equipmentType, category, subCategory, model, description, strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability, rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM) VALUES ('${item.equipmentName.replace(/'/g, "''")}', '${item.equipmentType || ''}', '${item.category || ''}', '${item.subCategory || ''}', '${item.model.replace(/'/g, "''")}', '${item.description || ''}', '${item.strengthKg || ''}', '${item.form || ''}', ${item.testG || 0}, ${item.sensitivity || 0}, '${item.hardness || ''}', '${item.levelReq || ''}', '${item.structure || ''}', '${item.ability || ''}', '${item.rating || ''}', '${item.weightG || ''}', '${item.adaptWeight || ''}', ${item.adaptWeightG || 0}, '${item.goldPrice || ''}', '${item.silverPrice || ''}', '${item.lengthM || ''}');\n`
    
    if (currentChunk.length + sql.length > 50000) {
      chunks.push(currentChunk)
      currentChunk = ''
    }
    currentChunk += sql
  })
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

function generateReelsSQL(data) {
  const chunks = []
  let currentChunk = ''
  
  data.forEach((item, index) => {
    const sql = `INSERT OR IGNORE INTO reels (equipmentName, equipmentType, category, subCategory, model, description, transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar, size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar, levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar, goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant) VALUES ('${item.equipmentName.replace(/'/g, "''")}', '${item.equipmentType || ''}', '${item.category || ''}', '${item.subCategory || ''}', '${item.model.replace(/'/g, "''")}', '${item.description || ''}', '${item.transmissionRatio || ''}', ${item.transmissionRatioStar || 0}, '${item.enginePower || ''}', '${item.lineSpeed || ''}', ${item.lineSpeedStar || 0}, '${item.size || ''}', '${item.form || ''}', '${item.frictionForce || ''}', ${item.frictionForceStar || 0}, '${item.windingSpeed || ''}', '${item.test || ''}', ${item.testStar || 0}, '${item.levelReq || ''}', '${item.spoolCapacity || ''}', '${item.obtainMethod || ''}', '${item.rating || ''}', '${item.adaptWeight || ''}', ${item.adaptWeightStar || 0}, '${item.goldPrice || ''}', '${item.silverPrice || ''}', '${item.lockTension || ''}', ${item.lockTensionStar || 0}, '${item.saltwaterResistant || ''}');\n`
    
    if (currentChunk.length + sql.length > 50000) {
      chunks.push(currentChunk)
      currentChunk = ''
    }
    currentChunk += sql
  })
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

const equipmentChunks = generateEquipmentSQL(equipmentData)
const rodChunks = generateRodsSQL(rodData)
const reelChunks = generateReelsSQL(reelData)

console.log(`Equipment chunks: ${equipmentChunks.length}`)
console.log(`Rod chunks: ${rodChunks.length}`)
console.log(`Reel chunks: ${reelChunks.length}`)

fs.mkdirSync('migrations/chunks', { recursive: true })

equipmentChunks.forEach((chunk, index) => {
  fs.writeFileSync(`migrations/chunks/0002_equipment_${index + 1}.sql`, chunk)
})

rodChunks.forEach((chunk, index) => {
  fs.writeFileSync(`migrations/chunks/0002_rods_${index + 1}.sql`, chunk)
})

reelChunks.forEach((chunk, index) => {
  fs.writeFileSync(`migrations/chunks/0002_reels_${index + 1}.sql`, chunk)
})

console.log('✓ Chunks generated successfully!')