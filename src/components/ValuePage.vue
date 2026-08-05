<template>
  <div class="value-page">
    <div class="page-header">
      <h1>装备价值统计</h1>
      <button class="back-btn" @click="$router.back()">← 返回计算器</button>
    </div>

    <!-- 鱼竿列表 -->
    <div class="equipment-section">
      <div class="section-header">
        <h2>🎣 鱼竿</h2>
        <button class="add-btn" @click="addRodEntry">+ 添加鱼竿</button>
      </div>
      <div v-for="(entry, index) in rodEntries" :key="'rod-' + index" class="entry-row">
        <div class="search-dropdown">
          <div class="search-input-wrapper">
            <input
              type="text"
              class="search-input"
              v-model="entry.search"
              @input="onSearchInput(entry)"
              placeholder="搜索鱼竿..."
              @focus="entry.isDropdownOpen = true"
              @blur="onSearchBlur(entry, 'rod', index)"
            />
            <span class="search-icon">🔍</span>
          </div>
          <div v-if="entry.isDropdownOpen && getRodCategoryOptions(entry).length > 0" class="category-filter-header">
            <button class="category-toggle-btn" @mousedown.prevent="entry.showCategoryFilter = !entry.showCategoryFilter">
              {{ entry.showCategoryFilter ? '▼' : '▲' }} 装备类型
            </button>
          </div>
          <div v-if="entry.isDropdownOpen && entry.showCategoryFilter" class="category-filter-wrapper">
            <button
              v-for="cat in getRodCategoryOptions(entry)"
              :key="cat"
              :class="['category-filter-btn', { active: entry.selectedCategory === cat }]"
              @mousedown.prevent="entry.selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div v-if="entry.isDropdownOpen" class="dropdown-list">
            <div
              v-for="rod in getFilteredRodList(entry)"
              :key="rod.id"
              class="dropdown-item"
              @mousedown.prevent="selectEquipment(index, 'rod', rod, entry)"
            >
              <span class="dropdown-name">{{ rod.model }}</span>
              <span class="dropdown-form" v-if="rod.form">{{ rod.form }}</span>
              <span class="dropdown-category" v-if="getRatingAlias(rod.rating) !== '常规'">{{ getRatingAlias(rod.rating) }}</span>
              <span v-if="rod.ratingAlias && rod.ratingAlias !== '常规'" class="dropdown-rating">{{ rod.ratingAlias }}</span>
            </div>
            <div v-if="getFilteredRodList(entry).length === 0" class="dropdown-empty">未找到匹配的装备</div>
          </div>
        </div>
        <div class="quantity-input-wrapper">
          <label>数量:</label>
          <input type="number" v-model.number="entry.quantity" min="1" class="quantity-input" />
        </div>
        <div class="entry-subtotal" v-if="entry.equipment">
          <span class="subtotal-silver">{{ formatPrice(entry.equipment.silverPrice * entry.quantity) }} 银币</span>
          <span class="subtotal-gold">{{ formatPrice(entry.equipment.goldPrice * entry.quantity) }} 金币</span>
        </div>
        <button class="remove-entry-btn" @click="removeRodEntry(index)" title="删除">✕</button>
      </div>
      <div v-if="rodEntries.length === 0" class="empty-hint">点击「添加鱼竿」开始统计</div>
    </div>

    <!-- 渔轮列表 -->
    <div class="equipment-section">
      <div class="section-header">
        <h2>🎡 渔轮</h2>
        <button class="add-btn" @click="addReelEntry">+ 添加渔轮</button>
      </div>
      <div v-for="(entry, index) in reelEntries" :key="'reel-' + index" class="entry-row">
        <div class="search-dropdown">
          <div class="search-input-wrapper">
            <input
              type="text"
              class="search-input"
              v-model="entry.search"
              @input="onSearchInput(entry)"
              placeholder="搜索渔轮..."
              @focus="entry.isDropdownOpen = true"
              @blur="onSearchBlur(entry, 'reel', index)"
            />
            <span class="search-icon">🔍</span>
          </div>
          <div v-if="entry.isDropdownOpen && getReelCategoryOptions(entry).length > 0" class="category-filter-header">
            <button class="category-toggle-btn" @mousedown.prevent="entry.showCategoryFilter = !entry.showCategoryFilter">
              {{ entry.showCategoryFilter ? '▼' : '▲' }} 装备类型
            </button>
          </div>
          <div v-if="entry.isDropdownOpen && entry.showCategoryFilter" class="category-filter-wrapper">
            <button
              v-for="cat in getReelCategoryOptions(entry)"
              :key="cat"
              :class="['category-filter-btn', { active: entry.selectedCategory === cat }]"
              @mousedown.prevent="entry.selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div v-if="entry.isDropdownOpen" class="dropdown-list">
            <div
              v-for="reel in getFilteredReelList(entry)"
              :key="reel.id"
              class="dropdown-item"
              @mousedown.prevent="selectEquipment(index, 'reel', reel, entry)"
            >
              <span class="dropdown-name">{{ reel.model }}</span>
              <span class="dropdown-form" v-if="reel.form">{{ reel.form }}</span>
              <span class="dropdown-category" v-if="getRatingAlias(reel.rating) !== '常规'">{{ getRatingAlias(reel.rating) }}</span>
              <span v-if="reel.ratingAlias && reel.ratingAlias !== '常规'" class="dropdown-rating">{{ reel.ratingAlias }}</span>
            </div>
            <div v-if="getFilteredReelList(entry).length === 0" class="dropdown-empty">未找到匹配的装备</div>
          </div>
        </div>
        <div class="quantity-input-wrapper">
          <label>数量:</label>
          <input type="number" v-model.number="entry.quantity" min="1" class="quantity-input" />
        </div>
        <div class="entry-subtotal" v-if="entry.equipment">
          <span class="subtotal-silver">{{ formatPrice(entry.equipment.silverPrice * entry.quantity) }} 银币</span>
          <span class="subtotal-gold">{{ formatPrice(entry.equipment.goldPrice * entry.quantity) }} 金币</span>
        </div>
        <button class="remove-entry-btn" @click="removeReelEntry(index)" title="删除">✕</button>
      </div>
      <div v-if="reelEntries.length === 0" class="empty-hint">点击「添加渔轮」开始统计</div>
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
  </div>
