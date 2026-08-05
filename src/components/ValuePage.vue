<template>
  <div class="value-page">
    <div class="page-header">
      <h1>装备价值统计</h1>
      <button class="back-btn" @click="$router.back()">← 返回计算器</button>
    </div>

    <!-- 装备选择区域 -->
    <div class="selection-section">
      <div class="selection-row">
        <!-- 鱼竿选择 -->
        <div class="multi-select-wrapper" ref="rodWrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('rod')">
            <span v-if="selectedRod" class="selected-text">{{ selectedRod.equipmentName || selectedRod.model }}</span>
            <span v-else class="placeholder-text">选择鱼竿...</span>
            <span class="dropdown-arrow">{{ showDropdown === 'rod' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'rod'" class="multi-select-dropdown">
            <input v-model="rodSearch" type="text" class="dropdown-search" placeholder="搜索鱼竿..." @click.stop />
            <div class="dropdown-list">
              <div v-for="rod in filteredRodList" :key="rod.id" class="dropdown-item" :class="{ selected: selectedRod && selectedRod.id === rod.id }" @click.stop="selectRod(rod)">
                <span class="item-text">{{ rod.equipmentName || rod.model }}</span>
                <span class="item-price">{{ formatPrice(rod.silverPrice) }} 银币</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 鱼竿数量 -->
        <div class="quantity-input-wrapper">
          <label>数量:</label>
          <input type="number" v-model.number="rodQuantity" min="1" class="quantity-input" />
        </div>
      </div>

      <div class="selection-row">
        <!-- 渔轮选择 -->
        <div class="multi-select-wrapper" ref="reelWrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('reel')">
            <span v-if="selectedReel" class="selected-text">{{ selectedReel.equipmentName || selectedReel.model }}</span>
            <span v-else class="placeholder-text">选择渔轮...</span>
            <span class="dropdown-arrow">{{ showDropdown === 'reel' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'reel'" class="multi-select-dropdown">
            <input v-model="reelSearch" type="text" class="dropdown-search" placeholder="搜索渔轮..." @click.stop />
            <div class="dropdown-list">
              <div v-for="reel in filteredReelList" :key="reel.id" class="dropdown-item" :class="{ selected: selectedReel && selectedReel.id === reel.id }" @click.stop="selectReel(reel)">
                <span class="item-text">{{ reel.equipmentName || reel.model }}</span>
                <span class="item-price">{{ formatPrice(reel.silverPrice) }} 银币</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 渔轮数量 -->
        <div class="quantity-input-wrapper">
          <label>数量:</label>
          <input type="number" v-model.number="reelQuantity" min="1" class="quantity-input" />
        </div>
      </div>
    </div>

    <!-- 价值统计 -->
    <div class="value-summary">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">鱼竿总价</span>
          <span class="summary-value silver">{{ formatPrice(rodTotalSilver) }} 银币</span>
        </div>
        <div class="summary-item">
          <span class="summary-label"></span>
          <span class="summary-value gold">{{ formatPrice(rodTotalGold) }} 金币</span>
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">渔轮总价</span>
          <span class="summary-value silver">{{ formatPrice(reelTotalSilver) }} 银币</span>
        </div>
        <div class="summary-item">
          <span class="summary-label"></span>
          <span class="summary-value gold">{{ formatPrice(reelTotalGold) }} 金币</span>
        </div>
      </div>

      <div class="summary-card total-card">
        <div class="summary-item">
          <span class="summary-label">总计</span>
          <span class="summary-value silver total">{{ formatPrice(totalSilver) }} 银币</span>
        </div>
        <div class="summary-item">
          <span class="summary-label"></span>
          <span class="summary-value gold total">{{ formatPrice(totalGold) }} 金币</span>
        </div>
      </div>
    </div>

    <!-- 已选装备列表 -->
    <div v-if="selectedItems.length > 0" class="selected-list">
      <h3>已选装备</h3>
      <div v-for="(item, index) in selectedItems" :key="index" class="selected-item">
        <span class="item-type">{{ item.type }}</span>
        <span class="item-name">{{ item.equipmentName || item.model }}</span>
        <span class="item-quantity">× {{ item.quantity }}</span>
        <span class="item-price silver">{{ formatPrice(item.silverPrice * item.quantity) }} 银币</span>
        <span class="item-price gold">{{ formatPrice(item.goldPrice * item.quantity) }} 金币</span>
        <button class="remove-btn" @click="removeItem(index)">✕</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ValuePage',
  data() {
    return {
      rodList: [],
      reelList: [],
      selectedRod: null,
      selectedReel: null,
      rodQuantity: 1,
      reelQuantity: 1,
      selectedItems: [],
      showDropdown: null,
      rodSearch: '',
      reelSearch: ''
    }
  },
  computed: {
    filteredRodList() {
      if (!this.rodSearch.trim()) return this.rodList
      const kw = this.rodSearch.toLowerCase()
      return this.rodList.filter(r => (r.equipmentName || r.model || '').toLowerCase().includes(kw))
    },
    filteredReelList() {
      if (!this.reelSearch.trim()) return this.reelList
      const kw = this.reelSearch.toLowerCase()
      return this.reelList.filter(r => (r.equipmentName || r.model || '').toLowerCase().includes(kw))
    },
    rodTotalSilver() {
      return this.selectedRod ? this.selectedRod.silverPrice * this.rodQuantity : 0
    },
    rodTotalGold() {
      return this.selectedRod ? this.selectedRod.goldPrice * this.rodQuantity : 0
    },
    reelTotalSilver() {
      return this.selectedReel ? this.selectedReel.silverPrice * this.reelQuantity : 0
    },
    reelTotalGold() {
      return this.selectedReel ? this.selectedReel.goldPrice * this.reelQuantity : 0
    },
    totalSilver() {
      return this.rodTotalSilver + this.reelTotalSilver + this.selectedItems.reduce((sum, item) => sum + item.silverPrice * item.quantity, 0)
    },
    totalGold() {
      return this.rodTotalGold + this.reelTotalGold + this.selectedItems.reduce((sum, item) => sum + item.goldPrice * item.quantity, 0)
    }
  },
  async mounted() {
    await Promise.all([this.loadRods(), this.loadReels()])
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    async loadRods() {
      try {
        const res = await fetch('/api/rods')
        const result = await res.json()
        this.rodList = Array.isArray(result) ? result : (result.data || [])
      } catch (e) { console.error('加载鱼竿失败:', e) }
    },
    async loadReels() {
      try {
        const res = await fetch('/api/reels')
        const result = await res.json()
        this.reelList = Array.isArray(result) ? result : (result.data || [])
      } catch (e) { console.error('加载渔轮失败:', e) }
    },
    toggleDropdown(type) {
      this.showDropdown = this.showDropdown === type ? null : type
    },
    selectRod(rod) {
      this.selectedRod = rod
      this.showDropdown = null
      this.rodSearch = ''
    },
    selectReel(reel) {
      this.selectedReel = reel
      this.showDropdown = null
      this.reelSearch = ''
    },
    handleClickOutside(e) {
      const wrappers = this.$el.querySelectorAll('.multi-select-wrapper')
      let inside = false
      for (const w of wrappers) {
        if (w.contains(e.target)) { inside = true; break }
      }
      if (!inside) this.showDropdown = null
    },
    formatPrice(price) {
      if (!price || price === 0) return '0'
      return Math.round(price).toLocaleString('zh-CN')
    },
    removeItem(index) {
      this.selectedItems.splice(index, 1)
    }
  }
}
</script>

<style scoped>
.value-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  color: #333;
  margin: 0;
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid #1565c0;
  background-color: white;
  color: #1565c0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: #e3f2fd;
}

.selection-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.selection-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: center;
}

.selection-row:last-child {
  margin-bottom: 0;
}

.multi-select-wrapper {
  flex: 1;
  position: relative;
}

.multi-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.multi-select-trigger:hover {
  border-color: #1565c0;
}

.selected-text {
  color: #333;
  font-weight: 500;
}

.placeholder-text {
  color: #999;
}

.dropdown-arrow {
  color: #666;
  font-size: 12px;
}

.multi-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-search {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid #eee;
  outline: none;
  font-size: 14px;
}

.dropdown-list {
  max-height: 250px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item.selected {
  background-color: #e3f2fd;
}

.item-text {
  color: #333;
  font-size: 14px;
}

.item-price {
  color: #888;
  font-size: 12px;
}

.quantity-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.quantity-input-wrapper label {
  color: #666;
  font-size: 14px;
  white-space: nowrap;
}

.quantity-input {
  width: 70px;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.quantity-input:focus {
  outline: none;
  border-color: #1565c0;
}

.value-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.total-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.total-card .summary-label {
  color: rgba(255, 255, 255, 0.9);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  color: #666;
  font-size: 14px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
}

.summary-value.silver {
  color: #1565c0;
}

.summary-value.gold {
  color: #e65100;
}

.summary-value.total {
  font-size: 20px;
}

.total-card .summary-value.silver,
.total-card .summary-value.gold {
  color: white;
}

.selected-list {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.selected-list h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.selected-item:last-child {
  border-bottom: none;
}

.item-type {
  padding: 4px 8px;
  background-color: #e3f2fd;
  color: #1565c0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.item-name {
  flex: 1;
  color: #333;
  font-size: 14px;
}

.item-quantity {
  color: #666;
  font-size: 14px;
  min-width: 50px;
  text-align: center;
}

.item-price {
  font-size: 13px;
  font-weight: 500;
  min-width: 100px;
  text-align: right;
}

.item-price.silver {
  color: #1565c0;
}

.item-price.gold {
  color: #e65100;
}

.remove-btn {
  padding: 4px 8px;
  border: 1px solid #e53935;
  background-color: white;
  color: #e53935;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.remove-btn:hover {
  background-color: #e53935;
  color: white;
}

@media (max-width: 768px) {
  .selection-row {
    flex-direction: column;
    align-items: stretch;
  }

  .quantity-input-wrapper {
    min-width: auto;
  }

  .value-summary {
    flex-direction: column;
  }

  .selected-item {
    flex-wrap: wrap;
  }

  .item-price {
    min-width: auto;
  }
}
</style>
