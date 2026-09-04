<template>
  <div class="recognition-section">
    <div class="recognition-header">
      <h2>📷 截图识别装备</h2>
      <span class="recognition-badge">Beta</span>
    </div>
    <p class="recognition-desc">
      上传背包/仓库截图，AI 自动识别图中的鱼竿、渔轮并匹配价值。支持拖拽或点击上传。
    </p>

    <!-- 上传区 -->
    <div
      v-if="status !== 'done'"
      class="upload-zone"
      :class="{ dragging: isDragging }"
      @click="onZoneClick"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="file-input"
        @change="onFileChange"
      />
      <template v-if="status === 'loading'">
        <div class="spinner"></div>
        <div class="upload-hint">
          <strong>正在识别装备…</strong>
          <span>AI 识别大约需要 5~20 秒</span>
        </div>
      </template>
      <template v-else-if="previewUrl">
        <img :src="previewUrl" alt="预览" class="upload-preview" />
        <div class="upload-hint">
          <strong>已选择截图</strong>
          <span>点击下方按钮开始识别，或重新选择图片</span>
        </div>
        <button class="recognize-btn" @click.stop="startRecognize">开始识别</button>
      </template>
      <template v-else>
        <div class="upload-icon">🖼️</div>
        <div class="upload-hint">
          <strong>点击或拖拽上传截图</strong>
          <span>建议上传背包/仓库整页截图，JPEG/PNG 均可</span>
        </div>
      </template>
    </div>

    <!-- 错误提示 -->
    <div v-if="status === 'error'" class="recognition-error">
      <span>{{ errorMessage }}</span>
      <button class="retry-btn" @click="reset">重新上传</button>
    </div>

    <!-- 识别结果 -->
    <div v-if="status === 'done'" class="recognition-results">
      <div class="results-header">
        <span class="results-title">识别结果</span>
        <button class="clear-btn" @click="reset">重新识别</button>
      </div>

      <div v-if="items.length === 0" class="empty-result">
        未识别到任何装备，请尝试换一张更清晰的截图（背包/仓库界面）。
      </div>

      <div v-for="(item, index) in items" :key="index" class="result-card" :class="{ added: item.added }">
        <div class="result-main">
          <div class="result-info">
            <div class="result-name" :title="item.name">{{ item.name }}</div>
            <div class="result-qty">
              <label>数量</label>
              <input
                v-model.number="item.quantity"
                type="number"
                min="1"
                max="999"
                class="qty-input"
                :disabled="item.added"
              />
            </div>
          </div>

          <div class="result-match">
            <template v-if="item.matches.length > 0">
              <select v-model="item.selectedMatchKey" class="match-select" :disabled="item.added">
                <option
                  v-for="match in item.matches"
                  :key="matchKey(match)"
                  :value="matchKey(match)"
                >
                  {{ matchLabel(match) }}
                </option>
              </select>
              <div v-if="selectedMatch(item)" class="match-price">
                <span v-if="selectedMatch(item).silverPrice" class="price-silver">
                  {{ formatPrice(selectedMatch(item).silverPrice) }} 银币
                </span>
                <span v-if="selectedMatch(item).goldPrice" class="price-gold">
                  {{ formatPrice(selectedMatch(item).goldPrice) }} 金币
                </span>
              </div>
            </template>
            <div v-else class="no-match">未匹配到候选，建议手动搜索添加</div>
          </div>
        </div>

        <div class="result-actions">
          <button
            v-if="!item.added"
            class="add-match-btn"
            :disabled="item.matches.length === 0"
            @click="addItem(item)"
          >
            加入清单
          </button>
          <button v-else class="add-match-btn added" disabled>已加入</button>
          <button v-if="!item.added" class="skip-btn" @click="skipItem(index)">忽略</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { fetchWithTimeout } from '../utils/fetch.js'
import { formatPrice } from '../utils/display.js'

