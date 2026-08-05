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
        <div class="multi-select-wrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('rod-' + index)">
            <span v-if="entry.equipment" class="selected-text">{{ entry.equipment.equipmentName || entry.equipment.model }}</span>
            <span v-else class="placeholder-text">选择鱼竿...</span>
            <span class="dropdown-arrow">{{ showDropdown === 'rod-' + index ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'rod-' + index" class="multi-select-dropdown">
            <input v-model="entry.search" type="text" class="dropdown-search" placeholder="搜索鱼竿..." @click.stop />
            <div class="dropdown-list">
              <div v-for="rod in getFilteredRodList(entry.search)" :key="rod.id" class="dropdown-item" @click.stop="selectEquipment(index, 'rod', rod)">
                <span class="item-text">{{ rod.equipmentName || rod.model }}</span>
                <span class="item-price">{{ formatPrice(rod.silverPrice) }} 银币</span>
              </div>
            </div>
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
        <div class="multi-select-wrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('reel-' + index)">
            <span v-if="entry.equipment" class="selected-text">{{ entry.equipment.equipmentName || entry.equipment.model }}</span>
            <span v-else class="placeholder-text">选择渔轮...</span>
            <span class="dropdown-arrow">{{ showDropdown === 'reel-' + index ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'reel-' + index" class="multi-select-dropdown">
            <input v-model="entry.search" type="text" class="dropdown-search" placeholder="搜索渔轮..." @click.stop />
            <div class="dropdown-list">
              <div v-for="reel in getFilteredReelList(entry.search)" :key="reel.id" class="dropdown-item" @click.stop="selectEquipment(index, 'reel', reel)">
                <span class="item-text">{{ reel.equipmentName || reel.model }}</span>
                <span class="item-price">{{ formatPrice(reel.silverPrice) }} 银币</span>
              </div>
            </div>
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
export default {
  name: 'ValuePage',
  data() {
    return {
      rodList: [],
      reelList: [],
      rodEntries: [],
      reelEntries: [],
      showDropdown: null
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
    getFilteredRodList(search) {
      if (!search || !search.trim()) return this.rodList
      const kw = search.toLowerCase()
      return this.rodList.filter(r => (r.equipmentName || r.model || '').toLowerCase().includes(kw))
    },
    getFilteredReelList(search) {
      if (!search || !search.trim()) return this.reelList
      const kw = search.toLowerCase()
      return this.reelList.filter(r => (r.equipmentName || r.model || '').toLowerCase().includes(kw))
    },
    addRodEntry() {
      this.rodEntries.push({ equipment: null, quantity: 1, search: '' })
    },
    addReelEntry() {
      this.reelEntries.push({ equipment: null, quantity: 1, search: '' })
    },
    removeRodEntry(index) {
      this.rodEntries.splice(index, 1)
    },
    removeReelEntry(index) {
      this.reelEntries.splice(index, 1)
    },
    toggleDropdown(key) {
      this.showDropdown = this.showDropdown === key ? null : key
    },
    selectEquipment(index, type, equipment) {
      if (type === 'rod') {
        this.rodEntries[index].equipment = equipment
        this.rodEntries[index].search = ''
      } else {
        this.reelEntries[index].equipment = equipment
        this.reelEntries[index].search = ''
      }
      this.showDropdown = null
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
  min-height: 42px;
}

.multi-select-trigger:hover {
  border-color: #1565c0;
}

.selected-text {
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.placeholder-text {
  color: #999;
  font-size: 14px;
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
  box-sizing: border-box;
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

  .multi-select-wrapper {
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
