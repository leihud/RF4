<template>
  <div class="import-page">
    <div class="import-header">
      <h1>装备数据导入</h1>
      <button class="back-btn" @click="goBack">返回计算器</button>
    </div>

    <div class="import-container">
      <div class="import-section">
        <h2>选择导入类型</h2>
        <div class="type-selector">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            :class="['type-btn', { active: importType === opt.value }]"
            @click="importType = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="import-section">
        <h2>下载导入模板</h2>
        <div class="template-download">
          <button 
            class="download-btn"
            @click="downloadTemplate"
          >
            📥 下载{{ importType === '鱼竿' ? '鱼竿' : '渔轮' }}导入模板
          </button>
          <p class="template-hint">模板包含完整字段定义，请按照模板格式填写数据，字段为中文</p>
        </div>
      </div>

      <div class="import-section">
        <h2>上传数据文件</h2>
        <div class="upload-section">
          <input
            type="file"
            ref="fileInput"
            accept=".xlsx,.xls"
            class="file-input"
            @change="handleFileSelect"
          />
          <div 
            class="upload-area"
            @click="triggerFileInput"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
            :class="{ 'drag-over': isDragOver, 'has-file': selectedFile }"
          >
            <span class="upload-icon">{{ selectedFile ? '📁' : '📤' }}</span>
            <span class="upload-text">
              {{ selectedFile ? selectedFile.name : '点击或拖拽上传 Excel 文件' }}
            </span>
            <span class="upload-hint">支持 .xlsx, .xls 格式</span>
          </div>
          <div v-if="fileContent" class="file-preview">
            <h3>文件内容预览（前3行）</h3>
            <div class="preview-table">
              <table>
                <thead>
                  <tr>
                    <th v-for="(header, index) in previewHeaders" :key="index">{{ header }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in previewData" :key="rowIndex">
                    <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell || '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="import-section">
        <h2>输入导入密码</h2>
        <div class="password-section">
          <input
            type="password"
            v-model="password"
            placeholder="请输入导入密码"
            class="password-input"
          />
          <div v-if="passwordError" class="password-error">{{ passwordError }}</div>
        </div>
      </div>

      <div class="import-action">
        <button 
          class="import-btn"
          :disabled="!canImport"
          @click="handleImport"
        >
          {{ isImporting ? '导入中...' : '开始导入' }}
        </button>
      </div>

      <div v-if="importResult" class="result-section" :class="importResult.success ? 'success' : 'error'">
        <div class="result-icon">{{ importResult.success ? '✅' : '❌' }}</div>
        <div class="result-message">{{ importResult.message }}</div>
        <div v-if="importResult.success" class="result-detail">
          <span>成功导入：{{ importResult.successCount }} 条</span>
          <span>导入失败：{{ importResult.failCount }} 条</span>
        </div>
        <div v-if="importResult.duplicates" class="duplicate-list">
          <div class="duplicate-title">重复数据：</div>
          <div class="duplicate-items">{{ importResult.duplicates.join(', ') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx'

const ROD_FIELD_MAP = {
  '装备名称': 'equipmentName',
  '类型': 'equipmentType',
  '分类': 'category',
  '子分类': 'subCategory',
  '型号': 'model',
  '描述': 'description',
  '强度(kg)': 'strengthKg',
  '形状': 'form',
  '测试(g)': 'testG',
  '灵敏度': 'sensitivity',
  '硬度': 'hardness',
  '等级需求': 'levelReq',
  '结构': 'structure',
  '能力': 'ability',
  '评级': 'rating',
  '重量(g)': 'weightG',
  '适配重量': 'adaptWeight',
  '适配重量(g)': 'adaptWeightG',
  '金币价格': 'goldPrice',
  '银币价格': 'silverPrice',
  '长度(m)': 'lengthM'
}

const REEL_FIELD_MAP = {
  '装备名称': 'equipmentName',
  '类型': 'equipmentType',
  '分类': 'category',
  '子分类': 'subCategory',
  '型号': 'model',
  '描述': 'description',
  '传动比': 'transmissionRatio',
  '传动比星级': 'transmissionRatioStar',
  '发动机功率': 'enginePower',
  '出线速度': 'lineSpeed',
  '出线速度星级': 'lineSpeedStar',
  '尺寸': 'size',
  '形状': 'form',
  '摩擦值': 'frictionForce',
  '摩擦值星级': 'frictionForceStar',
  '收线速度': 'windingSpeed',
  '测试': 'test',
  '测试星级': 'testStar',
  '等级需求': 'levelReq',
  '线杯容量': 'spoolCapacity',
  '获取方式': 'obtainMethod',
  '评级': 'rating',
  '适配重量': 'adaptWeight',
  '适配重量星级': 'adaptWeightStar',
  '金币价格': 'goldPrice',
  '银币价格': 'silverPrice',
  '锁轮拉力': 'lockTension',
  '锁轮拉力星级': 'lockTensionStar',
  '防盐性': 'saltwaterResistant'
}

const ROD_DEFAULT_ROW = {
  '装备名称': '示例鱼竿名称',
  '类型': '鱼竿',
  '分类': '海竿',
  '子分类': '',
  '型号': 'TEST-001',
  '描述': '',
  '强度(kg)': '5.0',
  '形状': '',
  '测试(g)': '100',
  '灵敏度': '5',
  '硬度': '',
  '等级需求': '10',
  '结构': '',
  '能力': '',
  '评级': '',
  '重量(g)': '150',
  '适配重量': '',
  '适配重量(g)': '0',
  '金币价格': '',
  '银币价格': '1000',
  '长度(m)': '2.4'
}

const REEL_DEFAULT_ROW = {
  '装备名称': '示例渔轮名称',
  '类型': '渔轮',
  '分类': '纺车轮',
  '子分类': '',
  '型号': 'TEST-REEL-001',
  '描述': '',
  '传动比': '5.2:1',
  '传动比星级': '3',
  '发动机功率': '',
  '出线速度': '',
  '出线速度星级': '0',
  '尺寸': '',
  '形状': '',
  '摩擦值': '10',
  '摩擦值星级': '5',
  '收线速度': '',
  '测试': '',
  '测试星级': '0',
  '等级需求': '8',
  '线杯容量': '',
  '获取方式': '',
  '评级': '',
  '适配重量': '',
  '适配重量星级': '0',
  '金币价格': '',
  '银币价格': '2000',
  '锁轮拉力': '5.0',
  '锁轮拉力星级': '3',
  '防盐性': ''
}

export default {
  name: 'ImportPage',
  data() {
    return {
      typeOptions: [
        { value: '鱼竿', label: '鱼竿数据' },
        { value: '渔轮', label: '渔轮数据' }
      ],
      importType: '鱼竿',
      selectedFile: null,
      fileContent: null,
      parsedData: null,
      previewHeaders: [],
      previewData: [],
      password: '',
      passwordError: '',
      isDragOver: false,
      isImporting: false,
      importResult: null
    }
  },
  computed: {
    canImport() {
      return this.selectedFile && this.password && !this.isImporting && this.isValidFile
    },
    isValidFile() {
      return this.parsedData && this.parsedData.length > 0
    }
  },
  methods: {
    goBack() {
      this.$router.push('/')
    },
    triggerFileInput() {
      this.$refs.fileInput.click()
    },
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.readFile(file)
      }
    },
    handleDrop(event) {
      this.isDragOver = false
      const file = event.dataTransfer.files[0]
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        this.readFile(file)
      }
    },
    readFile(file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          this.selectedFile = file
          this.fileContent = jsonData
          this.parsedData = this.convertToEnglishKeys(jsonData)
          this.updatePreview(jsonData)
          this.importResult = null
        } catch (error) {
          console.error('解析 Excel 文件失败:', error)
          this.parsedData = null
          this.previewHeaders = []
          this.previewData = []
          this.importResult = {
            success: false,
            message: '解析 Excel 文件失败：' + error.message
          }
        }
      }
      reader.readAsArrayBuffer(file)
    },
    convertToEnglishKeys(data) {
      const fieldMap = this.importType === '鱼竿' ? ROD_FIELD_MAP : REEL_FIELD_MAP
      return data.map(row => {
        const converted = {}
        for (const [chineseKey, englishKey] of Object.entries(fieldMap)) {
          if (row[chineseKey] !== undefined) {
            converted[englishKey] = row[chineseKey]
          }
        }
        return converted
      })
    },
    updatePreview(jsonData) {
      if (!jsonData || jsonData.length === 0) {
        this.previewHeaders = []
        this.previewData = []
        return
      }
      
      const headers = Object.keys(jsonData[0])
      this.previewHeaders = headers
      this.previewData = jsonData.slice(0, 3).map(row => 
        headers.map(header => row[header])
      )
    },
    downloadTemplate() {
      const fieldMap = this.importType === '鱼竿' ? ROD_FIELD_MAP : REEL_FIELD_MAP
      const defaultRow = this.importType === '鱼竿' ? ROD_DEFAULT_ROW : REEL_DEFAULT_ROW
      
      const headers = Object.keys(fieldMap)
      const data = [headers, Object.values(defaultRow)]
      
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, this.importType + '数据')
      
      XLSX.writeFile(workbook, `${this.importType}导入模板.xlsx`)
    },
    async handleImport() {
      if (!this.canImport) return

      this.isImporting = true
      this.passwordError = ''
      this.importResult = null

      try {
        const response = await fetch('/api/import_data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: this.password,
            type: this.importType,
            data: this.parsedData
          })
        })

        const result = await response.json()
        this.importResult = result

        if (!result.success) {
          if (response.status === 401) {
            this.passwordError = '密码错误，请重试'
          }
        } else {
          this.password = ''
          this.selectedFile = null
          this.fileContent = null
          this.parsedData = null
          this.previewHeaders = []
          this.previewData = []
        }
      } catch (error) {
        this.importResult = {
          success: false,
          message: '导入失败：' + error.message
        }
      } finally {
        this.isImporting = false
      }
    }
  }
}
</script>

