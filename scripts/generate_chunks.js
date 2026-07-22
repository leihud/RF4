import fs from 'fs'

function escapeStr(str) {
  return (str || '').replace(/'/g, "''")
}

function toSqlValue(value) {
  if (value === null || value === undefined || value === '') return "''"
  if (typeof value === 'number') return value
  return `'${escapeStr(value)}'`
}

async function generateRodsChunks() {
  console.log('正在生成鱼竿数据 SQL...')
  const data = JSON.parse(fs.readFileSync('./public/rod_compare.json', 'utf8'))
  
  const batchSize = 20
  let chunkIndex = 1
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    let sql = i === 0 ? 'DELETE FROM rods;\n' : ''
    
    for (const item of batch) {
      sql += `INSERT INTO rods (
        equipmentName, equipmentType, category, subCategory, model, description,
        strengthKg, form, testG, sensitivity, hardness, levelReq, structure, ability,
        rating, weightG, adaptWeight, adaptWeightG, goldPrice, silverPrice, lengthM
      ) VALUES (
        ${toSqlValue(item.equipmentName)},
        ${toSqlValue(item.equipmentType || '鱼竿')},
        ${toSqlValue(item.category)},
        ${toSqlValue(item.subCategory)},
        ${toSqlValue(item.model)},
        ${toSqlValue(item.description)},
        ${toSqlValue(item.strengthKg)},
        ${toSqlValue(item.form)},
        ${toSqlValue(item.testG)},
        ${toSqlValue(item.sensitivity)},
        ${toSqlValue(item.hardness)},
        ${toSqlValue(item.levelReq)},
        ${toSqlValue(item.structure)},
        ${toSqlValue(item.ability)},
        ${toSqlValue(item.rating)},
        ${toSqlValue(item.weightG)},
        ${toSqlValue(item.adaptWeight)},
        ${toSqlValue(item.adaptWeightG)},
        ${toSqlValue(item.goldPrice)},
        ${toSqlValue(item.silverPrice)},
        ${toSqlValue(item.lengthM)}
      );\n`
    }
    
    fs.writeFileSync(`./migrations/0002_rod_chunk_${chunkIndex}.sql`, sql)
    chunkIndex++
  }
  
  console.log(`✅ 生成了 ${chunkIndex - 1} 个鱼竿数据 SQL 文件`)
}

async function generateReelsChunks() {
  console.log('正在生成渔轮数据 SQL...')
  const data = JSON.parse(fs.readFileSync('./public/reel_compare.json', 'utf8'))
  
  const batchSize = 20
  let chunkIndex = 1
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    let sql = i === 0 ? 'DELETE FROM reels;\n' : ''
    
    for (const item of batch) {
      sql += `INSERT INTO reels (
        equipmentName, equipmentType, category, subCategory, model, description,
        transmissionRatio, transmissionRatioStar, enginePower, lineSpeed, lineSpeedStar,
        size, form, frictionForce, frictionForceStar, windingSpeed, test, testStar,
        levelReq, spoolCapacity, obtainMethod, rating, adaptWeight, adaptWeightStar,
        goldPrice, silverPrice, lockTension, lockTensionStar, saltwaterResistant
      ) VALUES (
        ${toSqlValue(item.equipmentName)},
        ${toSqlValue(item.equipmentType || '渔轮')},
        ${toSqlValue(item.category)},
        ${toSqlValue(item.subCategory)},
        ${toSqlValue(item.model)},
        ${toSqlValue(item.description)},
        ${toSqlValue(item.transmissionRatio)},
        ${toSqlValue(item.transmissionRatioStar)},
        ${toSqlValue(item.enginePower)},
        ${toSqlValue(item.lineSpeed)},
        ${toSqlValue(item.lineSpeedStar)},
        ${toSqlValue(item.size)},
        ${toSqlValue(item.form)},
        ${toSqlValue(item.frictionForce)},
        ${toSqlValue(item.frictionForceStar)},
        ${toSqlValue(item.windingSpeed)},
        ${toSqlValue(item.test)},
        ${toSqlValue(item.testStar)},
        ${toSqlValue(item.levelReq)},
        ${toSqlValue(item.spoolCapacity)},
        ${toSqlValue(item.obtainMethod)},
        ${toSqlValue(item.rating)},
        ${toSqlValue(item.adaptWeight)},
        ${toSqlValue(item.adaptWeightStar)},
        ${toSqlValue(item.goldPrice)},
        ${toSqlValue(item.silverPrice)},
        ${toSqlValue(item.lockTension)},
        ${toSqlValue(item.lockTensionStar)},
        ${toSqlValue(item.saltwaterResistant)}
      );\n`
    }
    
    fs.writeFileSync(`./migrations/0003_reel_chunk_${chunkIndex}.sql`, sql)
    chunkIndex++
  }
  
  console.log(`✅ 生成了 ${chunkIndex - 1} 个渔轮数据 SQL 文件`)
}

async function main() {
  try {
    await generateRodsChunks()
    await generateReelsChunks()
    console.log('\n🎉 SQL 文件生成完成！')
  } catch (error) {
    console.error('❌ 生成失败:', error)
    process.exit(1)
  }
}

main()