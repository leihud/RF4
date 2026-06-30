<template>
  <div class="app">
    <div class="header">
      <h1>装备拉力计算表</h1>
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
          <select
            v-if="(type === '鱼竿' || type === '渔轮') && selectedType === type"
            v-model="selectedEquipment"
            @click.stop
            @change="addEquipment"
          >
            <option value="">请选择装备</option>
            <option
              v-for="equipment in getTypeEquipment(type)"
              :key="equipment.equipmentName"
              :value="equipment.equipmentName"
            >
              {{ equipment.equipmentName }}
            </option>
          </select>
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
      }
    }
  },
  mounted() {
    this.loadEquipmentData()
  },
  computed: {
    equipmentTypes() {
      return ['鱼竿', '渔轮', '主线', '引线']
    },
    allEquipmentSelected() {
      const rod = this.getSelectedEquipmentByType('鱼竿')
      const reel = this.getSelectedEquipmentByType('渔轮')
      const mainLine = this.customEquipment['主线'].maxTension > 0
      const leader = this.customEquipment['引线'].maxTension > 0
      return rod && reel && mainLine && leader
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
      if (!this.allEquipmentSelected) return null

      const typeOrder = ['鱼竿', '渔轮', '主线', '引线']
      const actualTensions = typeOrder.map(type => {
        let actualTension = 0
        let equipment = { equipmentName: type }
        
        if (type === '主线' || type === '引线') {
          actualTension = parseFloat(this.calculateCustomActualTension(type))
          equipment.equipmentName = `${type}(${this.customEquipment[type].maxTension}kN)`
        } else {
          equipment = this.selectedEquipmentList.find(e => e.equipmentType === type)
          actualTension = parseFloat(this.calculateActualTension(equipment))
        }
        
        return {
          type,
          actualTension,
          equipment
        }
      })

      let issues = []
      
      for (let i = 0; i < actualTensions.length - 1; i++) {
        if (actualTensions[i].actualTension <= actualTensions[i + 1].actualTension) {
          issues.push({
            lower: actualTensions[i],
            higher: actualTensions[i + 1]
          })
        }
      }

      if (issues.length === 0) {
        return {
          isOptimal: true,
          message: '✅ 装备搭配很棒！引线拉力最小，符合安全规范。'
        }
      }

      let messages = []
      
      issues.forEach(issue => {
        const { lower, higher } = issue
        if (lower.type === '引线') {
          messages.push(`${lower.equipment.equipmentName}(${lower.actualTension}kN)的拉力超过了${higher.equipment.equipmentName}(${higher.actualTension}kN)，建议换个拉力更小的引线，或者换个拉力更大的${higher.type}`)
        } else {
          messages.push(`${lower.equipment.equipmentName}(${lower.actualTension}kN)应该比${higher.equipment.equipmentName}(${higher.actualTension}kN)拉力大，建议调整一下装备搭配`)
        }
      })

      const minTensionValue = Math.min(...actualTensions.map(t => t.actualTension))
      const minTensionType = actualTensions.find(t => t.actualTension === minTensionValue)?.type
      
      if (minTensionType !== '引线' && !messages.some(m => m.includes('引线'))) {
        const minEquipment = actualTensions.find(t => t.actualTension === minTensionValue)
        messages.push(`${minEquipment.equipment.equipmentName}(${minTensionValue}kN)的拉力最小了，这样很危险！建议换个拉力更小的引线保护起来`)
      }

      return {
        isOptimal: false,
        message: '⚠️ 有这些问题需要注意：\n' + messages.join('\n')
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

.type-item select {
  padding: 8px 12px;
  border: 1px solid #42b983;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  color: #2c3e50;
  cursor: pointer;
  min-width: 150px;
}

.type-item select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
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
</style>