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

const typeMap = {
  '楸肩': '鱼竿',
  '娓旇疆': '渔轮',
  '鍏戝舰': '主线',
  '鍙戝舰': '引线'
};

const equipmentData = jsonData.map(item => {
  const keys = Object.keys(item);
  let type = '';
  let name = '';
  let tension = 0;
  
  keys.forEach(key => {
    const value = item[key];
    if (key.includes('绫诲') || key.includes('类型')) {
      type = typeMap[value] || value;
    } else if (key.includes('鍚嶇') || key.includes('名称')) {
      name = value;
    } else if (key.includes('鍔?') || key.includes('拉力')) {
      tension = value === '-' ? 0 : parseFloat(value);
    }
  });
  
  return {
    equipmentType: type,
    equipmentName: name,
    maxTension: isNaN(tension) ? 0 : tension
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