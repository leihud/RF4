<template>
  <div class="compare-page">
    <div class="compare-header">
      <h1>参数对比</h1>
      <button class="back-btn" @click="goBack">返回计算器</button>
    </div>

    <div class="compare-type-selector">
      <button
        v-for="opt in typeOptions"
        :key="opt.value"
        :class="['type-btn', { active: compareType === opt.value }]"
        @click="switchType(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="compare-search-section">
      <div class="search-input-wrapper">
        <input
          type="text"
          class="search-input"
          v-model="searchQuery"
          placeholder="搜索型号/分组..."
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="category-filter">
        <select v-model="selectedCategory" class="category-select">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
    </div>

    <div v-if="isInitialLoading && rodData.length === 0 && reelData.length === 0" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <span class="loading-text">正在加载装备数据...</span>
    </div>

    <div v-if="dataLoadError" class="error-wrapper">
      <span class="error-icon">❌</span>
      <span class="error-text">装备对比数据加载失败，请刷新页面重试</span>
    </div>

    <div v-if="!isInitialLoading && !dataLoadError" class="compare-content">
      <div class="equipment-list">
        <h3>装备列表(点击添加到对比)</h3>
        <div class="list-container" @scroll="handleListScroll">
          <div
            v-for="equipment in filteredEquipment"
            :key="getItemKey(equipment)"
            :class="['equipment-item', { selected: isInCompareList(equipment) }]"
            @click="toggleCompareItem(equipment)"
          >
            <span class="equipment-category-tag">{{ equipment.category }}</span>
            <span class="equipment-name">{{ equipment.model || equipment.equipmentName }}</span>
            <span v-if="compareType === 'rod'" class="equipment-strength">
              强度: {{ equipment.strengthKg }}
            </span>
            <span v-else class="equipment-strength">
              锁轮: {{ equipment.lockTension }}
            </span>
          </div>
          <div v-if="filteredEquipment.length === 0" class="list-empty">
            未找到匹配的装备
          </div>
          <div v-if="isScrollLoading" class="list-loading">
            加载中...
          </div>
          <div v-if="!isScrollLoading && !hasMoreData && filteredEquipment.length > 0" class="list-no-more">
            已加载全部
          </div>
        </div>
      </div>

      <div v-if="compareEquipmentList.length > 0" class="compare-panel">
        <div class="panel-header">
          <h3>对比面板 ({{ compareEquipmentList.length }})</h3>
          <button class="clear-btn" @click="clearCompareList">清空</button>
        </div>
        <div class="compare-table">
          <div class="compare-row compare-header-row">
            <div class="compare-cell compare-label-cell">参数</div>
            <div
              v-for="equipment in compareEquipmentList"
              :key="getItemKey(equipment)"
              class="compare-cell compare-equipment-cell"
            >
              <div class="equipment-header">
                <span class="equipment-name">{{ equipment.model || equipment.equipmentName }}</span>
                <button
                  class="remove-btn"
                  aria-label="移除对比项"
                  @click.stop="removeCompareItem(equipment)"
                >×</button>
              </div>
              <span class="equipment-category">{{ equipment.subCategory || equipment.category }}</span>
            </div>
          </div>

          <div
            v-for="row in currentCompareRows"
            :key="row.field"
            class="compare-row"
          >
            <div class="compare-cell compare-label-cell">{{ row.label }}</div>
            <div
              v-for="equipment in compareEquipmentList"
              :key="getItemKey(equipment)"
              :class="['compare-cell', { 'max-value': row.highlight && isFieldMax(equipment, row.field) }]"
            >
              {{ formatCellValue(equipment, row) }}
            </div>
          </div>

          <div v-for="row in costEffectivenessRows" :key="row.field" class="compare-row">
            <div class="compare-cell compare-label-cell">{{ row.label }}</div>
            <div
              v-for="equipment in compareEquipmentList"
              :key="getItemKey(equipment)"
              :class="['compare-cell', { 'max-value': isBestCostEffectiveness(equipment, row.field) }]"
            >
              {{ formatCostEffectiveness(equipment, row.field) }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="compare-panel empty-panel">
        <div class="empty-hint">
          <span class="hint-icon">📋</span>
          <p>点击左侧装备添加到对比</p>
          <p>支持选择多个装备进行参数对比</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { searchAndRankEquipment } from '../utils/search.js'

const COMPARE_ROWS = {
  rod: [
    { label: '强度', field: 'strengthKg', highlight: true },
    { label: '长度', field: 'lengthM', highlight: true },
    { label: '质量', field: 'weightG', highlight: true },
    { label: '测试', field: 'testG', highlight: true },
    { label: '灵敏度', field: 'sensitivity', highlight: true },
    { label: '硬度', field: 'hardness' },
    { label: '形式', field: 'form' },
    { label: '结构', field: 'structure' },
    { label: '能力', field: 'ability', fallback: '-' },
    { label: '评级', field: 'rating' },
    { label: '等级要求', field: 'levelReq', format: v => `Lv.${v}` },
    { label: '适配重', field: 'adaptWeight', fallback: '-' },
    { label: '描述', field: 'description', fallback: '-' }
  ],
  reel: [
    { label: '锁轮拉力', field: 'lockTension', highlight: true },
    { label: '摩擦制动力', field: 'frictionForce', highlight: true },
    { label: '传动比', field: 'transmissionRatio', highlight: true },
    { label: '回线速度', field: 'lineSpeed', highlight: true },
    { label: '收线速度', field: 'windingSpeed', highlight: true },
    { label: '大小', field: 'size' },
    { label: '形式', field: 'form' },
    { label: '测试', field: 'test' },
    { label: '评级', field: 'rating' },
    { label: '等级要求', field: 'levelReq', format: v => `Lv.${v}` },
    { label: '线轴容量', field: 'spoolCapacity', fallback: '-' },
    { label: '适配重', field: 'adaptWeight', fallback: '-' },
    { label: '防海水', field: 'saltwaterResistant', fallback: '-' },
    { label: '描述', field: 'description', fallback: '-' }
  ]
}

const TYPE_OPTIONS = [
  { value: 'rod', label: '鱼竿对比' },
  { value: 'reel', label: '渔轮对比' }
]

export default {
  name: 'ComparePage',
  data() {
    return {
      typeOptions: TYPE_OPTIONS,
      compareType: 'rod',
      searchQuery: '',
      debouncedSearchQuery: '',
      selectedCategory: '',
      rodData: [],
      reelData: [],
      compareEquipmentList: [],
      isInitialLoading: false,
      isScrollLoading: false,
      dataLoadError: false,
      searchTimeout: null,
      rodOffset: 0,
      reelOffset: 0,
      rodHasMore: true,
      reelHasMore: true
    }
  },
  mounted() {
    this.loadData()
  },
  beforeUnmount() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
  },
  watch: {
    searchQuery(val) {
      if (this.searchTimeout) clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.debouncedSearchQuery = val
      }, 200)
    }
  },
  computed: {
    categories() {
      const data = this.compareType === 'rod' ? this.rodData : this.reelData
      return [...new Set(data.map(item => item.category).filter(Boolean))].sort()
    },
    hasMoreData() {
      return this.compareType === 'rod' ? this.rodHasMore : this.reelHasMore
    },
    filteredEquipment() {
      const data = this.compareType === 'rod' ? this.rodData : this.reelData
      let filtered = data
      if (this.selectedCategory) {
        filtered = filtered.filter(item => item.category === this.selectedCategory)
      }
      filtered = searchAndRankEquipment(filtered, this.debouncedSearchQuery, ['model', 'equipmentName'])
      const seen = new Set()
      return filtered.filter(item => {
        const key = this.getItemKey(item)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    },
    currentCompareRows() {
      return COMPARE_ROWS[this.compareType] || []
    },
    costEffectivenessRows() {
      if (this.compareEquipmentList.length === 0) return []
      if (this.compareType === 'rod') {
        return [{ label: '强度性价比(每100银币)', field: 'strengthKg' }]
      }
      return [
        { label: '锁轮拉力性价比(每100银币)', field: 'lockTension' },
        { label: '摩擦制动力性价比(每100银币)', field: 'frictionForce' }
      ]
    },
    fieldMaxValues() {
      const result = {}
      for (const row of this.currentCompareRows) {
        if (!row.highlight) continue
        let max = -Infinity
        for (const eq of this.compareEquipmentList) {
          const v = this.extractNumber(eq[row.field])
          if (!Number.isNaN(v) && v > max) max = v
        }
        result[row.field] = max === -Infinity ? null : max
      }
      return result
    },
    costEffectivenessValues() {
      const result = {}
      const fields = this.compareType === 'rod' ? ['strengthKg'] : ['lockTension', 'frictionForce']
      for (const field of fields) {
        let max = -Infinity
        for (const eq of this.compareEquipmentList) {
          const price = this.extractNumber(eq.silverPrice)
          const value = this.extractNumber(eq[field])
          if (!Number.isNaN(price) && price > 0 && !Number.isNaN(value) && value > 0) {
            const ce = (value / price) * 100
            if (ce > max) max = ce
          }
        }
        result[field] = max === -Infinity ? null : max
      }
      return result
    }
  },
  methods: {
    extractNumber(str) {
      if (str == null) return NaN
      const match = String(str).match(/[\d.]+/)
      return match ? parseFloat(match[0]) : NaN
    },
    async loadData() {
      this.rodOffset = 0
      this.reelOffset = 0
      this.rodHasMore = true
      this.reelHasMore = true
      this.rodData = []
      this.reelData = []
      this.isInitialLoading = true
      this.dataLoadError = false
      try {
        const requests = []
        if (this.rodHasMore) {
          requests.push(fetch(`/api/rods?limit=10&offset=${this.rodOffset}`))
        }
        if (this.reelHasMore) {
          requests.push(fetch(`/api/reels?limit=10&offset=${this.reelOffset}`))
        }
        
        const responses = await Promise.all(requests)
        let index = 0
        
        if (this.rodHasMore) {
          const rodResponse = responses[index++]
          if (!rodResponse.ok) {
            const errorText = await rodResponse.text()
            console.error('鱼竿API响应错误:', rodResponse.status, errorText)
            throw new Error(`鱼竿API HTTP ${rodResponse.status}: ${errorText}`)
          }
          const rodResult = await rodResponse.json()
          this.rodData = [...this.rodData, ...rodResult.data]
          this.rodOffset += rodResult.data.length
          this.rodHasMore = rodResult.hasMore || false
        }
        
        if (this.reelHasMore) {
          const reelResponse = responses[index++]
          if (!reelResponse.ok) {
            const errorText = await reelResponse.text()
            console.error('渔轮API响应错误:', reelResponse.status, errorText)
            throw new Error(`渔轮API HTTP ${reelResponse.status}: ${errorText}`)
          }
          const reelResult = await reelResponse.json()
          this.reelData = [...this.reelData, ...reelResult.data]
          this.reelOffset += reelResult.data.length
          this.reelHasMore = reelResult.hasMore || false
        }
        
        console.log('装备对比数据加载成功:', this.rodData.length, '条鱼竿,', this.reelData.length, '条渔轮')
      } catch (error) {
        console.error('加载数据失败:', error)
        this.dataLoadError = true
      } finally {
        this.isInitialLoading = false
      }
    },
    async loadMoreData() {
      if (this.isScrollLoading) return
      this.isScrollLoading = true
      try {
        const requests = []
        if (this.rodHasMore) {
          requests.push(fetch(`/api/rods?limit=10&offset=${this.rodOffset}`))
        }
        if (this.reelHasMore) {
          requests.push(fetch(`/api/reels?limit=10&offset=${this.reelOffset}`))
        }
        
        const responses = await Promise.all(requests)
        let index = 0
        
        if (this.rodHasMore) {
          const rodResponse = responses[index++]
          if (!rodResponse.ok) {
            const errorText = await rodResponse.text()
            console.error('鱼竿API响应错误:', rodResponse.status, errorText)
            throw new Error(`鱼竿API HTTP ${rodResponse.status}: ${errorText}`)
          }
          const rodResult = await rodResponse.json()
          this.rodData = [...this.rodData, ...rodResult.data]
          this.rodOffset += rodResult.data.length
          this.rodHasMore = rodResult.hasMore || false
        }
        
        if (this.reelHasMore) {
          const reelResponse = responses[index++]
          if (!reelResponse.ok) {
            const errorText = await reelResponse.text()
            console.error('渔轮API响应错误:', reelResponse.status, errorText)
            throw new Error(`渔轮API HTTP ${reelResponse.status}: ${errorText}`)
          }
          const reelResult = await reelResponse.json()
          this.reelData = [...this.reelData, ...reelResult.data]
          this.reelOffset += reelResult.data.length
          this.reelHasMore = reelResult.hasMore || false
        }
        
        console.log('装备对比数据加载成功:', this.rodData.length, '条鱼竿,', this.reelData.length, '条渔轮')
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        this.isScrollLoading = false
      }
    },
    switchType(type) {
      if (this.compareType === type) return
      this.compareType = type
      this.compareEquipmentList = []
      this.searchQuery = ''
      this.selectedCategory = ''
    },
    getItemKey(equipment) {
      return equipment.model || equipment.equipmentName
    },
    toggleCompareItem(equipment) {
      const key = this.getItemKey(equipment)
      const index = this.compareEquipmentList.findIndex(item => this.getItemKey(item) === key)
      if (index >= 0) {
        this.compareEquipmentList.splice(index, 1)
      } else {
        this.compareEquipmentList.push({ ...equipment })
      }
    },
    isInCompareList(equipment) {
      const key = this.getItemKey(equipment)
      return this.compareEquipmentList.some(item => this.getItemKey(item) === key)
    },
    isFieldMax(equipment, field) {
      const max = this.fieldMaxValues[field]
      if (max === null || max === undefined) return false
      const v = this.extractNumber(equipment[field])
      return !Number.isNaN(v) && v === max
    },
    formatValue(value, fallback = '-') {
      if (value === null || value === undefined || value === '') return fallback
      return value
    },
    formatCellValue(equipment, row) {
      const raw = equipment[row.field]
      if (raw === null || raw === undefined || raw === '') {
        return row.fallback || '-'
      }
      if (typeof row.format === 'function') return row.format(raw)
      return raw
    },
    clearCompareList() {
      this.compareEquipmentList = []
    },
    removeCompareItem(equipment) {
      const key = this.getItemKey(equipment)
      const index = this.compareEquipmentList.findIndex(item => this.getItemKey(item) === key)
      if (index >= 0) this.compareEquipmentList.splice(index, 1)
    },
    handleListScroll(event) {
      const target = event.target
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
        this.loadMoreData()
      }
    },
    goBack() {
      this.$router.push('/')
    },
    formatCostEffectiveness(equipment, field) {
      const price = this.extractNumber(equipment.silverPrice)
      const value = this.extractNumber(equipment[field])
      if (Number.isNaN(price) || price <= 0 || Number.isNaN(value) || value <= 0) {
        return '-'
      }
      return ((value / price) * 100).toFixed(4)
    },
    isBestCostEffectiveness(equipment, field) {
      const max = this.costEffectivenessValues[field]
      if (max === null || max === undefined) return false
      const price = this.extractNumber(equipment.silverPrice)
      const value = this.extractNumber(equipment[field])
      if (Number.isNaN(price) || price <= 0 || Number.isNaN(value) || value <= 0) {
        return false
      }
      return Math.abs(((value / price) * 100) - max) < 0.0001
    }
  }
}
</script>

