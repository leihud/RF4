<template>
  <div class="localize-page">
    <h2>🎮 RF4 游戏汉化</h2>
    <p class="subtitle">上传俄服 resources.assets，自动生成中文汉化版</p>

    <!-- 文件上传区 -->
    <div class="upload-section" v-if="!processing && !result">
      <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop" @click="triggerFileInput">
        <input 
          ref="fileInput" 
          type="file" 
          accept=".assets" 
          @change="handleFileSelect"
          style="display: none"
        />
        <div class="upload-icon">📁</div>
        <div class="upload-text">点击或拖拽上传 resources.assets 文件</div>
        <div class="upload-hint">支持 Unity 序列化格式（约 375MB）</div>
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
            <span class="stat-label">翻译文本数：</span>
            <span class="stat-value">{{ result.translatedCount }}</span>
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
        <li>1. 从俄服游戏目录找到 <code>resources.assets</code> 文件（约 375MB）</li>
        <li>2. 上传后系统将自动提取俄语文本并翻译成中文</li>
        <li>3. 下载生成的汉化版文件，替换原文件即可生效</li>
        <li>4. 建议先备份原文件，以防万一</li>
      </ul>
      <div class="warning-box">
        ⚠️ <strong>注意：</strong>翻译过程可能需要 5-10 分钟，请耐心等待。请勿关闭浏览器窗口。
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocalizationPage',
  data() {
    return {
      processing: false,
      progress: 0,
      progressText: '',
      detailText: '',
      result: null,
      outputBlob: null
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click()
    },
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) this.startLocalization(file)
    },
    handleDrop(event) {
      const file = event.dataTransfer.files[0]
      if (file && file.name.endsWith('.assets')) {
        this.startLocalization(file)
      } else {
        alert('请上传 .assets 文件')
      }
    },
    async startLocalization(file) {
      this.processing = true
      this.progress = 0
      this.progressText = '正在上传文件...'
      
      try {
        // 步骤1：上传文件到后端
        const formData = new FormData()
        formData.append('file', file)
        
        const uploadResponse = await fetch('/api/localize/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadResponse.ok) {
          throw new Error('上传失败')
        }
        
        const uploadData = await uploadResponse.json()
        const fileId = uploadData.fileId
        
        // 步骤2：开始翻译
        this.progressText = '正在提取文本...'
        this.detailText = `文件大小: ${this.formatSize(file.size)}`
        
        const translateResponse = await fetch('/api/localize/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId })
        })
        
        if (!translateResponse.ok) {
          throw new Error('翻译失败')
        }
        
        // 步骤3：轮询进度
        await this.pollProgress(fileId)
        
        // 步骤4：下载结果
        this.progressText = '正在生成文件...'
        const downloadResponse = await fetch(`/api/localize/download/${fileId}`)
        
        if (!downloadResponse.ok) {
          throw new Error('下载失败')
        }
        
        const blob = await downloadResponse.blob()
        this.outputBlob = blob
        this.result = {
          translatedCount: uploadData.textCount || 0,
          outputSize: blob.size,
          duration: Math.round((Date.now() - this.startTime) / 1000)
        }
        
      } catch (error) {
        console.error('汉化失败:', error)
        alert(`汉化失败: ${error.message}`)
        this.reset()
      } finally {
        this.processing = false
      }
    },
    async pollProgress(fileId) {
      this.startTime = Date.now()
      const maxAttempts = 600 // 最多等待 10 分钟（每秒查询一次）
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        try {
          const response = await fetch(`/api/localize/status/${fileId}`)
          const data = await response.json()
          
          this.progress = data.progress || 0
          this.progressText = data.status || '处理中...'
          this.detailText = data.detail || ''
          
          if (data.status === 'completed' || data.status === 'failed') {
            break
          }
        } catch (e) {
          console.warn('进度查询失败:', e)
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
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
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
  max-width: 800px;
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

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.progress-section {
  padding: 40px 20px;
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
</style>