const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024
const MAX_UPLOAD_PIXELS = 1600
const MAX_BODY_BYTES = 2_800_000

export default {
  name: 'EquipmentRecognition',
  emits: ['add'],
  data() {
    return {
      status: 'idle',
      isDragging: false,
      errorMessage: '',
      previewUrl: '',
      currentFile: null,
      currentDataUrl: '',
      items: []
    }
  },
  beforeUnmount() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
  },
  methods: {
    formatPrice,
    onZoneClick() {
      if (this.status === 'loading') return
      this.$refs.fileInput.click()
    },
    onFileChange(e) {
      const file = e.target.files?.[0]
      if (file) this.processFile(file)
    },
    onDrop(e) {
      this.isDragging = false
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) {
        this.processFile(file)
      } else {
        this.setError('请上传图片文件（JPEG/PNG）')
      }
    },
    async processFile(file) {
      if (!file.type.startsWith('image/')) {
        this.setError('请上传图片文件（JPEG/PNG）')
        return
      }
      if (file.size > MAX_ORIGINAL_SIZE) {
        this.setError('图片过大，请选择不超过 10MB 的截图')
        return
      }

      this.currentFile = file
      this.status = 'idle'
      this.errorMessage = ''

      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
      this.previewUrl = URL.createObjectURL(file)
    },
    async startRecognize() {
      if (!this.currentFile) return
      this.status = 'loading'
      this.errorMessage = ''
      this.items = []

      try {
        this.currentDataUrl = await this.compressImage(this.currentFile)
        const bodySize = Math.round(this.currentDataUrl.length * 0.75)
        if (bodySize > MAX_BODY_BYTES) {
          this.setError('图片压缩后仍过大，请裁剪掉无关区域后再试')
          return
        }

        const response = await fetchWithTimeout(
          '/api/recognize',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ image: this.currentDataUrl })
          },
          45000
        )

        const result = await response.json()
        if (!response.ok || !result.success) {
          const code = result.code
          if (code === 'AI_NOT_CONFIGURED') {
            this.setError('识别服务未启用：请在 Cloudflare 控制台为该项目绑定 Workers AI（AI binding）。')
          } else if (code === 'AI_CALL_FAILED') {
            this.setError('AI 识别服务调用失败，请稍后重试。')
          } else {
            this.setError(result.message || '识别失败，请稍后重试')
          }
          return
        }

        const rawItems = Array.isArray(result.items) ? result.items : []
        this.items = rawItems.map((item) => {
          const matches = Array.isArray(item.matches) ? item.matches : []
          return {
            name: item.name || '',
            quantity: Math.max(1, Math.min(999, parseInt(item.quantity, 10) || 1)),
            matches,
            selectedMatchKey: matches.length ? this.matchKey(matches[0]) : '',
            added: false
          }
        })
        this.status = 'done'
      } catch (err) {
        console.error('recognize error:', err)
        if (err?.name === 'AbortError') {
          this.setError('识别请求超时，请稍后重试')
        } else {
          this.setError('网络异常，请检查连接后重试')
        }
      }
    },
    compressImage(file) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const maxSide = Math.max(img.width, img.height)
          const scale = maxSide > MAX_UPLOAD_PIXELS ? MAX_UPLOAD_PIXELS / maxSide : 1
          const width = Math.round(img.width * scale)
          const height = Math.round(img.height * scale)

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          let quality = 0.92
          let dataUrl = canvas.toDataURL('image/jpeg', quality)
          // 若压缩后仍过大，继续降低质量
          while (dataUrl.length * 0.75 > MAX_BODY_BYTES && quality > 0.5) {
            quality -= 0.1
            dataUrl = canvas.toDataURL('image/jpeg', quality)
          }
          resolve(dataUrl)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('图片加载失败'))
        }
        img.src = url
      })
    },
    matchKey(match) {
      return `${match.type}:${match.id}:${match.model}`
    },
    selectedMatch(item) {
      return item.matches.find((m) => this.matchKey(m) === item.selectedMatchKey) || item.matches[0] || null
    },
    matchLabel(match) {
      const parts = []
      if (match.equipmentName && match.equipmentName !== match.model) {
        parts.push(match.equipmentName)
      }
      parts.push(match.model)
      return parts.join(' — ')
    },
    addItem(item) {
      const match = this.selectedMatch(item)
      if (!match) return
      this.$emit('add', { type: match.type, equipment: match, quantity: item.quantity })
      item.added = true
    },
    skipItem(index) {
      this.items.splice(index, 1)
    },
    setError(message) {
      this.status = 'error'
      this.errorMessage = message
    },
    reset() {
      this.status = 'idle'
      this.errorMessage = ''
      this.items = []
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = ''
      }
      this.currentFile = null
      this.currentDataUrl = ''
    }
  }
}
</script>

