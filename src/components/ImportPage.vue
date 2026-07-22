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
          <a 
            v-if="importType === '鱼竿'" 
            href="/import_template_rod.json" 
            download="import_template_rod.json"
            class="download-btn"
          >
            📥 下载鱼竿导入模板
          </a>
          <a 
            v-else 
            href="/import_template_reel.json" 
            download="import_template_reel.json"
            class="download-btn"
          >
            📥 下载渔轮导入模板
          </a>
          <p class="template-hint">模板包含完整字段定义，请按照模板格式填写数据</p>
        </div>
      </div>

      <div class="import-section">
        <h2>上传数据文件</h2>
        <div class="upload-section">
          <input
            type="file"
            ref="fileInput"
            accept=".json"
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
              {{ selectedFile ? selectedFile.name : '点击或拖拽上传 JSON 文件' }}
            </span>
            <span class="upload-hint">支持 .json 格式</span>
          </div>
          <div v-if="fileContent" class="file-preview">
            <h3>文件内容预览</h3>
            <pre class="preview-content">{{ filePreview }}</pre>
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
      password: '',
      passwordError: '',
      isDragOver: false,
      isImporting: false,
      importResult: null
    }
  },
  computed: {
    filePreview() {
      if (!this.fileContent) return ''
      try {
        const data = JSON.parse(this.fileContent)
        return JSON.stringify(data.slice(0, 3), null, 2) + (data.length > 3 ? '\n...' : '')
      } catch {
        return '文件格式错误，请上传有效的 JSON 文件'
      }
    },
    canImport() {
      return this.selectedFile && this.password && !this.isImporting && this.isValidFile
    },
    isValidFile() {
      if (!this.fileContent) return false
      try {
        const data = JSON.parse(this.fileContent)
        return Array.isArray(data) && data.length > 0
      } catch {
        return false
      }
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
      if (file && file.name.endsWith('.json')) {
        this.readFile(file)
      }
    },
    readFile(file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        this.selectedFile = file
        this.fileContent = e.target.result
        this.importResult = null
      }
      reader.readAsText(file)
    },
    async handleImport() {
      if (!this.canImport) return

      this.isImporting = true
      this.passwordError = ''
      this.importResult = null

      try {
        const data = JSON.parse(this.fileContent)
        
        const response = await fetch('/api/import_data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: this.password,
            type: this.importType,
            data: data
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
}

.file-preview h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.preview-content {
  font-size: 12px;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
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
}
</style>