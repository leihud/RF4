const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '装备参数表.xlsx');
const workbook = XLSX.readFile(excelPath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log('Excel文件内容:');
console.log(JSON.stringify(jsonData, null, 2));

console.log('\n字段名:');
if (jsonData.length > 0) {
  const headers = Object.keys(jsonData[0]);
  console.log(headers);
}