<style scoped>
.compare-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e3f2fd;
}

.compare-header h1 {
  color: #1565c0;
  font-size: 28px;
  margin: 0;
}

.back-btn {
  padding: 10px 24px;
  border: 2px solid #1565c0;
  background-color: white;
  color: #1565c0;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.back-btn:hover {
  background-color: #e3f2fd;
}

.compare-type-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.type-btn {
  padding: 12px 36px;
  border: 2px solid #1565c0;
  background-color: white;
  color: #1565c0;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s;
}

.type-btn:hover {
  background-color: #e3f2fd;
}

.type-btn.active {
  background-color: #1565c0;
  color: white;
}

.compare-search-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 250px;
  max-width: 450px;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 18px;
  border: 2px solid #1565c0;
  border-radius: 25px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.2);
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
}

.category-select {
  padding: 10px 20px;
  border: 2px solid #1e88e5;
  border-radius: 25px;
  font-size: 14px;
  color: #333;
  background-color: white;
  cursor: pointer;
  outline: none;
  min-width: 140px;
}

.category-select:hover {
  border-color: #1565c0;
}

.loading-wrapper,
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  margin-bottom: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1565c0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.error-text {
  color: #c62828;
  font-size: 16px;
  font-weight: 500;
}

.compare-content {
  display: flex;
  gap: 24px;
  min-height: 550px;
}