</template>

<script>
import { searchAndRankEquipment, sortByPanelTension, EQUIPMENT_SEARCH_FIELDS } from '../utils/search.js'
import { getRatingAlias } from '../constants/equipment.js'

export default {
  name: 'ValuePage',
  data() {
    return {
      rodList: [],
      reelList: [],
      rodEntries: [],
      reelEntries: []
    }
  },
  computed: {
    rodTotalSilver() {
      return this.rodEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? entry.equipment.silverPrice * entry.quantity : 0)
      }, 0)
    },
    rodTotalGold() {
      return this.rodEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? entry.equipment.goldPrice * entry.quantity : 0)
      }, 0)
    },
    reelTotalSilver() {
      return this.reelEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? entry.equipment.silverPrice * entry.quantity : 0)
      }, 0)
    },
    reelTotalGold() {
      return this.reelEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? entry.equipment.goldPrice * entry.quantity : 0)
      }, 0)
    },
    totalSilver() {
      return this.rodTotalSilver + this.reelTotalSilver
    },
    totalGold() {
      return this.rodTotalGold + this.reelTotalGold
    }
  },
  async mounted() {
    await Promise.all([this.loadRods(), this.loadReels()])
  },
  methods: {
    getRatingAlias,
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
    getRodCategoryOptions(entry) {
      if (!Array.isArray(this.rodList)) return []
      const categories = [...new Set(this.rodList.map(item => item.form))].filter(Boolean)
      return ['全部', ...categories]
    },
    getReelCategoryOptions(entry) {
      if (!Array.isArray(this.reelList)) return []
      const categories = [...new Set(this.reelList.map(item => item.form))].filter(Boolean)
      return ['全部', ...categories]
    },
    getFilteredRodList(entry) {
      if (!Array.isArray(this.rodList)) return []
      let filtered = this.rodList

      if (entry.selectedCategory && entry.selectedCategory !== '全部') {
        filtered = filtered.filter(item => item.form === entry.selectedCategory)
      }

      if (entry.debouncedSearch && entry.debouncedSearch.trim()) {
        filtered = searchAndRankEquipment(filtered, entry.debouncedSearch, EQUIPMENT_SEARCH_FIELDS)
      } else {
        filtered = sortByPanelTension(filtered)
      }

      return filtered
    },
    getFilteredReelList(entry) {
      if (!Array.isArray(this.reelList)) return []
      let filtered = this.reelList

      if (entry.selectedCategory && entry.selectedCategory !== '全部') {
        filtered = filtered.filter(item => item.form === entry.selectedCategory)
      }

      if (entry.debouncedSearch && entry.debouncedSearch.trim()) {
        filtered = searchAndRankEquipment(filtered, entry.debouncedSearch, EQUIPMENT_SEARCH_FIELDS)
      } else {
        filtered = sortByPanelTension(filtered)
      }

      return filtered
    },
    addRodEntry() {
      this.rodEntries.push({
        equipment: null,
        quantity: 1,
        search: '',
        debouncedSearch: '',
        searchTimer: null,
        isDropdownOpen: false,
        selectedCategory: '',
        showCategoryFilter: false
      })
    },
    addReelEntry() {
      this.reelEntries.push({
        equipment: null,
        quantity: 1,
        search: '',
        debouncedSearch: '',
        searchTimer: null,
        isDropdownOpen: false,
        selectedCategory: '',
        showCategoryFilter: false
      })
    },
    removeRodEntry(index) {
      this.rodEntries.splice(index, 1)
    },
    removeReelEntry(index) {
      this.reelEntries.splice(index, 1)
    },
    selectEquipment(index, type, equipment, entry) {
      if (type === 'rod') {
        this.rodEntries[index].equipment = equipment
        this.rodEntries[index].search = equipment.model
      } else {
        this.reelEntries[index].equipment = equipment
        this.reelEntries[index].search = equipment.model
      }
      entry.isDropdownOpen = false
    },
    onSearchInput(entry) {
      if (entry.searchTimer) clearTimeout(entry.searchTimer)
      entry.searchTimer = setTimeout(() => {
        entry.debouncedSearch = entry.search
      }, 200)
    },
    onSearchBlur(entry, type, index) {
      // 延迟关闭，让点击事件先触发
      setTimeout(() => {
        entry.isDropdownOpen = false
        // 如果已选择装备，恢复显示model
        if (entry.equipment) {
          entry.search = entry.equipment.model
        }
      }, 200)
    },
    formatPrice(price) {
      if (!price || price === 0) return '0'
      return Math.round(price).toLocaleString('zh-CN')
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

.equipment-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.add-btn {
  padding: 8px 16px;
  border: 1px solid #43a047;
  background-color: white;
  color: #43a047;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.add-btn:hover {
  background-color: #e8f5e9;
}

.entry-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.entry-row:last-child {
  margin-bottom: 0;
}

.search-dropdown {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #42b983;
  border-radius: 4px;
  font-size: 14px;
  color: #2c3e50;
  background-color: white;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.search-input::placeholder {
  color: #999;
}

.search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
}

.category-filter-header {
  padding: 8px 15px;
  background-color: #f0fdf4;
  border-bottom: 1px solid #dcfce7;
}

.category-toggle-btn {
  padding: 4px 12px;
  border: none;
  background-color: transparent;
  color: #16a34a;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.category-toggle-btn:hover {
  color: #22c55e;
}

.category-filter-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 15px;
  background-color: #f0fdf4;
  border-bottom: 1px solid #dcfce7;
}

.category-filter-btn {
  padding: 4px 12px;
  border: 1px solid #bbf7d0;
  background-color: white;
  color: #16a34a;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-filter-btn:hover {
  background-color: #dcfce7;
}

.category-filter-btn.active {
  background-color: #22c55e;
  color: white;
  border-color: #22c55e;
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
  gap: 18px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #e8f5e9;
}

.dropdown-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.dropdown-type {
  flex: 0 0 auto;
  min-width: 56px;
  max-width: 100px;
  padding: 4px 12px;
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-form {
  flex: 0 0 auto;
  min-width: 56px;
  max-width: 100px;
  padding: 4px 12px;
  background-color: #f3e8ff;
  color: #7c3aed;
  border: 1px solid #c4b5fd;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-category {
  flex: 0 0 auto;
  min-width: 68px;
  max-width: 120px;
  padding: 4px 12px;
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-rating {
  flex: 0 0 auto;
  min-width: 60px;
  max-width: 100px;
  padding: 4px 12px;
  background-color: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: auto;
}

.dropdown-empty {
  padding: 15px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.quantity-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 110px;
  flex-shrink: 0;
}

.quantity-input-wrapper label {
  color: #666;
  font-size: 14px;
  white-space: nowrap;
}

.quantity-input {
  width: 60px;
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

.entry-subtotal {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 130px;
  flex-shrink: 0;
}

.subtotal-silver {
  color: #1565c0;
  font-size: 13px;
  font-weight: 600;
}

.subtotal-gold {
  color: #e65100;
  font-size: 13px;
  font-weight: 600;
}

.remove-entry-btn {
  padding: 6px 10px;
  border: 1px solid #e53935;
  background-color: white;
  color: #e53935;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-entry-btn:hover {
  background-color: #e53935;
  color: white;
}

.empty-hint {
  text-align: center;
  color: #999;
  padding: 20px;
  font-size: 14px;
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

@media (max-width: 768px) {
  .entry-row {
    flex-wrap: wrap;
  }

  .search-dropdown {
    min-width: 100%;
  }

  .quantity-input-wrapper {
    min-width: auto;
  }

  .entry-subtotal {
    min-width: auto;
    flex-direction: row;
    gap: 12px;
  }

  .value-summary {
    flex-direction: column;
  }
}
</style>
