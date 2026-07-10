import XLSX from 'xlsx'
import { dirname, join } from 'path'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
/**
 * node readEncyclopedia.js   将 rf4_encyclopedia.xlsx 转换为对比页用的两份 JSON
 */
const workbook = XLSX.readFile(join(__dirname, 'rf4_encyclopedia.xlsx'))

const rodSheet = workbook.Sheets['渔竿图鉴']
const rodData = XLSX.utils.sheet_to_json(rodSheet)

const reelSheet = workbook.Sheets['渔轮图鉴']
const reelData = XLSX.utils.sheet_to_json(reelSheet)

const rodEquipment = rodData
  .map(item => ({
    equipmentName: item['条目名称'] || '',
    equipmentType: '鱼竿',
    category: item['大类'] || '',
    subCategory: item['小类'] || '',
    model: item['型号/分组'] || '',
    description: item['描述'] || '',
    strengthKg: item['强度(公斤)'] || 0,
    form: item['形式'] || '',
    testG: item['测试(克)'] || 0,
    sensitivity: item['灵敏度'] || 0,
    hardness: item['硬度'] || '',
    levelReq: item['等级要求'] || 0,
    structure: item['结构'] || '',
    ability: item['能力'] || '',
    rating: item['评级'] || '',
    weightG: item['质量(克)'] || 0,
    adaptWeight: item['适配重'] || '',
    adaptWeightG: item['适配重(克)'] || 0,
    goldPrice: item['金币'] || 0,
    silverPrice: item['银币'] || 0,
    lengthM: item['长度(米)'] || 0
  }))
  .filter(item => item.equipmentName)

const reelEquipment = reelData
  .map(item => ({
    equipmentName: item['条目名称'] || '',
    equipmentType: '渔轮',
    category: item['大类'] || '',
    subCategory: item['小类'] || '',
    model: item['型号/分组'] || '',
    description: item['描述'] || '',
    transmissionRatio: item['传动比'] || '',
    transmissionRatioStar: item['传动比*'] || '',
    enginePower: item['发动机功率'] || '',
    lineSpeed: item['回线速度'] || '',
    lineSpeedStar: item['回线速度*'] || '',
    size: item['大小'] || '',
    form: item['形式'] || '',
    frictionForce: item['摩擦制动力'] || '',
    frictionForceStar: item['摩擦制动力*'] || '',
    windingSpeed: item['收线速度'] || '',
    test: item['测试'] || '',
    testStar: item['测试*'] || '',
    levelReq: item['等级要求'] || 0,
    spoolCapacity: item['线轴容量'] || '',
    obtainMethod: item['获取方式'] || '',
    rating: item['评级'] || '',
    adaptWeight: item['适配重'] || '',
    adaptWeightStar: item['适配重*'] || '',
    goldPrice: item['金币'] || 0,
    silverPrice: item['银币'] || 0,
    lockTension: item['锁轮拉力'] || 0,
    lockTensionStar: item['锁轮拉力*'] || 0,
    saltwaterResistant: item['防海水'] || ''
  }))
  .filter(item => item.equipmentName)

writeFileSync(join(__dirname, 'public', 'rod_compare.json'), JSON.stringify(rodEquipment, null, 2))
console.log(`鱼竿数据导出成功: ${rodEquipment.length} 条`)

writeFileSync(join(__dirname, 'public', 'reel_compare.json'), JSON.stringify(reelEquipment, null, 2))
console.log(`渔轮数据导出成功: ${reelEquipment.length} 条`)
