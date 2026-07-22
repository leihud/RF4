import fs from 'fs'

function extractNumber(str) {
  if (!str) return 0
  const match = String(str).match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

async function importRods(db) {
  console.log('正在导入鱼竿数据...')
  const data = JSON.parse(fs.readFileSync('./public/rod_compare.json', 'utf8'))
  
  await db.prepare('DELETE FROM rods').run()
  
  const batchSize = 50
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      await db.prepare(`INSERT INTO rods (
        equipmentName, equipmentType, category, subCategory, model, description,
        strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability,
        rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          item.equipmentName || '',
          item.equipmentType || '鱼竿',
          item.category || '',
          item.subCategory || '',
          item.model || '',
          item.description || '',
          item.strengthKg || '',
          item.form || '',
          item.testG || 0,
          item.sensitivity || 0,
          item.hardness || '',
          item.levelReq || '',
          item.structure || '',
          item.ability || '',
          item.rating || '',
          item.weightG || '',
          item.adaptWeight || '',
          item.adaptWeightG || 0,
          item.goldPrice || '',
          item.silverPrice || '',
          item.lengthM || ''
        ).run()
    }
    console.log(`已导入 ${Math.min(i + batchSize, data.length)}/${data.length} 条鱼竿数据`)
  }
  
  console.log('✅ 鱼竿数据导入完成')
}

async function importReels(db) {
  console.log('正在导入渔轮数据...')
  const data = JSON.parse(fs.readFileSync('./public/reel_compare.json', 'utf8'))
  
  await db.prepare('DELETE FROM reels').run()
  
  const batchSize = 50
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      await db.prepare(`INSERT INTO reels (
        equipmentName, equipmentType, category, subCategory, model, description,
        transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar,
        size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar,
        levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar,
        goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          item.equipmentName || '',
          item.equipmentType || '渔轮',
          item.category || '',
          item.subCategory || '',
          item.model || '',
          item.description || '',
          item.transmissionRatio || '',
          item.transmissionRatioStar || '',
          item.enginePower || '',
          item.lineSpeed || '',
          item.lineSpeedStar || '',
          item.size || '',
          item.form || '',
          item.frictionForce || '',
          item.frictionForceStar || 0,
          item.windingSpeed || '',
          item.test || '',
          item.testStar || 0,
          item.levelReq || '',
          item.spoolCapacity || '',
          item.obtainMethod || '',
          item.rating || '',
          item.adaptWeight || '',
          item.adaptWeightStar || 0,
          item.goldPrice || '',
          item.silverPrice || '',
          item.lockTension || '',
          item.lockTensionStar || 0,
          item.saltwaterResistant || ''
        ).run()
    }
    console.log(`已导入 ${Math.min(i + batchSize, data.length)}/${data.length} 条渔轮数据`)
  }
  
  console.log('✅ 渔轮数据导入完成')
}

async function importEquipment(db) {
  console.log('正在导入装备数据...')
  const data = JSON.parse(fs.readFileSync('./public/equipment.json', 'utf8'))
  
  await db.prepare('DELETE FROM equipment').run()
  
  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    for (const item of batch) {
      await db.prepare(`INSERT INTO equipment (
        equipmentType, equipmentName, lockTension, panelTension, price
      ) VALUES (?, ?, ?, ?, ?)`)
        .bind(
          item.equipmentType || '',
          item.equipmentName || '',
          extractNumber(item.lockTension),
          extractNumber(item.panelTension),
          extractNumber(item.price)
        ).run()
    }
    console.log(`已导入 ${Math.min(i + batchSize, data.length)}/${data.length} 条装备数据`)
  }
  
  console.log('✅ 装备数据导入完成')
}

export { importRods, importReels, importEquipment }

async function main() {
  const { env } = await import('wrangler')
  const db = env.DB
  
  try {
    await importRods(db)
    await importReels(db)
    await importEquipment(db)
    console.log('\n🎉 所有数据导入完成！')
  } catch (error) {
    console.error('❌ 导入失败:', error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}