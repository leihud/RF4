import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function extractNumber(str) {
  if (!str) return 0
  const match = String(str).match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

async function runQuery(sql) {
  const escapedSql = sql.replace(/"/g, '\\"').replace(/'/g, "\\'")
  const cmd = `npx wrangler d1 execute rf4 --remote --command "${escapedSql}"`
  await execAsync(cmd)
}

async function importRods() {
  console.log('正在导入鱼竿数据...')
  const data = JSON.parse(fs.readFileSync('./public/rod_compare.json', 'utf8'))
  
  await runQuery('DELETE FROM rods')
  
  const batchSize = 50
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      const sql = `INSERT INTO rods (equipmentName, equipmentType, category, subCategory, model, description, strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability, rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM) VALUES ("${item.equipmentName || ''}", "${item.equipmentType || '鱼竿'}", "${item.category || ''}", "${item.subCategory || ''}", "${item.model || ''}", "${(item.description || '').replace(/"/g, "'")}", "${item.strengthKg || ''}", "${item.form || ''}", ${item.testG || 0}, ${item.sensitivity || 0}, "${item.hardness || ''}", "${item.levelReq || ''}", "${item.structure || ''}", "${item.ability || ''}", "${item.rating || ''}", "${item.weightG || ''}", "${item.adaptWeight || ''}", ${item.adaptWeightG || 0}, "${item.goldPrice || ''}", "${item.silverPrice || ''}", "${item.lengthM || ''}")`
      await runQuery(sql)
    }
    console.log(`已导入 ${Math.min(i + batchSize, data.length)}/${data.length} 条鱼竿数据`)
  }
  
  console.log('✅ 鱼竿数据导入完成')
}

async function importReels() {
  console.log('正在导入渔轮数据...')
  const data = JSON.parse(fs.readFileSync('./public/reel_compare.json', 'utf8'))
  
  await runQuery('DELETE FROM reels')
  
  const batchSize = 50
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      const sql = `INSERT INTO reels (equipmentName, equipmentType, category, subCategory, model, description, transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar, size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar, levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar, goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant) VALUES ("${item.equipmentName || ''}", "${item.equipmentType || '渔轮'}", "${item.category || ''}", "${item.subCategory || ''}", "${item.model || ''}", "${(item.description || '').replace(/"/g, "'")}", "${item.transmissionRatio || ''}", "${item.transmissionRatioStar || ''}", "${item.enginePower || ''}", "${item.lineSpeed || ''}", "${item.lineSpeedStar || ''}", "${item.size || ''}", "${item.form || ''}", "${item.frictionForce || ''}", ${item.frictionForceStar || 0}, "${item.windingSpeed || ''}", "${item.test || ''}", ${item.testStar || 0}, "${item.levelReq || ''}", "${item.spoolCapacity || ''}", "${item.obtainMethod || ''}", "${item.rating || ''}", "${item.adaptWeight || ''}", ${item.adaptWeightStar || 0}, "${item.goldPrice || ''}", "${item.silverPrice || ''}", "${item.lockTension || ''}", ${item.lockTensionStar || 0}, "${item.saltwaterResistant || ''}")`
      await runQuery(sql)
    }
    console.log(`已导入 ${Math.min(i + batchSize, data.length)}/${data.length} 条渔轮数据`)
  }
  
  console.log('✅ 渔轮数据导入完成')
}

async function main() {
  try {
    await importRods()
    await importReels()
    console.log('\n🎉 所有数据导入完成！')
  } catch (error) {
    console.error('❌ 导入失败:', error)
    process.exit(1)
  }
}

main()