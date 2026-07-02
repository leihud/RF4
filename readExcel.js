const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '装备参数表.xlsx');
const workbook = XLSX.readFile(excelPath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log('Excel文件内容长度:', jsonData.length);

if (jsonData.length > 0) {
  const headers = Object.keys(jsonData[0]);
  console.log('原始字段名:', headers);
}

const equipmentData = jsonData.map(item => {
  const keys = Object.keys(item);
  let type = '';
  let name = '';
  let lockTension = 0;
  let panelTension = 0;
  let price = 0;
  
  if (keys.length >= 4) {
    const typeValue = item[keys[0]];
    if (typeValue && typeValue.charCodeAt(0) === 40060) type = '鱼竿';
    else if (typeValue && typeValue.charCodeAt(0) === 28180) type = '渔轮';
    else type = typeValue;
    
    name = item[keys[1]];
    
    if (keys.length >= 5) {
      lockTension = item[keys[2]] === '-' || item[keys[2]] === '' ? 0 : parseFloat(item[keys[2]]);
      panelTension = item[keys[3]] === '-' || item[keys[3]] === '' ? 0 : parseFloat(item[keys[3]]);
      price = item[keys[4]] === '-' || item[keys[4]] === '' ? 0 : parseFloat(item[keys[4]]);
    } else {
      panelTension = item[keys[2]] === '-' || item[keys[2]] === '' ? 0 : parseFloat(item[keys[2]]);
      price = item[keys[3]] === '-' || item[keys[3]] === '' ? 0 : parseFloat(item[keys[3]]);
    }
  }
  
  return {
    equipmentType: type,
    equipmentName: name,
    lockTension: isNaN(lockTension) ? 0 : lockTension,
    panelTension: isNaN(panelTension) ? 0 : panelTension,
    price: isNaN(price) ? 0 : price
  };
}).filter(item => item.equipmentType && item.equipmentName);

console.log('转换后数据长度:', equipmentData.length);
const rodCount = equipmentData.filter(item => item.equipmentType === '鱼竿').length;
const reelCount = equipmentData.filter(item => item.equipmentType === '渔轮').length;
console.log('鱼竿数量:', rodCount);
console.log('渔轮数量:', reelCount);

const outputPath = path.join(__dirname, 'public', 'equipment.json');
fs.writeFileSync(outputPath, JSON.stringify(equipmentData, null, 2));

console.log('equipment.json 文件已更新!');