.equipment-list {
  width: 360px;
  flex-shrink: 0;
}

.equipment-list h3 {
  color: #1565c0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}

.list-container {
  background-color: white;
  border: 2px solid #e3f2fd;
  border-radius: 10px;
  max-height: 650px;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.equipment-item {
  padding: 14px 18px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.equipment-item:last-child {
  border-bottom: none;
}

.equipment-item:hover {
  background-color: #e3f2fd;
}

.equipment-item.selected {
  background-color: #bbdefb;
  border-left: 4px solid #1565c0;
}

.equipment-category-tag {
  font-size: 11px;
  color: white;
  background-color: #64b5f6;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-right: 10px;
  white-space: nowrap;
}

.equipment-item .equipment-name {
  font-size: 13px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12px;
}

.equipment-strength {
  font-size: 12px;
  color: #1565c0;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}

.list-empty {
  padding: 40px;
  text-align: center;
  color: #999;
}

.list-loading {
  padding: 15px;
  text-align: center;
  color: #1565c0;
  font-size: 14px;
}

.list-no-more {
  padding: 15px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.compare-panel {
  flex: 1;
  background-color: white;
  border: 2px solid #e3f2fd;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: #e3f2fd;
  border-bottom: 2px solid #1565c0;
  border-radius: 8px 8px 0 0;
}

.panel-header h3 {
  color: #1565c0;
  margin: 0;
  font-size: 16px;
}

.clear-btn {
  padding: 8px 16px;
  border: 1px solid #90caf9;
  background-color: white;
  color: #1565c0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #90caf9;
  color: white;
}

.compare-table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  flex: 1;
  overflow-x: auto;
}

.compare-row {
  display: table-row;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.compare-row:not(.compare-header-row):hover {
  background-color: #fafafa;
}

.compare-row:nth-child(even):not(.compare-header-row) {
  background-color: #fafafa;
}

.compare-row:nth-child(even):not(.compare-header-row):hover {
  background-color: #f0f0f0;
}

.compare-header-row {
  background-color: #1e88e5;
  color: white;
}

.compare-header-row:hover {
  background-color: #1e88e5;
}

.compare-header-row .compare-cell {
  color: white;
}

.compare-header-row .equipment-header .equipment-name {
  color: white;
}

.compare-header-row .equipment-category {
  color: rgba(255, 255, 255, 0.8);
}

.compare-header-row .compare-label-cell {
  background-color: #1e88e5;
  color: white;
  text-align: center;
}

.compare-cell {
  display: table-cell;
  padding: 12px 16px;
  font-size: 13px;
  text-align: center;
  vertical-align: middle;
}

.compare-label-cell {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
  text-align: center;
  min-width: 100px;
  white-space: nowrap;
}

.compare-equipment-cell {
  min-width: 200px;
}

.equipment-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 6px;
  position: relative;
}

.equipment-header .equipment-name {
  font-weight: bold;
  color: #1e88e5;
  font-size: 14px;
  text-align: center;
}

.equipment-category {
  font-size: 11px;
  color: #666;
  text-align: center;
  display: block;
}

.remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  background-color: #ef5350;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: -8px;
  top: -8px;
  transition: transform 0.2s;
}

.remove-btn:hover {
  background-color: #e53935;
  transform: scale(1.1);
}

.max-value {
  color: #e53935;
  font-weight: bold;
  background-color: #fff3e0;
}

.empty-panel {
  align-items: center;
  justify-content: center;
}

.empty-hint {
  text-align: center;
  color: #999;
}

.hint-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 15px;
}

.empty-hint p {
  margin: 5px 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  .compare-content {
    flex-direction: column;
  }

  .equipment-list {
    width: 100%;
  }

  .list-container {
    max-height: 300px;
  }

  .compare-header h1 {
    font-size: 22px;
  }

  .type-btn {
    padding: 8px 20px;
    font-size: 14px;
  }
}
</style>