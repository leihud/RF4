<template>
  <div class="compare-page">
    <div class="compare-header">
      <h1>装备参数对比</h1>
      <button class="back-btn" @click="goBack">返回计算器</button>
    </div>

    <div class="compare-type-selector">
      <button 
        :class="['type-btn', { active: compareType === 'rod' }]"
        @click="switchType('rod')"
      >
        鱼竿对比
      </button>
      <button 
        :class="['type-btn', { active: compareType === 'reel' }]"
        @click="switchType('reel')"
      >
        渔轮对比
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

    <div class="compare-content">
      <div class="equipment-list">
        <h3>装备列表（点击添加到对比）</h3>
        <div class="list-container">
          <div
            v-for="(equipment, index) in filteredEquipment"
            :key="index"
            :class="['equipment-item', { selected: isInCompareList(equipment) }]"
            @click="toggleCompareItem(equipment)"
          >
            <span class="equipment-category-tag">{{ equipment.category }}</span>
            <span class="equipment-name">{{ equipment.model || equipment.equipmentName }}</span>
            <span v-if="compareType === 'rod'" class="equipment-strength">强度: {{ equipment.strengthKg }}</span>
            <span v-if="compareType === 'reel'" class="equipment-strength">锁轮: {{ equipment.lockTension }}</span>
          </div>
          <div v-if="filteredEquipment.length === 0" class="list-empty">
            未找到匹配的装备
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
              :key="equipment.equipmentName"
              class="compare-cell compare-equipment-cell"
            >
              <div class="equipment-header">
                <span class="equipment-name">{{ equipment.model || equipment.equipmentName }}</span>
                <button class="remove-btn" @click.stop="removeCompareItem(compareEquipmentList.indexOf(equipment))">×</button>
              </div>
              <span class="equipment-category">{{ equipment.subCategory || equipment.category }}</span>
            </div>
          </div>
          
          <template v-if="compareType === 'rod'">
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">强度</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'strengthKg') }]"
              >
                {{ equipment.strengthKg }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">长度</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'lengthM') }]"
              >
                {{ equipment.lengthM }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">质量</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'weightG') }]"
              >
                {{ equipment.weightG }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">测试</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'testG') }]"
              >
                {{ equipment.testG }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">灵敏度</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'sensitivity') }]"
              >
                {{ equipment.sensitivity }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">硬度</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.hardness }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">形式</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.form }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">结构</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.structure }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">能力</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.ability || '-' }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">评级</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.rating }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">等级要求</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                Lv.{{ equipment.levelReq }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">金币</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.goldPrice }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">银币</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.silverPrice }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">适配重</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.adaptWeight || '-' }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">描述</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.description || '-' }}
              </div>
            </div>
          </template>

          <template v-if="compareType === 'reel'">
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">锁轮拉力</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'lockTension') }]"
              >
                {{ equipment.lockTension }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">摩擦制动力</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'frictionForce') }]"
              >
                {{ equipment.frictionForce }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">传动比</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'transmissionRatio') }]"
              >
                {{ equipment.transmissionRatio }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">回线速度</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'lineSpeed') }]"
              >
                {{ equipment.lineSpeed }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">收线速度</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                :class="['compare-cell', { 'max-value': isMaxValue(equipment, 'windingSpeed') }]"
              >
                {{ equipment.windingSpeed }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">大小</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.size }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">形式</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.form }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">测试</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.test }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">评级</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.rating }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">等级要求</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                Lv.{{ equipment.levelReq }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">线轴容量</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.spoolCapacity || '-' }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">适配重</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.adaptWeight || '-' }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">防海水</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.saltwaterResistant || '-' }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">金币</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.goldPrice }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">银币</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.silverPrice }}
              </div>
            </div>
            <div class="compare-row">
              <div class="compare-cell compare-label-cell">描述</div>
              <div 
                v-for="equipment in compareEquipmentList" 
                :key="equipment.equipmentName"
                class="compare-cell"
              >
                {{ equipment.description || '-' }}
              </div>
            </div>
          </template>
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
export default {
  name: 'ComparePage',
  emits: ['back'],
  data() {
    return {
      compareType: 'rod',
      searchQuery: '',
      selectedCategory: '',
      rodData: [],
      reelData: [],
      compareEquipmentList: []
    }
  },
  mounted() {
    this.loadData()
  },
  computed: {
    categories() {
      const data = this.compareType === 'rod' ? this.rodData : this.reelData
      const cats = [...new Set(data.map(item => item.category).filter(c => c))]
      return cats.sort()
    },
    filteredEquipment() {
      const data = this.compareType === 'rod' ? this.rodData : this.reelData
      let filtered = [...data]

      if (this.selectedCategory) {
        filtered = filtered.filter(item => item.category === this.selectedCategory)
      }

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.trim().toLowerCase()
        
        filtered = filtered.filter(item => {
          const model = (item.model || '').toLowerCase()
          const name = (item.equipmentName || '').toLowerCase()
          
          const regex = new RegExp(`(?:^|\\s|_|-)${query}(?:$|\\s|_|-)`, 'i')
          const hasExactMatch = regex.test(item.model || '') || regex.test(item.equipmentName || '')
          const hasPrefix = model.startsWith(query) || name.startsWith(query)
          const hasSubstring = model.includes(query) || name.includes(query)
          
          return hasExactMatch || hasPrefix || hasSubstring
        })

        filtered.sort((a, b) => {
          const aModel = (a.model || '').toLowerCase()
          const bModel = (b.model || '').toLowerCase()
          const aName = (a.equipmentName || '').toLowerCase()
          const bName = (b.equipmentName || '').toLowerCase()

          const aExactMatch = aModel === query || aName === query
          const bExactMatch = bModel === query || bName === query
          
          if (aExactMatch && !bExactMatch) return -1
          if (!aExactMatch && bExactMatch) return 1

          const aStartsWith = aModel.startsWith(query) || aName.startsWith(query)
          const bStartsWith = bModel.startsWith(query) || bName.startsWith(query)
          
          if (aStartsWith && !bStartsWith) return -1
          if (!aStartsWith && bStartsWith) return 1

          const aWordMatch = new RegExp(`(?:^|\\s|_|-)${query}(?:$|\\s|_|-)`, 'i').test(a.model || '') ||
                              new RegExp(`(?:^|\\s|_|-)${query}(?:$|\\s|_|-)`, 'i').test(a.equipmentName || '')
          const bWordMatch = new RegExp(`(?:^|\\s|_|-)${query}(?:$|\\s|_|-)`, 'i').test(b.model || '') ||
                              new RegExp(`(?:^|\\s|_|-)${query}(?:$|\\s|_|-)`, 'i').test(b.equipmentName || '')
          
          if (aWordMatch && !bWordMatch) return -1
          if (!aWordMatch && bWordMatch) return 1

          return 0
        })
      }

      const seen = new Set()
      filtered = filtered.filter(item => {
        const key = item.model || item.equipmentName
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return filtered
    }
  },
  methods: {
    async loadData() {
      try {
        const [rodResponse, reelResponse] = await Promise.all([
          fetch('/rod_compare.json'),
          fetch('/reel_compare.json')
        ])
        this.rodData = await rodResponse.json()
        this.reelData = await reelResponse.json()
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    },
    switchType(type) {
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
        this.compareEquipmentList.push({...equipment})
      }
    },
    isInCompareList(equipment) {
      const key = this.getItemKey(equipment)
      return this.compareEquipmentList.some(item => this.getItemKey(item) === key)
    },
    getMaxValue(field) {
      if (!this.compareEquipmentList.length) return null
      let max = -Infinity
      this.compareEquipmentList.forEach(item => {
        const value = parseFloat(item[field])
        if (!isNaN(value) && value > max) {
          max = value
        }
      })
      return max === -Infinity ? null : max
    },
    isMaxValue(equipment, field) {
      const max = this.getMaxValue(field)
      if (max === null) return false
      const value = parseFloat(equipment[field])
      return !isNaN(value) && value === max
    },
    clearCompareList() {
      this.compareEquipmentList = []
    },
    removeCompareItem(index) {
      this.compareEquipmentList.splice(index, 1)
    },
    goBack() {
      this.$router.push('/')
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