<template>
  <div class="localize-page">
    <h2>🎮 RF4 游戏汉化</h2>
    <p class="subtitle">上传俄服基线文件和汉化基线文件，对新俄服进行增量汉化</p>

    <!-- 文件上传区 -->
    <div class="upload-section" v-if="!processing && !result">
      <div class="upload-grid">
        <!-- 俄服基线文件 -->
        <div class="upload-card" :class="{ 'has-file': files.baseRu }">
          <div class="upload-header">
            <span class="upload-step">①</span>
            <span class="upload-title">俄服基线文件</span>
          </div>
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop('baseRu', $event)" @click="triggerFileInput('baseRu')">
            <input 
              ref="baseRuInput" 
              type="file" 
              accept=".assets" 
              @change="handleFileSelect('baseRu', $event)"
              style="display: none"
            />
            <div v-if="!files.baseRu" class="upload-placeholder">
              <div class="upload-icon">🇷🇺</div>
              <div class="upload-text">点击上传当前版本俄服文件</div>
              <div class="upload-hint">resources.assets（约 375MB）</div>
            </div>
            <div v-else class="upload-file-info">
              <div class="file-icon">✅</div>
              <div class="file-name">{{ files.baseRu.name }}</div>
              <div class="file-size">{{ formatSize(files.baseRu.size) }}</div>
              <button class="remove-btn" @click.stop="removeFile('baseRu')">✕</button>
            </div>
          </div>
        </div>

        <!-- 汉化基线文件 -->
        <div class="upload-card" :class="{ 'has-file': files.baseCn }">
          <div class="upload-header">
            <span class="upload-step">②</span>
            <span class="upload-title">汉化基线文件</span>
          </div>
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop('baseCn', $event)" @click="triggerFileInput('baseCn')">
            <input 
              ref="baseCnInput" 
              type="file" 
              accept=".assets" 
              @change="handleFileSelect('baseCn', $event)"
              style="display: none"
            />
            <div v-if="!files.baseCn" class="upload-placeholder">
              <div class="upload-icon">🇨🇳</div>
              <div class="upload-text">点击上传当前版本汉化文件</div>
              <div class="upload-hint">resources.assets（约 375MB）</div>
            </div>
            <div v-else class="upload-file-info">
              <div class="file-icon">✅</div>
              <div class="file-name">{{ files.baseCn.name }}</div>
              <div class="file-size">{{ formatSize(files.baseCn.size) }}</div>
              <button class="remove-btn" @click.stop="removeFile('baseCn')">✕</button>
            </div>
          </div>
        </div>

        <!-- 新俄服文件 -->
        <div class="upload-card" :class="{ 'has-file': files.newRu }">
          <div class="upload-header">
            <span class="upload-step">③</span>
            <span class="upload-title">新俄服文件</span>
          </div>
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop('newRu', $event)" @click="triggerFileInput('newRu')">
            <input 
              ref="newRuInput" 
              type="file" 
              accept=".assets" 
              @change="handleFileSelect('newRu', $event)"
              style="display: none"
            />
            <div v-if="!files.newRu" class="upload-placeholder">
              <div class="upload-icon">🆕</div>
              <div class="upload-text">点击上传游戏更新后的新俄服文件</div>
              <div class="upload-hint">resources.assets（约 375MB）</div>
            </div>
            <div v-else class="upload-file-info">
              <div class="file-icon">✅</div>
              <div class="file-name">{{ files.newRu.name }}</div>
              <div class="file-size">{{ formatSize(files.newRu.size) }}</div>
              <button class="remove-btn" @click.stop="removeFile('newRu')">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 开始汉化按钮 -->
      <div class="action-bar">
        <button 
          class="start-btn" 
          :disabled="!canStart"
          @click="startLocalization"
        >
          🚀 开始增量汉化
        </button>
        <div class="action-hint" v-if="!canStart">
          请先上传全部 3 个文件
        </div>
      </div>
    </div>

    <!-- 处理进度 -->
    <div class="progress-section" v-if="processing">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-text">{{ progressText }}</div>
      <div class="progress-detail">{{ detailText }}</div>
    </div>

    <!-- 结果展示 -->
    <div class="result-section" v-if="result">
      <div class="result-card">
        <h3>✅ 汉化完成</h3>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">版本标识：</span>
            <span class="stat-value">{{ result.version }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">匹配文本：</span>
            <span class="stat-value">{{ result.matched }} 条</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">新增翻译：</span>
            <span class="stat-value">{{ result.newTranslated }} 条</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">API 调用：</span>
            <span class="stat-value">{{ result.apiCalls }} 次</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">文件大小：</span>
            <span class="stat-value">{{ formatSize(result.outputSize) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">耗时：</span>
            <span class="stat-value">{{ result.duration }}秒</span>
          </div>
        </div>
        <button class="download-btn" @click="downloadResult">💾 下载汉化文件</button>
        <button class="retry-btn" @click="reset">🔄 重新上传</button>
      </div>
    </div>

    <!-- 说明区域 -->
    <div class="info-section">
      <h3>📖 使用说明</h3>
      <ul>
        <li><strong>① 俄服基线文件</strong>：当前游戏版本的俄服 resources.assets（作为对照基准）</li>
        <li><strong>② 汉化基线文件</strong>：当前游戏版本的汉化 resources.assets（作为翻译模板）</li>
        <li><strong>③ 新俄服文件</strong>：游戏更新后的新版俄服 resources.assets（需要汉化的目标）</li>
        <li>系统会从基线文件中提取俄文→中文映射，仅对新文件中的增量文本调用翻译 API</li>
        <li>生成的汉化文件自带版本标识，方便追踪管理</li>
      </ul>
      <div class="warning-box">
        ⚠️ <strong>注意：</strong>由于文件较大（约 375MB），处理过程可能需要几分钟。基线文件只需在首次或游戏大版本更新时提供一次。
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocalizationPage',
  data() {
    return {
      files: {
        baseRu: null,
        baseCn: null,
        newRu: null
      },
      processing: false,
      progress: 0,
      progressText: '',
      detailText: '',
      result: null,
      outputBlob: null
    }
  },
  computed: {
    canStart() {
      return this.files.baseRu && this.files.baseCn && this.files.newRu
    }
  },
  methods: {
    triggerFileInput(key) {
      this.$refs[key + 'Input'].click()
    },
    handleFileSelect(key, event) {
      const file = event.target.files[0]
      if (file) {
        this.files[key] = file
      }
    },
    handleDrop(key, event) {
      const file = event.dataTransfer.files[0]
      if (file && file.name.endsWith('.assets')) {
        this.files[key] = file
      } else {
        alert('请上传 .assets 文件')
      }
    },
    removeFile(key) {
      this.files[key] = null
      if (this.$refs[key + 'Input']) {
        this.$refs[key + 'Input'].value = ''
      }
    },
    async startLocalization() {
      if (!this.canStart) return
      
      this.processing = true
      this.progress = 0
      this.progressText = '正在上传文件...'
      this.startTime = Date.now()
      
      try {
        // 上传 3 个文件到后端
        const formData = new FormData()
        formData.append('baseRu', this.files.baseRu)
        formData.append('baseCn', this.files.baseCn)
        formData.append('newRu', this.files.newRu)
        
        this.progressText = '正在上传基线文件...'
        this.progress = 10
        
        const response = await fetch('/api/localize', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error('上传失败')
        }
        
        this.progressText = '正在建立翻译映射...'
        this.progress = 30
        
        // 轮询进度
        const taskId = (await response.json()).taskId
        await this.pollProgress(taskId)
        
      } catch (error) {
        console.error('汉化失败:', error)
        alert(`汉化失败: ${error.message}`)
        this.reset()
      } finally {
        this.processing = false
      }
    },
    async pollProgress(taskId) {
      const maxAttempts = 600
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        try {
          const response = await fetch(`/api/localize/status/${taskId}`)
          const data = await response.json()
          
          this.progress = data.progress || 0
          this.progressText = data.status || '处理中...'
          this.detailText = data.detail || ''
          
          if (data.status === 'completed') {
            // 下载结果
            this.progressText = '正在下载结果...'
            const downloadResponse = await fetch(`/api/localize/download/${taskId}`)
            const blob = await downloadResponse.blob()
            this.outputBlob = blob
            
            this.result = {
              version: data.version || '未知',
              matched: data.matched || 0,
              newTranslated: data.newTranslated || 0,
              apiCalls: data.apiCalls || 0,
              outputSize: blob.size,
              duration: Math.round((Date.now() - this.startTime) / 1000)
            }
            break
          }
          
          if (data.status === 'failed') {
            throw new Error(data.error || '处理失败')
          }
        } catch (e) {
          if (e.message !== '处理失败') {
            console.warn('进度查询失败:', e)
          } else {
            throw e
          }
        }
      }
    },
    downloadResult() {
      if (!this.outputBlob) return
      
      const url = URL.createObjectURL(this.outputBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resources_localized.assets'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    reset() {
      this.processing = false
      this.progress = 0
      this.progressText = ''
      this.detailText = ''
      this.result = null
      this.outputBlob = null
      this.files = { baseRu: null, baseCn: null, newRu: null }
      Object.keys(this.$refs).forEach(key => {
        if (key.endsWith('Input') && this.$refs[key]) {
          this.$refs[key].value = ''
        }
      })
    },
    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
    }
  }
}
</script>

<style scoped>
.localize-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
  margin-bottom: 32px;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.upload-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.upload-card.has-file {
  border: 2px solid #4caf50;
}

.upload-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.upload-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  margin-right: 10px;
}

