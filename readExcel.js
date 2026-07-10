import XLSX from 'xlsx'
import { dirname, join } from 'path'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
/**
 * node readExcel.js   将 装备参数表.xlsx 转换为 public/equipment.json
 */
const excelPath = join(__dirname, '装备参数表.xlsx')
const workbook = XLSX.readFile(excelPath)

const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]
const jsonData = XLSX.utils.sheet_to_json(worksheet)

console.log('Excel文件内容长度:', jsonData.length)

if (jsonData.length > 0) {
  const headers = Object.keys(jsonData[0])
  console.log('原始字段名:', headers)
}

// 鱼=40060, 渔=28180
const HANZI_ROD = 40060
const HANZI_REEL = 28180

const equipmentData = jsonData
  .map(item => {
    const keys = Object.keys(item)
    let type = ''
    let name = ''
    let lockTension = 0
    let panelTension = 0
    let price = 0

    if (keys.length >= 4) {
      const typeValue = item[keys[0]]
      if (typeValue && typeValue.charCodeAt(0) === HANZI_ROD) type = '鱼竿'
      else if (typeValue && typeValue.charCodeAt(0) === HANZI_REEL) type = '渔轮'
      else type = typeValue

      name = item[keys[1]]

      if (keys.length >= 5) {
        lockTension = item[keys[2]] === '-' || item[keys[2]] === '' ? 0 : parseFloat(item[keys[2]])
        panelTension = item[keys[3]] === '-' || item[keys[3]] === '' ? 0 : parseFloat(item[keys[3]])
        price = item[keys[4]] === '-' || item[keys[4]] === '' ? 0 : parseFloat(item[keys[4]])
      } else {
        panelTension = item[keys[2]] === '-' || item[keys[2]] === '' ? 0 : parseFloat(item[keys[2]])
        price = item[keys[3]] === '-' || item[keys[3]] === '' ? 0 : parseFloat(item[keys[3]])
      }
    }

    return {
      equipmentType: type,
      equipmentName: name,
      lockTension: Number.isNaN(lockTension) ? 0 : lockTension,
      panelTension: Number.isNaN(panelTension) ? 0 : panelTension,
      price: Number.isNaN(price) ? 0 : price
    }
  })
  .filter(item => item.equipmentType && item.equipmentName)

console.log('转换后数据长度:', equipmentData.length)
console.log('鱼竿数量:', equipmentData.filter(item => item.equipmentType === '鱼竿').length)
console.log('渔轮数量:', equipmentData.filter(item => item.equipmentType === '渔轮').length)

const outputPath = join(__dirname, 'public', 'equipment.json')
writeFileSync(outputPath, JSON.stringify(equipmentData, null, 2))

console.log('equipment.json 文件已更新!')