<style scoped>
.import-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.import-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.import-header h1 {
  color: #42b983;
  margin: 0;
}

.back-btn {
  padding: 8px 20px;
  border: 2px solid #2196f3;
  background-color: white;
  color: #2196f3;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.back-btn:hover {
  background-color: #e3f2fd;
}

.import-container {
  background-color: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.import-section {
  margin-bottom: 30px;
}

.import-section h2 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 18px;
}

.type-selector {
  display: flex;
  gap: 15px;
}

.type-btn {
  padding: 12px 30px;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.type-btn:hover {
  border-color: #42b983;
}

.type-btn.active {
  border-color: #42b983;
  background-color: #e8f5e9;
  color: #42b983;
}

.template-download {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.download-btn {
  display: inline-block;
  padding: 12px 24px;
  background-color: #2196f3;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  text-align: center;
  border: none;
  cursor: pointer;
}

.download-btn:hover {
  background-color: #1976d2;
}

.template-hint {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.file-input {
  display: none;
}

.upload-area {
  padding: 40px;
  border: 2px dashed #ddd;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #42b983;
  background-color: #f8f9fa;
}

.upload-area.drag-over {
  border-color: #42b983;
  background-color: #e8f5e9;
}

.upload-area.has-file {
  border-color: #42b983;
  background-color: #e8f5e9;
}

.upload-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.upload-text {
  display: block;
  font-size: 16px;
  color: #333;
  margin-bottom: 5px;
}

.upload-hint {
  display: block;
  font-size: 13px;
  color: #999;
}

.file-preview {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  overflow-x: auto;
}

.file-preview h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.preview-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.preview-table th,
.preview-table td {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: left;
}

.preview-table th {
  background-color: #e3f2fd;
  font-weight: bold;
  color: #1565c0;
}

.preview-table td {
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.password-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.password-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.password-input:focus {
  outline: none;
  border-color: #42b983;
}

.password-error {
  color: #c62828;
  font-size: 14px;
}

.import-action {
  text-align: center;
  margin-top: 20px;
}

.import-btn {
  padding: 15px 60px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.import-btn:hover:not(:disabled) {
  background-color: #379a6b;
}

.import-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.result-section {
  margin-top: 30px;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

.result-section.success {
  background-color: #e8f5e9;
  border: 2px solid #4caf50;
}

.result-section.error {
  background-color: #ffebee;
  border: 2px solid #c62828;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.result-message {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.result-detail {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 15px;
}

.result-detail span {
  font-size: 16px;
  color: #666;
}

.duplicate-list {
  margin-top: 15px;
  text-align: left;
}

.duplicate-title {
  font-size: 14px;
  font-weight: bold;
  color: #c62828;
  margin-bottom: 5px;
}

.duplicate-items {
  font-size: 13px;
  color: #666;
  word-break: break-all;
}

@media (max-width: 768px) {
  .import-page {
    padding: 10px;
  }

  .import-container {
    padding: 20px;
  }

  .type-selector {
    flex-direction: column;
  }

  .type-btn {
    width: 100%;
  }

  .upload-area {
    padding: 30px 20px;
  }

  .import-btn {
    width: 100%;
  }

  .result-detail {
    flex-direction: column;
    gap: 10px;
  }

  .preview-table td {
    max-width: 100px;
  }
}
</style>
