import fs from 'fs'

const equipmentData = JSON.parse(fs.readFileSync('public/equipment.json', 'utf-8'))
const rodData = JSON.parse(fs.readFileSync('public/rod_compare.json', 'utf-8'))
const reelData = JSON.parse(fs.readFileSync('public/reel_compare.json', 'utf-8'))

function escapeValue(value) {
  if (value === null || value === undefined || value === '') return "''"
  if (typeof value === 'number') return value
  return "'" + String(value).replace(/'/g, "''") + "'"
}

function generateEquipmentInsert() {
  const lines = []
  for (const item of equipmentData) {
    lines.push(`INSERT OR IGNORE INTO equipment (equipmentType, equipmentName, lockTension, panelTension, price) VALUES (${escapeValue(item.equipmentType)}, ${escapeValue(item.equipmentName)}, ${escapeValue(item.lockTension || 0)}, ${escapeValue(item.panelTension || 0)}, ${escapeValue(item.price || 0)});`)
  }
  return lines.join('\n')
}

function generateRodsInsert() {
  const lines = []
  for (const item of rodData) {
    lines.push(`INSERT OR IGNORE INTO rods (equipmentName, equipmentType, category, subCategory, model, description, strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability, rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM) VALUES (${escapeValue(item.equipmentName)}, ${escapeValue(item.equipmentType)}, ${escapeValue(item.category)}, ${escapeValue(item.subCategory)}, ${escapeValue(item.model)}, ${escapeValue(item.description)}, ${escapeValue(item.strengthKg)}, ${escapeValue(item.form)}, ${escapeValue(item.testG || 0)}, ${escapeValue(item.sensitivity || 0)}, ${escapeValue(item.hardness)}, ${escapeValue(item.levelReq)}, ${escapeValue(item.structure)}, ${escapeValue(item.ability)}, ${escapeValue(item.rating)}, ${escapeValue(item.weightG)}, ${escapeValue(item.adaptWeight)}, ${escapeValue(item.adaptWeightG || 0)}, ${escapeValue(item.goldPrice)}, ${escapeValue(item.silverPrice)}, ${escapeValue(item.lengthM)});`)
  }
  return lines.join('\n')
}

function generateReelsInsert() {
  const lines = []
  for (const item of reelData) {
    lines.push(`INSERT OR IGNORE INTO reels (equipmentName, equipmentType, category, subCategory, model, description, transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar, size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar, levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar, goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant) VALUES (${escapeValue(item.equipmentName)}, ${escapeValue(item.equipmentType)}, ${escapeValue(item.category)}, ${escapeValue(item.subCategory)}, ${escapeValue(item.model)}, ${escapeValue(item.description)}, ${escapeValue(item.transmissionRatio)}, ${escapeValue(item.transmissionRatioStar)}, ${escapeValue(item.enginePower)}, ${escapeValue(item.lineSpeed)}, ${escapeValue(item.lineSpeedStar)}, ${escapeValue(item.size)}, ${escapeValue(item.form)}, ${escapeValue(item.frictionForce)}, ${escapeValue(item.frictionForceStar || 0)}, ${escapeValue(item.windingSpeed)}, ${escapeValue(item.test)}, ${escapeValue(item.testStar || 0)}, ${escapeValue(item.levelReq)}, ${escapeValue(item.spoolCapacity)}, ${escapeValue(item.obtainMethod)}, ${escapeValue(item.rating)}, ${escapeValue(item.adaptWeight)}, ${escapeValue(item.adaptWeightStar || 0)}, ${escapeValue(item.goldPrice)}, ${escapeValue(item.silverPrice)}, ${escapeValue(item.lockTension)}, ${escapeValue(item.lockTensionStar || 0)}, ${escapeValue(item.saltwaterResistant)});`)
  }
  return lines.join('\n')
}

const migrationContent = `-- Migration: Insert initial data from JSON files
-- Generated automatically by generate_migration.js

BEGIN TRANSACTION;

-- Insert equipment data
${generateEquipmentInsert()}

-- Insert rods data
${generateRodsInsert()}

-- Insert reels data
${generateReelsInsert()}

COMMIT;
`

if (!fs.existsSync('migrations')) {
  fs.mkdirSync('migrations')
}

fs.writeFileSync('migrations/0002_insert_data.sql', migrationContent)
console.log('Migration file generated: migrations/0002_insert_data.sql')
console.log(`- Equipment: ${equipmentData.length} records`)
console.log(`- Rods: ${rodData.length} records`)
console.log(`- Reels: ${reelData.length} records`)