<style scoped>
.recognition-section {
  background-color: var(--color-surface);
  border: 2px solid var(--color-primary-bg);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.recognition-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.recognition-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}

.recognition-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.recognition-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.upload-zone {
  position: relative;
  border: 2px dashed var(--color-border);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  background-color: var(--bg-secondary, #f8fafc);
}

.upload-zone:hover,
.upload-zone.dragging {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

.file-input {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  opacity: 0;
}

.upload-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.upload-hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.upload-hint strong {
  font-size: 15px;
  color: var(--text-main);
}

.upload-preview {
  max-width: 240px;
  max-height: 160px;
  border-radius: 8px;
  object-fit: cover;
  margin-bottom: 10px;
  border: 1px solid var(--color-border);
}

.recognize-btn,
.add-match-btn,
.retry-btn,
.clear-btn,
.skip-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.recognize-btn {
  margin-top: 10px;
  background: var(--color-primary);
  color: #fff;
}

.recognize-btn:hover {
  background: var(--color-primary-hover);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.recognition-error {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--color-danger-bg, #fdecea);
  border: 1px solid var(--color-danger, #c62828);
  border-radius: 8px;
  color: var(--color-danger, #c62828);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.recognition-results {
  margin-top: 12px;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.results-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.clear-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--text-secondary);
  padding: 6px 12px;
  font-size: 13px;
}

.clear-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.empty-result {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-secondary, #f8fafc);
  border-radius: 8px;
  font-size: 13px;
}

.result-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--color-surface);
  transition: background-color 0.2s;
}

.result-card.added {
  background: var(--color-success-bg, #e8f5e9);
  border-color: var(--color-success-border, #a5d6a7);
}

.result-main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.result-info {
  flex: 1 1 220px;
  min-width: 220px;
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 6px;
  word-break: break-word;
}

.result-qty {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.qty-input {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-main);
  background: var(--color-surface);
}

.result-match {
  flex: 2 1 260px;
  min-width: 260px;
}

.match-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-main);
  background: var(--color-surface);
}

.match-price {
  margin-top: 6px;
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.price-silver {
  color: var(--color-primary);
}

.price-gold {
  color: var(--color-warning-strong, #f9a825);
}

.no-match {
  padding: 8px;
  background: var(--color-danger-bg, #fdecea);
  border: 1px dashed var(--color-danger, #c62828);
  border-radius: 6px;
  color: var(--color-danger, #c62828);
  font-size: 13px;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.add-match-btn {
  background: var(--color-success-strong);
  color: #fff;
}

.add-match-btn:disabled {
  background: var(--color-border);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.add-match-btn.added {
  background: var(--color-success, #2e7d32);
}

.skip-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--text-secondary);
  padding: 8px 12px;
  font-size: 14px;
}

.skip-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

@media (max-width: 640px) {
  .result-main {
    flex-direction: column;
    gap: 8px;
  }

  .result-match,
  .result-info {
    flex: 1 1 100%;
    min-width: auto;
  }

  .result-actions {
    justify-content: flex-start;
  }
}
</style>
