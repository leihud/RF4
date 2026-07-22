import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function escapeStr(str) {
  return (str || '').replace(/'/g, "''")
}

function toSqlValue(value) {
  if (value === null || value === undefined || value === '') return "''"
  if (typeof value === 'number') return value
  return `'${escapeStr(value)}'`
}

async function generateAndImportRods() {
  console.log('正在生成并导入鱼竿数据...')
  const data = JSON.parse(fs.readFileSync('./public/rod_compare.json', 'utf8'))
  
  let sql = ''
  
  for (const item of data) {
    sql += `INSERT OR REPLACE INTO rods (equipmentName, equipmentType, category, subCategory, model, description, strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability, rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM) VALUES (${toSqlValue(item.equipmentName)}, ${toSqlValue(item.equipmentType || '鱼竿')}, ${toSqlValue(item.category)}, ${toSqlValue(item.subCategory)}, ${toSqlValue(item.model)}, ${toSqlValue(item.description)}, ${toSqlValue(item.strengthKg)}, ${toSqlValue(item.form)}, ${toSqlValue(item.testG)}, ${toSqlValue(item.sensitivity)}, ${toSqlValue(item.hardness)}, ${toSqlValue(item.levelReq)}, ${toSqlValue(item.structure)}, ${toSqlValue(item.ability)}, ${toSqlValue(item.rating)}, ${toSqlValue(item.weightG)}, ${toSqlValue(item.adaptWeight)}, ${toSqlValue(item.adaptWeightG)}, ${toSqlValue(item.goldPrice)}, ${toSqlValue(item.silverPrice)}, ${toSqlValue(item.lengthM)});\n`
  }
  
  fs.writeFileSync('./migrations/0002_insert_rods.sql', sql)
  console.log('鱼竿 SQL 文件生成完成')
  
  const { stdout, stderr } = await execAsync('npx wrangler d1 execute rf4 --remote --file migrations/0002_insert_rods.sql')
  console.log('鱼竿导入完成')
  if (stderr) console.log(stderr)
}

async function generateAndImportReels() {
  console.log('正在生成并导入渔轮数据...')
  const data = JSON.parse(fs.readFileSync('./public/reel_compare.json', 'utf8'))
  
  let sql = ''
  
  for (const item of data) {
    sql += `INSERT OR REPLACE INTO reels (equipmentName, equipmentType, category, subCategory, model, description, transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar, size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar, levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar, goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant) VALUES (${toSqlValue(item.equipmentName)}, ${toSqlValue(item.equipmentType || '渔轮')}, ${toSqlValue(item.category)}, ${toSqlValue(item.subCategory)}, ${toSqlValue(item.model)}, ${toSqlValue(item.description)}, ${toSqlValue(item.transmissionRatio)}, ${toSqlValue(item.transmissionRatioStar)}, ${toSqlValue(item.enginePower)}, ${toSqlValue(item.lineSpeed)}, ${toSqlValue(item.lineSpeedStar)}, ${toSqlValue(item.size)}, ${toSqlValue(item.form)}, ${toSqlValue(item.frictionForce)}, ${toSqlValue(item.frictionForceStar)}, ${toSqlValue(item.windingSpeed)}, ${toSqlValue(item.test)}, ${toSqlValue(item.testStar)}, ${toSqlValue(item.levelReq)}, ${toSqlValue(item.spoolCapacity)}, ${toSqlValue(item.obtainMethod)}, ${toSqlValue(item.rating)}, ${toSqlValue(item.adaptWeight)}, ${toSqlValue(item.adaptWeightStar)}, ${toSqlValue(item.goldPrice)}, ${toSqlValue(item.silverPrice)}, ${toSqlValue(item.lockTension)}, ${toSqlValue(item.lockTensionStar)}, ${toSqlValue(item.saltwaterResistant)});\n`
  }
  
  fs.writeFileSync('./migrations/0003_insert_reels.sql', sql)
  console.log('渔轮 SQL 文件生成完成')
  
  const { stdout, stderr } = await execAsync('npx wrangler d1 execute rf4 --remote --file migrations/0003_insert_reels.sql')
  console.log('渔轮导入完成')
  if (stderr) console.log(stderr)
}

async function main() {
  try {
    await generateAndImportRods()
    await generateAndImportReels()
    console.log('\n🎉 所有数据导入完成！')
  } catch (error) {
    console.error('❌ 导入失败:', error)
    process.exit(1)
  }
}

main()