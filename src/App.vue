<template>
  <div class="app">
    <div class="header">
      <h1>最大拉力磨损计算器（非盈利商业行为，个人使用）</h1>
    
      <button class="refresh-btn" @click="loadEquipmentData">🔄 刷新数据</button>
    </div>

    <div class="equipment-selector">
      <h2>选择装备类型</h2>
      <div class="type-buttons">
        <div
          v-for="type in equipmentTypes"
          :key="type"
          :class="{ active: selectedType === type }"
          class="type-item"
        >
          <span class="type-label">{{ type }}</span>
          <div class="type-value">
            <template v-if="type === '主线' || type === '引线'">
              <div class="custom-input-group">
                <span class="input-label">拉力：</span>
                <input
                  type="number"
                  class="tension-input"
                  v-model.number="customEquipment[type].maxTension"
                  placeholder="0"
                  min="0"
                />
                <span class="input-unit">kN</span>
                <span class="input-label">磨损度：</span>
                <input
                  type="number"
                  class="wear-input"
                  v-model.number="customEquipment[type].wear"
                  placeholder="0"
                  min="0"
                  max="100"
                />
                <span class="input-unit">%</span>
                <span class="actual-tension">实际拉力：{{ calculateCustomActualTension(type) }} kN</span>
              </div>
            </template>
            <template v-else>
              <template v-if="getSelectedEquipmentByType(type)">
                <span class="selected-name">{{ getSelectedEquipmentByType(type).equipmentName }}</span>
                <span class="selected-tension">{{ getSelectedEquipmentByType(type).maxTension }} kN</span>
                <div class="wear-input-wrapper">
                  <span class="wear-label">磨损度：</span>
                  <input
                    type="number"
                    class="wear-input"
                    v-model.number="getSelectedEquipmentByType(type).wear"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  <span class="wear-unit">%</span>
                </div>
                <span class="actual-tension">实际拉力：{{ calculateActualTension(getSelectedEquipmentByType(type)) }} kN</span>
                <button class="clear-btn" @click.stop="clearEquipmentByType(type)">×</button>
              </template>
              <template v-else>
                <span class="placeholder">未选择</span>
              </template>
            </template>
          </div>
          <div v-if="(type === '鱼竿' || type === '渔轮') && selectedType === type"
            class="search-dropdown"
            ref="dropdownRef"
          >
            <div class="search-input-wrapper">
              <input
                type="text"
                class="search-input"
                v-model="searchQuery"
                placeholder="搜索装备名称..."
                @click.stop="isDropdownOpen = !isDropdownOpen"
              />
              <span class="search-icon">🔍</span>
            </div>
            <div class="tension-filter-wrapper" v-if="isDropdownOpen">
              <input
                type="number"
                class="tension-filter-input"
                v-model="minTensionFilter"
                placeholder="最小拉力"
                min="0"
              />
              <span class="tension-filter-separator">-</span>
              <input
                type="number"
                class="tension-filter-input"
                v-model="maxTensionFilter"
                placeholder="最大拉力"
                min="0"
              />
              <span class="tension-filter-unit">kN</span>
            </div>
            <div v-if="isDropdownOpen" class="dropdown-list">
              <div
                v-for="equipment in filteredEquipment"
                :key="equipment.equipmentName"
                class="dropdown-item"
                @click.stop="selectEquipment(equipment)"
              >
                <span class="dropdown-name">{{ equipment.equipmentName }}</span>
                <span class="dropdown-tension">{{ equipment.maxTension }} kN</span>
              </div>
              <div v-if="filteredEquipment.length === 0" class="dropdown-empty">
                未找到匹配的装备
              </div>
            </div>
          </div>
          <button
            v-if="(type === '鱼竿' || type === '渔轮') && selectedType !== type"
            class="select-btn"
            @click.stop="selectType(type)"
          >
            {{ getSelectedEquipmentByType(type) ? '更换装备' : '选择装备' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="allEquipmentSelected" class="summary-section">
      <h2>装备组合总览</h2>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">装备组合：</span>
          <span class="summary-value">{{ equipmentSummaryText }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">最小拉力限制：</span>
          <span class="summary-value">{{ minTension }} kN</span>
        </div>
        <div v-if="equipmentAdvice" class="advice-section">
          <div class="advice-title">💡 装备建议：</div>
          <div class="advice-item" :class="{ 'advice-warning': !equipmentAdvice.isOptimal }">
            <pre class="advice-text">{{ equipmentAdvice.message }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      selectedType: null,
      selectedEquipment: '',
      selectedEquipmentList: [],
      equipmentData: [],
      customEquipment: {
        '主线': { maxTension: 0, wear: 0 },
        '引线': { maxTension: 0, wear: 0 }
      },
      searchQuery: '',
      isDropdownOpen: false,
      dropdownRef: null,
      minTensionFilter: '',
      maxTensionFilter: ''
    }
  },
  mounted() {
    this.loadEquipmentData()
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  computed: {
    equipmentTypes() {
      return ['鱼竿', '渔轮', '主线', '引线']
    },
    filteredEquipment() {
      const equipment = this.getTypeEquipment(this.selectedType)
      let filtered = [...equipment]

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(item => 
          item.equipmentName.toLowerCase().includes(query)
        )
      }

      const minTension = parseFloat(this.minTensionFilter) || 0
      const maxTension = parseFloat(this.maxTensionFilter) || Infinity
      
      filtered = filtered.filter(item => 
        item.maxTension >= minTension && item.maxTension <= maxTension
      )

      return filtered.sort((a, b) => a.maxTension - b.maxTension)
    },
    allEquipmentSelected() {
      const rod = this.getSelectedEquipmentByType('鱼竿')
      const reel = this.getSelectedEquipmentByType('渔轮')
      return rod && reel
    },
    equipmentSummaryText() {
      const rod = this.getSelectedEquipmentByType('鱼竿')?.equipmentName || '未选择'
      const reel = this.getSelectedEquipmentByType('渔轮')?.equipmentName || '未选择'
      const mainLine = this.customEquipment['主线'].maxTension > 0 ? `主线(${this.customEquipment['主线'].maxTension}kN)` : '未设置'
      const leader = this.customEquipment['引线'].maxTension > 0 ? `引线(${this.customEquipment['引线'].maxTension}kN)` : '未设置'
      return `${rod} + ${reel} + ${mainLine} + ${leader}`
    },
    minTension() {
      const tensions = []
      
      const rod = this.getSelectedEquipmentByType('鱼竿')
      if (rod) {
        tensions.push(parseFloat(this.calculateActualTension(rod)))
      }
      
      const reel = this.getSelectedEquipmentByType('渔轮')
      if (reel) {
        tensions.push(parseFloat(this.calculateActualTension(reel)))
      }
      
      if (this.customEquipment['主线'].maxTension > 0) {
        tensions.push(parseFloat(this.calculateCustomActualTension('主线')))
      }
      
      if (this.customEquipment['引线'].maxTension > 0) {
        tensions.push(parseFloat(this.calculateCustomActualTension('引线')))
      }
      
      return tensions.length > 0 ? Math.min(...tensions) : 0
    },
    equipmentAdvice() {
      const rod = this.getSelectedEquipmentByType('鱼竿')
      const reel = this.getSelectedEquipmentByType('渔轮')
      const mainLineTension = this.customEquipment['主线'].maxTension > 0 ? parseFloat(this.calculateCustomActualTension('主线')) : 0
      const leaderTension = this.customEquipment['引线'].maxTension > 0 ? parseFloat(this.calculateCustomActualTension('引线')) : 0

      if (!rod && !reel && mainLineTension === 0 && leaderTension === 0) return null

      const rodTension = rod ? parseFloat(this.calculateActualTension(rod)) : 0
      const reelTension = reel ? parseFloat(this.calculateActualTension(reel)) : 0

      // 只有鱼竿或渔轮时的提示
      if (rod && !reel) {
        return {
          isOptimal: false,
          message: `💡 已选择鱼竿(${rodTension}kN)，请选择渔轮和主线来完成装备搭配。`
        }
      }
      if (!rod && reel) {
        return {
          isOptimal: false,
          message: `💡 已选择渔轮(${reelTension}kN)，请选择鱼竿和主线来完成装备搭配。`
        }
      }

      // 鱼竿和渔轮都有，但主线未配置
      if (rod && reel && mainLineTension <= 0) {
        return {
          isOptimal: false,
          message: `💡 已选择鱼竿(${rodTension}kN)和渔轮(${reelTension}kN)，请配置主线和引线来完成装备搭配。`
        }
      }

      // 只有鱼竿和主线（无渔轮）
      if (rod && !reel && mainLineTension > 0) {
        if (rodTension >= mainLineTension) {
          return {
            isOptimal: false,
            message: `✅ 鱼竿(${rodTension}kN)拉力大于主线(${mainLineTension}kN)，搭配合理；建议配置渔轮和引线以完善装备组合。`
          }
        } else {
          return {
            isOptimal: false,
            message: `⚠️ 主线(${mainLineTension}kN)拉力大于鱼竿(${rodTension}kN)，建议降低主线拉力或增大鱼竿拉力。`
          }
        }
      }

      // 只有渔轮和主线（无鱼竿）
      if (!rod && reel && mainLineTension > 0) {
        return {
          isOptimal: false,
          message: `💡 已配置渔轮(${reelTension}kN)和主线(${mainLineTension}kN)，请配置鱼竿来完成装备搭配。`
        }
      }

      // 二、存在引线（引线拉力 > 0）
      if (leaderTension > 0) {
        // 致命危险：引线拉力大于鱼竿
        if (leaderTension > rodTension) {
          return {
            isOptimal: false,
            message: '❌ 致命危险搭配！引线拉力超过鱼竿极限，整套装备无任何缓冲保护，中大鱼直接爆竿，建议大幅降低引线拉力。'
          }
        }

        // 渔轮拉力为最小 - 高危（会磨损渔轮）
        if (reelTension <= leaderTension && reelTension <= mainLineTension && reelTension <= rodTension) {
          return {
            isOptimal: false,
            message: '❌ 高危搭配！渔轮拉力为整套最小阈值，大鱼猛冲时渔轮会持续过载磨损齿轮、摩擦片，长期使用会永久损坏渔轮；建议增大渔轮拉力或更换拉力更小的引线。'
          }
        }

        // 主线和引线拉力相等 - 注意损耗（可能同时断裂）
        if (mainLineTension === leaderTension) {
          return {
            isOptimal: false,
            message: '⚠️ 主线与引线拉力相等，过载时可能同时断裂，建议降低引线拉力或增大主线拉力，避免线组整体损坏。'
          }
        }

        // 引线拉力是最小的 - 安全搭配（过载只拉断引线）
        if (leaderTension <= mainLineTension && leaderTension <= reelTension && leaderTension <= rodTension) {
          // 主线拉力大于渔轮，但引线最小 - 仍属安全
          if (mainLineTension > reelTension) {
            return {
              isOptimal: false,
              message: '⚠️ 主线拉力大于渔轮拉力，但引线拉力最小，过载只会拉断引线不会损伤渔轮；推荐降低主线拉力或调大渔轮拉力，匹配标准搭配逻辑。'
            }
          }
          // 引线最小的情况 - 安全
          return {
            isOptimal: true,
            message: '✅ 装备拉力搭配合理，过载时会优先拉断低成本引线，完美保护主线、渔轮、鱼竿。'
          }
        }

        // 主线拉力为最小 - 安全（过载只断主线，更换成本较高）
        if (mainLineTension <= leaderTension && mainLineTension <= reelTension && mainLineTension <= rodTension) {
          return {
            isOptimal: false,
            message: '⚠️ 当前主线拉力最小，过载时会先拉断主线，会丢失鱼钩、铅坠整套配件，更换成本较高；建议搭配低拉力引线降低损耗成本。'
          }
        }
      }

      // 三、无引线（引线拉力 = 0 / 无配置）
      if (leaderTension <= 0) {
        // 渔轮拉力为最小 - 高危（会磨损渔轮）
        if (reelTension <= mainLineTension && reelTension <= rodTension) {
          return {
            isOptimal: false,
            message: '❌ 高危搭配！渔轮拉力为整套最小阈值，大鱼猛冲时渔轮会持续过载磨损齿轮、摩擦片，长期使用会永久损坏渔轮；建议增大渔轮拉力或增加引线。'
          }
        }

        // 主线拉力为最小 - 安全（过载只断主线）
        if (mainLineTension <= reelTension && mainLineTension <= rodTension) {
          return {
            isOptimal: false,
            message: '⚠️ 当前未配置引线，过载会直接拉断主线，每次断线需要重新更换完整主线，建议搭配低拉力引线降低损耗成本。'
          }
        }

        // 鱼竿拉力为最小 - 致命危险（无缓冲保护）
        return {
          isOptimal: false,
          message: '❌ 致命危险搭配！鱼竿拉力为整套最小阈值，中大鱼直接爆竿，请调低主线或渔轮拉力，确保鱼竿拉力最大。'
        }
      }

      // 默认提示
      return {
        isOptimal: false,
        message: '💡 请检查装备配置。'
      }
    }
  },
  methods: {
    async loadEquipmentData() {
      try {
        const response = await fetch('/equipment.json?' + Date.now())
        
        if (!response.ok) {
          throw new Error('无法找到装备数据文件')
        }
        
        this.equipmentData = await response.json()
        console.log('装备数据加载成功:', this.equipmentData)
        
      } catch (error) {
        console.error('加载装备数据失败:', error)
        this.equipmentData = [
          { equipmentType: '鱼竿', equipmentName: 'FD360', maxTension: 13 },
          { equipmentType: '渔轮', equipmentName: 'TAII', maxTension: 64 },
          { equipmentType: '主线', equipmentName: 'CAIHONG100', maxTension: 60 },
          { equipmentType: '引线', equipmentName: 'NINONG23', maxTension: 60 }
        ]
      }
    },
    calculateActualTension(equipment) {
      const wear = equipment.wear || 0
      let actual
      if (equipment.equipmentType === '渔轮' || equipment.equipmentType === '鱼竿') {
        actual = equipment.maxTension * (1 - 0.7 * wear / 100)
      } else {
        actual = equipment.maxTension * (1 - wear / 100)
      }
      return actual.toFixed(2)
    },
    calculateCustomActualTension(type) {
      const equipment = this.customEquipment[type]
      const wear = equipment.wear || 0
      const actual = equipment.maxTension * (1 - wear / 100)
      return actual.toFixed(2)
    },
    selectType(type) {
      this.selectedType = type
      this.selectedEquipment = ''
      this.searchQuery = ''
      this.minTensionFilter = ''
      this.maxTensionFilter = ''
      this.isDropdownOpen = false
    },
    selectEquipment(equipment) {
      this.selectedEquipment = equipment.equipmentName
      this.addEquipment()
      this.searchQuery = ''
      this.minTensionFilter = ''
      this.maxTensionFilter = ''
      this.isDropdownOpen = false
    },
    getTypeEquipment(type) {
      return this.equipmentData.filter(item => item.equipmentType === type)
    },
    addEquipment() {
      if (!this.selectedEquipment) return

      const equipment = this.equipmentData.find(item => item.equipmentName === this.selectedEquipment)
      if (equipment) {
        const existingIndex = this.selectedEquipmentList.findIndex(item => item.equipmentType === equipment.equipmentType)
        if (existingIndex >= 0) {
          const existingWear = this.selectedEquipmentList[existingIndex].wear || 0
          this.selectedEquipmentList[existingIndex] = {...equipment, wear: existingWear}
        } else {
          this.selectedEquipmentList.push({...equipment, wear: 0})
        }
        this.selectedEquipment = ''
        this.selectedType = null
      }
    },
    removeEquipment(index) {
      this.selectedEquipmentList.splice(index, 1)
    },
    getSelectedEquipmentByType(type) {
      return this.selectedEquipmentList.find(item => item.equipmentType === type)
    },
    clearEquipmentByType(type) {
      const index = this.selectedEquipmentList.findIndex(item => item.equipmentType === type)
      if (index >= 0) {
        this.selectedEquipmentList.splice(index, 1)
      }
    },
    handleClickOutside(event) {
      const dropdown = this.$el.querySelector('.search-dropdown')
      if (dropdown && !dropdown.contains(event.target)) {
        this.isDropdownOpen = false
      }
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  font-family: Arial, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

h1 {
  color: #42b983;
  margin: 0;
}

.refresh-btn {
  padding: 8px 16px;
  border: 1px solid #42b983;
  border-radius: 4px;
  background-color: white;
  color: #42b983;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background-color: #42b983;
  color: white;
}

h2 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.equipment-selector {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.type-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-item {
  display: flex;
  align-items: center;
  padding: 18px 25px;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 20px;
}

.type-item:hover {
  border-color: #42b983;
  background-color: #f0f8f0;
}

.type-item.active {
  border-color: #42b983;
  background-color: #e8f5e9;
}

.type-label {
  font-size: 16px;
  font-weight: bold;
  color: #2c3e50;
  min-width: 80px;
}

.type-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-name {
  font-weight: bold;
  color: #42b983;
}

.selected-tension {
  color: #666;
  font-size: 14px;
}

.clear-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.clear-btn:hover {
  color: #e74c3c;
  background-color: #ffebee;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.wear-input-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
}

.wear-label {
  font-size: 14px;
  color: #666;
}

.wear-input {
  width: 50px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.wear-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.wear-unit {
  font-size: 14px;
  color: #666;
}

.actual-tension {
  font-size: 14px;
  font-weight: bold;
  color: #3498db;
  margin-left: 10px;
  padding: 4px 10px;
  background-color: #e8f4f8;
  border-radius: 4px;
}



.summary-section {
  background-color: #e8f5e9;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #42b983;
}

.summary-card {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-weight: bold;
  color: #2c3e50;
  font-size: 16px;
}

.summary-value {
  color: #42b983;
  font-weight: bold;
  font-size: 16px;
  flex: 1;
  text-align: right;
}

.advice-section {
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border-left: 4px solid #42b983;
}

.advice-title {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 16px;
}

.advice-item {
  padding: 12px;
  border-radius: 4px;
  background-color: white;
  color: #27ae60;
  font-size: 15px;
  line-height: 1.6;
}

.advice-warning {
  background-color: #fff3cd;
  color: #856404;
  border-left: 4px solid #ffc107;
}

.advice-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.8;
}

.custom-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-label {
  font-size: 14px;
  color: #666;
}

.tension-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.tension-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.input-unit {
  font-size: 14px;
  color: #666;
}

.select-btn {
  padding: 8px 16px;
  border: 1px solid #42b983;
  border-radius: 4px;
  background-color: white;
  color: #42b983;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-btn:hover {
  background-color: #42b983;
  color: white;
}

.search-dropdown {
  position: relative;
  min-width: 400px;
  flex: 1;
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
  right: 8px;
  font-size: 14px;
  color: #999;
  pointer-events: none;
}

.tension-filter-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 0;
  border-top: 1px solid #eee;
  margin-top: 4px;
}

.tension-filter-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.tension-filter-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.tension-filter-separator {
  color: #999;
  font-size: 14px;
}

.tension-filter-unit {
  font-size: 13px;
  color: #666;
}

.dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
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
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #e8f5e9;
}

.dropdown-name {
  flex: 1;
  font-size: 14px;
  color: #2c3e50;
  overflow: hidden;
  white-space: normal;
  word-break: break-all;
}

.dropdown-tension {
  font-size: 13px;
  color: #42b983;
  font-weight: bold;
  margin-left: 10px;
}

.dropdown-empty {
  padding: 15px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
</style>