.upload-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 24px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.upload-placeholder {
  width: 100%;
}

.upload-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 11px;
  color: #999;
}

.upload-file-info {
  position: relative;
  width: 100%;
}

.file-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.file-name {
  font-size: 12px;
  color: #333;
  word-break: break-all;
  margin-bottom: 4px;
}

.file-size {
  font-size: 11px;
  color: #888;
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #ff5252;
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: #ff1744;
}

.action-bar {
  text-align: center;
  margin-bottom: 20px;
}

.start-btn {
  padding: 14px 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 28px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.start-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.action-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}

.progress-section {
  padding: 60px 20px;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.progress-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.progress-detail {
  font-size: 13px;
  color: #666;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.result-card h3 {
  font-size: 20px;
  color: #333;
  margin-bottom: 24px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.stat-label {
  font-size: 13px;
  color: #666;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.download-btn, .retry-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin: 0 8px;
}

.download-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.download-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.retry-btn {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.retry-btn:hover {
  background: #f0f4ff;
}

.info-section {
  margin-top: 40px;
  padding: 24px;
  background: #f9f9f9;
  border-radius: 12px;
}

.info-section h3 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

.info-section ul {
  list-style: none;
  padding: 0;
}

.info-section li {
  padding: 8px 0;
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

.info-section code {
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

.warning-box {
  margin-top: 16px;
  padding: 16px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  font-size: 14px;
  color: #856404;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .upload-grid {
    grid-template-columns: 1fr;
  }
  
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
