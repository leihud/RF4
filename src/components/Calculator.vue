<template>
  <div class="app">
    <DisclaimerModal v-if="showDisclaimer" @close="showDisclaimer = false" />
    <div class="header">
      <h1>装备计算器</h1>
      <div class="header-buttons">
        <button class="compare-nav-btn" @click="goToCompare">参数对比</button>
        <button class="import-nav-btn" @click="goToImport">数据导入</button>
        <button class="rf4-stat-btn" @click="openRf4Stat" rel="noopener noreferrer" target="_blank">RF4 数据站</button>
        <button class="share-btn" @click="sharePreset" :title="shareHint || '分享当前装备方案'">
          {{ shareHint || '分享方案' }}
        </button>
      </div>
    </div>

    <div class="rule-selector">
      <span class="rule-label">计算规则:</span>
      <button
        v-for="rule in CALC_RULE_OPTIONS"
        :key="rule.value"
        :class="['rule-btn', { active: calculationRule === rule.value }]"
        @click="calculationRule = rule.value"
      >
        {{ rule.label }}
      </button>
    </div>

    <div class="fish-selector">
      <span class="fish-label">目标鱼种:</span>
      <select v-model="selectedFish" class="fish-select">
        <option value="">不限</option>
        <option v-for="fish in fishSpeciesList" :key="fish.name" :value="fish.display_name">
          {{ fish.display_name }}
        </option>
      </select>
      
      <span class="fish-label">目标地图:</span>
      <select v-model="selectedMap" class="fish-select">
        <option value="">不限</option>
        <option v-for="map in mapsList" :key="map.name" :value="map.display_name">
          {{ map.display_name }}
        </option>
      </select>
      
      <span class="fish-label">目标方案:</span>
      <select v-model="selectedBuildName" class="fish-select">
        <option value="">请选择方案</option>
        <option v-for="build in filteredBuildNames" :key="build" :value="build">
          {{ build }}
        </option>
      </select>
      
      <button class="query-btn" @click="queryAndApplyBuild" :disabled="!selectedBuildName">
        查询
      </button>
      
      <div v-if="currentFishRec" class="fish-tips">
        <span class="tips-icon"></span>
        <span>{{ currentFishRec.tips }}</span>
        <span class="tips-range">推荐拉力: {{ currentFishRec.minTension }}-{{ currentFishRec.maxTension }} kN</span>
      </div>
    </div>

    <div v-if="!calculationRule" class="rule-warning">
      请先选择计算规则
    </div>

    <div v-if="dataLoadError" class="rule-warning" style="background-color: #ffebee; color: #c62828;">
      装备数据加载失败
    </div>

    <div v-if="isLoading && equipmentData.length === 0" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <span class="loading-text">正在加载装备数据...</span>
    </div>

    <div class="equipment-selector" :class="{ disabled: !calculationRule }">
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
            <template v-if="isCustomInputType(type)">
              <div class="custom-input-group">
                <template v-if="type === '鱼钩'">
                  <span class="input-label">名称:</span>
                  <input
                    type="text"
                    class="hook-name-input"
                    v-model="customEquipment[type].name"
                    placeholder="请输入鱼钩名称"
                  />
                </template>
                <template v-else>
                  <span v-if="type === '主线' || type === '引线'" class="material-wrapper">
                    <span class="material-label">材质:</span>
                    <select
                      class="material-select"
                      v-model="customEquipment[type].material"
                    >
                      <option
                        v-for="mat in LINE_MATERIALS"
                        :key="mat.value"
                        :value="mat.value"
                      >{{ mat.label }}</option>
                    </select>
                  </span>
                  <span class="input-label">拉力:</span>
                  <input
                    type="number"
                    class="tension-input"
                    v-model.number="customEquipment[type].maxTension"
                    placeholder="0"
                    min="0"
                  />
                  <span class="input-unit">kN</span>
                  <span class="input-label">磨损:</span>
                  <input
                    type="number"
                    class="wear-input"
                    v-model.number="customEquipment[type].wear"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  <span class="input-unit">%</span>
                  <span class="actual-tension">
                    实际拉力:{{ formatTension(calculateCustomActualTension(customEquipment[type])) }} kN
                  </span>
                </template>
              </div>
            </template>
            <template v-else>
                <template v-if="selectedEquipmentMap[type]">
                    <span
                      v-if="selectedEquipmentMap[type].category || selectedEquipmentMap[type].subCategory"
                      class="selected-category-tag"
                    >{{ toSafeDisplay(selectedEquipmentMap[type].category || selectedEquipmentMap[type].subCategory) }}</span>
                    <span
                      v-if="selectedEquipmentMap[type].ratingAlias && selectedEquipmentMap[type].ratingAlias !== '常规'"
                      class="selected-rating-tag"
                    >{{ toSafeDisplay(selectedEquipmentMap[type].ratingAlias) }}</span>
                    <span class="selected-name">{{ toSafeDisplay(selectedEquipmentMap[type].model || selectedEquipmentMap[type].equipmentName) }}</span>
                <template v-if="type === '鱼竿'">
                  <span class="selected-tension">
                    拉力:{{ toSafeNumber(selectedEquipmentMap[type].panelTension || selectedEquipmentMap[type].lockTension) }} kN
                  </span>
                </template>
                <template v-else>
                  <span class="selected-tension">
                    面板:{{ toSafeNumber(selectedEquipmentMap[type].panelTension || selectedEquipmentMap[type].lockTension || 0) }} kN
                  </span>
                  <span class="selected-tension">
                    锁轮:{{ toSafeNumber(selectedEquipmentMap[type].lockTension) }} kN
                  </span>
                </template>
                <div class="wear-input-wrapper">
                  <span class="wear-label">磨损:</span>
                  <input
                    type="number"
                    class="wear-input"
                    v-model.number="selectedEquipmentMap[type].wear"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  <span class="wear-unit">%</span>
                </div>
                <span v-if="type === '渔轮'" class="friction-input-wrapper">
                  <span class="friction-label">摩擦:</span>
                  <input
                    type="number"
                    class="friction-input"
                    :value="toSafeNumber(friction)"
                    @change="onFrictionChange"
                    placeholder="0"
                    min="0"
                    :max="toSafeNumber(frictionMax)"
                  />
                </span>
                <span v-if="type === '鱼竿'" class="actual-tension">
                  实际拉力:{{ formatTension(actualPanelTensionMap[type]) }} kN
                </span>
                <span v-if="type === '渔轮'" class="actual-panel-tension">
                  实际拉力:{{ formatTension(actualPanelTensionMap[type]) }} kN
                </span>
                <span v-if="type === '渔轮'" class="actual-tension">
                  实际锁轮:{{ formatTension(actualLockTensionMap[type]) }} kN
                </span>
                <span
                  v-if="getMergedAdaptWeight(selectedEquipmentMap[type], type)"
                  class="actual-tension adapt-weight-tag"
                >
                  适配重:{{ getMergedAdaptWeight(selectedEquipmentMap[type], type) }}
                </span>
                <button class="clear-btn" @click.stop="clearEquipmentByType(type)">×</button>
              </template>
              <span v-else class="placeholder">未选择</span>
            </template>
          </div>

          <EquipmentSearchDropdown
            v-if="isSearchableType(type) && selectedType === type"
            :equipment-list="equipmentOfSelectedType"
            :equipment-filter="type === '渔轮' ? reelEquipmentFilter : null"
            :compatible-categories="type === '渔轮' ? compatibleReelTypes : null"
            :empty-hint="type === '渔轮' && compatibleReelTypes !== null && compatibleReelTypes.length === 0 ? '当前鱼竿无法装备任何渔轮' : null"
            @select="selectEquipment"
          />

          <button
            v-if="isSearchableType(type) && selectedType !== type"
            class="select-btn"
            @click.stop="selectType(type)"
          >
            {{ selectedEquipmentMap[type] ? '更换装备' : '选择装备' }}
          </button>
        </div>
      </div>
    </div>

    <EquipmentSummary
      v-if="allEquipmentSelected"
      :selected-equipment-list="selectedEquipmentList"
      :custom-equipment="customEquipment"
      :actual-lock-tension-map="actualLockTensionMap"
      :actual-panel-tension-map="actualPanelTensionMap"
    />

    <!-- 提交推荐装备按钮 -->
    <div class="submit-section">
      <button class="submit-build-btn" @click="openSubmitModal">
        提交推荐装备搭配
      </button>
    </div>

    <!-- 提交弹窗 -->
    <div v-if="showSubmitModal" class="modal-mask" @click.self="closeSubmitModal">
      <div class="modal-popup">
        <h3 class="modal-title">提交推荐装备搭配</h3>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">装备方案名称</label>
            <input
              v-model="submitForm.name"
              class="form-input"
              placeholder="例如：鲤鱼通用套装、鱼远投配置"
            />
          </div>
          <div class="form-group">
            <label class="form-label">装备说明</label>
            <textarea
              v-model="submitForm.description"
              class="form-textarea"
              placeholder="请输入装备搭配的说明或使用心得"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">适用鱼种（可多选）</label>
            <select
              v-model="submitForm.suitableFish"
              class="form-select form-select-multiple"
              multiple
              size="5"
            >
              <option v-for="fish in fishSpeciesList" :key="fish.name" :value="fish.display_name">
                {{ fish.display_name }}
              </option>
            </select>
            <span class="select-hint">按住 Ctrl/Cmd 键可多选</span>
          </div>
          <div class="form-group">
            <label class="form-label">适用地图（可多选）</label>
            <select
              v-model="submitForm.suitableMap"
              class="form-select form-select-multiple"
              multiple
              size="5"
            >
              <option v-for="map in mapsList" :key="map.name" :value="map.display_name">
                {{ map.display_name }}
              </option>
            </select>
            <span class="select-hint">按住 Ctrl/Cmd 键可多选</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" @click="closeSubmitModal">取消</button>
          <button class="modal-confirm-btn" @click="submitBuild" :disabled="isSubmitting">
            {{ isSubmitting ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  EQUIPMENT_TYPES,
  CUSTOM_INPUT_TYPES,
  SEARCHABLE_TYPES,
  CALC_RULE_OPTIONS,
  DEFAULT_FRICTION,
  CALC_RULES,
  LINE_MATERIALS,
  getRatingAlias,
  getCompatibleReelTypes,
  isRodReelCompatible
} from '../constants/equipment.js'
import { ROUTES } from '../constants/routes.js'
import {
  calculateActualLockTension,
  calculateActualPanelTension,
  calculateCustomActualTension,
  clampFriction,
  getFrictionMax,
  formatTension
} from '../utils/tension.js'
import { getMergedAdaptWeight } from '../utils/display.js'
import { sanitizeEquipmentFields, safeToNumber, safeToString } from '../utils/sanitize.js'
import { loadEquipmentData } from '../utils/equipmentLoader.js'
import { encodePreset, decodePreset, getShareUrl } from '../utils/presetShare.js'
import DisclaimerModal from './calculator/DisclaimerModal.vue'
import EquipmentSearchDropdown from './calculator/EquipmentSearchDropdown.vue'
import EquipmentSummary from './calculator/EquipmentSummary.vue'

export default {
  name: 'Calculator',
  components: {
    DisclaimerModal,
    EquipmentSearchDropdown,
    EquipmentSummary
  },
  data() {
    return {
      selectedType: null,
      equipmentData: [],
      dataLoadError: false,
      isLoading: false,
      showDisclaimer: false,
      customEquipment: {
        '主线': { maxTension: 0, wear: 0, material: '' },
        '引线': { maxTension: 0, wear: 0, material: '' },
        '鱼钩': { name: '' }
      },
      friction: DEFAULT_FRICTION,
      selectedEquipmentList: [],
      calculationRule: CALC_RULES.GUIDE,
      CALC_RULE_OPTIONS,
      LINE_MATERIALS,
      formatTension,
      shareHint: '',
      selectedFish: '',
      selectedMap: '',
      selectedBuildName: '',
      showSubmitModal: false,
      isSubmitting: false,
      submitForm: {
        name: '',
        description: '',
        suitableFish: [],
        suitableMap: []
      },
      mapsList: [],
      fishSpeciesList: [],
      recommendedBuilds: []
    }
  },
  mounted() {
    this.loadEquipmentData()
    document.addEventListener('click', this.handleClickOutside)
    this.showDisclaimer = true
    this.restoreFromUrl()
    this.loadMapsAndFishSpecies()
    this.loadRecommendedBuilds()
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  watch: {
    calculationRule(val) {
      if (val) {
        this.friction = clampFriction(this.friction, val)
      }
    },
    /** 鱼竿切换时，若已选渔轮不兼容则自动清除 */
    'selectedEquipmentMap.鱼竿'(newRod) {
      const reel = this.selectedEquipmentMap['渔轮']
      if (newRod && reel && !isRodReelCompatible(newRod, reel)) {
        this.clearEquipmentByType('渔轮')
      }
    },
    /** 鱼种切换时，清空方案选择 */
    selectedFish(newFish) {
      if (!newFish) {
        this.selectedBuildName = ''
      }
    },
    /** 地图切换时，清空方案选择 */
    selectedMap(newMap) {
      if (!newMap) {
        this.selectedBuildName = ''
      }
    }
  },
  computed: {
    equipmentTypes() {
      return EQUIPMENT_TYPES
    },
    frictionMax() {
      return getFrictionMax(this.calculationRule)
    },
    selectedEquipmentMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        map[item.equipmentType] = item
      }
      return map
    },
    actualLockTensionMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        if (item.equipmentType === '鱼竿' || item.equipmentType === '渔轮') {
          map[item.equipmentType] = calculateActualLockTension(item, this.calculationRule)
        }
      }
      return map
    },
    actualPanelTensionMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        if (item.equipmentType === '鱼竿' || item.equipmentType === '渔轮') {
          map[item.equipmentType] = calculateActualPanelTension(
            item,
            this.calculationRule,
            this.friction
          )
        }
      }
      return map
    },
    /** 当前展开搜索的装备类型对应的装备列表（供下拉子组件使用） */
    equipmentOfSelectedType() {
      if (!Array.isArray(this.equipmentData)) return []
      return this.equipmentData.filter(item => item.equipmentType === this.selectedType)
    },
    /** 当前鱼竿兼容的渔轮分类列表（null 表示不限制） */
    compatibleReelTypes() {
      const rod = this.selectedEquipmentMap['鱼竿']
      if (!rod) return null
      return getCompatibleReelTypes(rod.category)
    },
    /** 传给渔轮下拉的过滤函数：根据当前鱼竿过滤不兼容渔轮 */
    reelEquipmentFilter() {
      const compatible = this.compatibleReelTypes
      if (compatible === null) return null
      return (item) => compatible.includes(item.category)
    },
    allEquipmentSelected() {
      return !!this.selectedEquipmentMap['鱼竿']
    },
    /** 根据选中的鱼种和地图过滤方案名称列表 */
    filteredBuildNames() {
      // 获取所有唯一的方案名称
      const allNames = [...new Set(this.recommendedBuilds.map(b => b.name).filter(n => n))]
      
      // 如果没有选择鱼种或地图，返回所有方案
      if (!this.selectedFish && !this.selectedMap) {
        return allNames
      }
      
      // 根据鱼种和地图过滤
      return allNames.filter(name => {
        const buildsForName = this.recommendedBuilds.filter(b => b.name === name)
        return buildsForName.some(build => {
          // 检查鱼种匹配
          const fishMatch = !this.selectedFish || 
            (build.suitable_fish && build.suitable_fish.includes(this.selectedFish))
          // 检查地图匹配
          const mapMatch = !this.selectedMap || 
            (build.suitable_map && build.suitable_map.includes(this.selectedMap))
          return fishMatch && mapMatch
        })
      })
    },
    /** 当前选中鱼种的推荐配置 */
    currentFishRec() {
      if (!this.selectedFish) return null
      const fish = this.fishSpeciesList.find(f => f.display_name === this.selectedFish)
      if (!fish) return null
      return {
        name: fish.display_name,
        difficulty: fish.difficulty || '未知',
        tips: fish.description || '',
        minTension: fish.min_tension || 0,
        maxTension: fish.max_tension || 0
      }
    }
  },
  methods: {
    /**
     * 安全转数值：薄包装 sanitize.js/safeToNumber
     *  - 兜底 fallback（默认 0）
     *  - 防止隐式转换报错（safeToNumber 内部会处理对象/字符串提取数字）
     */
    toSafeNumber(v, fallback = 0) {
      const n = safeToNumber(v, fallback)
      return n == null ? fallback : n
    },
    /**
     * 安全显示值：薄包装 sanitize.js/safeToString
     *  - 兜底 fallback（默认 ''）
     *  - 防止模板插值对象触发隐式 toString 报错
     */
    toSafeDisplay(v, fallback = '') {
      const s = safeToString(v, fallback)
      return s == null ? fallback : s
    },
    getMergedAdaptWeight,
    isCustomInputType(type) {
      return CUSTOM_INPUT_TYPES.includes(type)
    },
    isSearchableType(type) {
      return SEARCHABLE_TYPES.includes(type)
    },
    async loadEquipmentData() {
      this.equipmentData = []
      this.isLoading = true
      const { data, error } = await loadEquipmentData('/api/equipment')
      this.equipmentData = data
      this.dataLoadError = error
      this.isLoading = false
      // 数据就绪后恢复 URL 中的装备方案
      this.applyPendingPreset()
    },
    calculateCustomActualTension(item) {
      return calculateCustomActualTension(item)
    },
    onFrictionChange(event) {
      this.friction = clampFriction(parseFloat(event.target.value), this.calculationRule)
    },
    selectType(type) {
      this.selectedType = type
    },
    selectEquipment(equipment) {
      // 【入口二次清洗】防止装备对象中残留未清洗的对象字段
      const safe = sanitizeEquipmentFields(equipment || {})
      // 渔轮兼容性检查：与当前鱼竿不兼容时拒绝选择
      if (safe.equipmentType === '渔轮') {
        const rod = this.selectedEquipmentMap['鱼竿']
        if (rod && !isRodReelCompatible(rod, safe)) {
          alert('当前鱼竿无法装备此类型渔轮')
          return
        }
      }
      const existingIndex = this.selectedEquipmentList.findIndex(
        item => item.equipmentType === safe.equipmentType
      )
      const next = { ...safe, wear: 0 }
      if (existingIndex >= 0) {
        next.wear = this.toSafeNumber(this.selectedEquipmentList[existingIndex].wear, 0)
        this.selectedEquipmentList.splice(existingIndex, 1, next)
      } else {
        this.selectedEquipmentList.push(next)
      }
      this.selectedType = null
    },
    clearEquipmentByType(type) {
      const index = this.selectedEquipmentList.findIndex(item => item.equipmentType === type)
      if (index >= 0) this.selectedEquipmentList.splice(index, 1)
    },
    handleClickOutside(event) {
      // 组件已卸载或根元素未挂载，直接返回，避免 this.$el 非 HTMLElement
      const el = this.$el
      if (!el || typeof el.querySelector !== 'function' || typeof el.querySelectorAll !== 'function') {
        return
      }
      // 点击免责声明区域时不处理
      const disclaimers = document.querySelectorAll('.disclaimer-mask, .disclaimer-popup, .disclaimer-footer')
      for (const el2 of disclaimers) {
        if (el2 && el2.contains && el2.contains(event.target)) return
      }
      const activeRow = el.querySelector('.type-item.active')
      const selectBtns = el.querySelectorAll('.select-btn')
      // 点击在激活行（参数+搜索框+下拉）内部，不处理
      if (activeRow && activeRow.contains && activeRow.contains(event.target)) return
      // 点击在其他行的更换装备按钮上（这些按钮会自己切 selectedType），不处理
      for (const btn of selectBtns) {
        if (btn && btn.contains && btn.contains(event.target)) return
      }
      // 点击在类型 tab（.type-label）或输入控件上，不处理，避免误清空
      const typeLabels = el.querySelectorAll('.type-label, .custom-input-group input, .wear-input-wrapper input')
      for (const el2 of typeLabels) {
        if (el2 && el2.contains && el2.contains(event.target)) return
      }
      // 其他点击都视为外部点击：收起下拉（子组件随 selectedType 置空卸载）
      if (this.selectedType) this.selectedType = null
    },
    goToCompare() {
      this.$router.push(ROUTES.COMPARE)
    },
    goToImport() {
      this.$router.push(ROUTES.IMPORT)
    },
    openRf4Stat() {
      // 打开 RF4 中文数据站（新标签页，noopener 防反跟踪，noreferrer 防来源泄露）
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open('https://cn.rf4-stat.ru/', '_blank', 'noopener,noreferrer')
      }
    },
    /** 从 URL 参数恢复装备方案 */
    restoreFromUrl() {
      const preset = decodePreset(window.location.search)
      if (!preset) return
      if (preset.calculationRule) this.calculationRule = preset.calculationRule
      if (preset.friction) this.friction = clampFriction(preset.friction, this.calculationRule)
      if (preset.mainLineTension) {
        this.customEquipment['主线'].maxTension = preset.mainLineTension
        this.customEquipment['主线'].wear = preset.mainLineWear || 0
      }
      if (preset.leaderLineTension) {
        this.customEquipment['引线'].maxTension = preset.leaderLineTension
        this.customEquipment['引线'].wear = preset.leaderLineWear || 0
      }
      // 竿/轮型号需要在数据加载后匹配
      if (preset.rodModel || preset.reelModel) {
        this._pendingPreset = preset
      }
    },
    /** 数据加载完成后，根据 URL preset 匹配装备 */
    applyPendingPreset() {
      const preset = this._pendingPreset
      if (!preset) return
      delete this._pendingPreset
      if (preset.rodModel) {
        const rod = this.equipmentData.find(
          item => item.equipmentType === '鱼竿' &&
            (item.model === preset.rodModel || item.equipmentName === preset.rodModel)
        )
        if (rod) {
          this.selectedEquipmentList.push({ ...rod, wear: preset.rodWear || 0 })
        }
      }
      if (preset.reelModel) {
        const reel = this.equipmentData.find(
          item => item.equipmentType === '渔轮' &&
            (item.model === preset.reelModel || item.equipmentName === preset.reelModel)
        )
        if (reel) {
          const rod = this.selectedEquipmentMap['鱼竿']
          if (!rod || isRodReelCompatible(rod, reel)) {
            this.selectedEquipmentList.push({ ...reel, wear: preset.reelWear || 0 })
          }
        }
      }
    },
    /** 生成分享链接并复制到剪贴板 */
    async sharePreset() {
      const rod = this.selectedEquipmentMap['鱼竿']
      const reel = this.selectedEquipmentMap['渔轮']
      const state = {
        rodModel: rod ? (rod.model || rod.equipmentName) : '',
        reelModel: reel ? (reel.model || reel.equipmentName) : '',
        rodWear: rod ? this.toSafeNumber(rod.wear, 0) : 0,
        reelWear: reel ? this.toSafeNumber(reel.wear, 0) : 0,
        friction: this.toSafeNumber(this.friction, 0),
        mainLineTension: this.toSafeNumber(this.customEquipment['主线'].maxTension, 0),
        mainLineWear: this.toSafeNumber(this.customEquipment['主线'].wear, 0),
        leaderLineTension: this.toSafeNumber(this.customEquipment['引线'].maxTension, 0),
        leaderLineWear: this.toSafeNumber(this.customEquipment['引线'].wear, 0),
        calculationRule: this.calculationRule
      }
      const url = getShareUrl(state)
      try {
        await navigator.clipboard.writeText(url)
        this.shareHint = '链接已复制！'
      } catch (_) {
        // 剪贴板 API 不可用时回退到 prompt
        this.shareHint = url
      }
      setTimeout(() => { this.shareHint = '' }, 3000)
    },
    /** 从数据库加载地图和鱼种列表 */
    async loadMapsAndFishSpecies() {
      try {
        const [mapsRes, fishRes] = await Promise.all([
          fetch('/api/maps'),
          fetch('/api/fish_species')
        ])
        const mapsData = await mapsRes.json()
        const fishData = await fishRes.json()
        if (mapsData.success) {
          this.mapsList = mapsData.data || []
        }
        if (fishData.success) {
          this.fishSpeciesList = fishData.data || []
        }
      } catch (error) {
        console.error('加载地图和鱼种数据失败:', error)
      }
    },
    /** 加载所有推荐装备搭配 */
    async loadRecommendedBuilds() {
      try {
        const response = await fetch('/api/recommended_builds')
        const result = await response.json()
        if (result.success && result.data) {
          this.recommendedBuilds = result.data
        } else {
          this.recommendedBuilds = []
        }
      } catch (error) {
        console.error('加载推荐装备失败:', error)
        this.recommendedBuilds = []
      }
    },
    openSubmitModal() {
      this.showSubmitModal = true
    },
    closeSubmitModal() {
      this.showSubmitModal = false
    },
    async submitBuild() {
      const rod = this.selectedEquipmentMap['鱼竿']
      const reel = this.selectedEquipmentMap['渔轮']
      
      const build = {
        name: this.submitForm.name,
        rodModel: rod ? (rod.model || rod.equipmentName) : '',
        rodName: rod ? rod.equipmentName : '',
        rodCategory: rod ? rod.category : '',
        reelModel: reel ? (reel.model || reel.equipmentName) : '',
        reelName: reel ? reel.equipmentName : '',
        reelCategory: reel ? reel.category : '',
        mainLineTension: this.toSafeNumber(this.customEquipment['主线'].maxTension, 0),
        mainLineWear: this.toSafeNumber(this.customEquipment['主线'].wear, 0),
        mainLineMaterial: this.customEquipment['主线'].material || '',
        leaderLineTension: this.toSafeNumber(this.customEquipment['引线'].maxTension, 0),
        leaderLineWear: this.toSafeNumber(this.customEquipment['引线'].wear, 0),
        leaderLineMaterial: this.customEquipment['引线'].material || '',
        hookName: this.customEquipment['鱼钩'].name || '',
        calculationRule: this.calculationRule,
        friction: this.toSafeNumber(this.friction, 0),
        description: this.submitForm.description,
        suitableFish: Array.isArray(this.submitForm.suitableFish) ? this.submitForm.suitableFish.join(',') : this.submitForm.suitableFish,
        suitableMap: Array.isArray(this.submitForm.suitableMap) ? this.submitForm.suitableMap.join(',') : this.submitForm.suitableMap
      }

      this.isSubmitting = true
      try {
        const response = await fetch('/api/recommended_builds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ build })
        })
        const result = await response.json()
        if (result.success) {
          alert('推荐装备搭配已保存！')
          this.closeSubmitModal()
          this.submitForm = { name: '', description: '', suitableFish: [], suitableMap: [] }
        } else {
          alert('保存失败：' + (result.message || '未知错误'))
        }
      } catch (error) {
        alert('提交失败：' + error.message)
      } finally {
        this.isSubmitting = false
      }
    },
    /** 查询并应用选中的方案 */
    queryAndApplyBuild() {
      if (!this.selectedBuildName) {
        alert('请先选择目标方案')
        return
      }
      
      // 只根据方案名称精确匹配，不检查鱼种和地图
      const build = this.recommendedBuilds.find(b => b.name === this.selectedBuildName)
      
      if (build) {
        this.applyRecommendedBuild(build)
      } else {
        alert(`未找到方案 "${this.selectedBuildName}"`)
      }
    },
    /** 应用推荐装备搭配到当前选择 */
    applyRecommendedBuild(build) {
      // 清空当前选择
      this.selectedEquipmentList = []
      
      // 匹配并设置鱼竿
      if (build.rod_model) {
        const rod = this.equipmentData.find(
          item => item.equipmentType === '鱼竿' && 
            (item.model === build.rod_model || item.equipmentName === build.rod_model)
        )
        if (rod) {
          this.selectedEquipmentList.push({ ...rod, wear: 0 })
        }
      }
      
      // 匹配并设置渔轮
      if (build.reel_model) {
        const reel = this.equipmentData.find(
          item => item.equipmentType === '渔轮' && 
            (item.model === build.reel_model || item.equipmentName === build.reel_model)
        )
        if (reel) {
          this.selectedEquipmentList.push({ ...reel, wear: 0 })
        }
      }
      
      // 设置主线
      if (build.main_line_tension > 0) {
        this.customEquipment['主线'].maxTension = build.main_line_tension
        this.customEquipment['主线'].wear = build.main_line_wear || 0
        this.customEquipment['主线'].material = build.main_line_material || ''
      }
      
      // 设置引线
      if (build.leader_line_tension > 0) {
        this.customEquipment['引线'].maxTension = build.leader_line_tension
        this.customEquipment['引线'].wear = build.leader_line_wear || 0
        this.customEquipment['引线'].material = build.leader_line_material || ''
      }
      
      // 设置鱼钩
      if (build.hook_name) {
        this.customEquipment['鱼钩'].name = build.hook_name
      }
      
      // 设置计算规则和摩擦值
      if (build.calculation_rule) {
        this.calculationRule = build.calculation_rule
      }
      if (build.friction > 0) {
        this.friction = clampFriction(build.friction, build.calculation_rule || this.calculationRule)
      }
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 1600px;
  margin: 0 auto;
  padding: 30px;
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e3f2fd;
}

h1 {
  color: #1565c0;
  font-size: 28px;
  margin: 0;
}

.compare-nav-btn {
  padding: 10px 24px;
  border: 2px solid #1565c0;
  background-color: white;
  color: #1565c0;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.compare-nav-btn:hover {
  background-color: #e3f2fd;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.import-nav-btn {
  padding: 10px 24px;
  border: 2px solid #1565c0;
  background-color: white;
  color: #1565c0;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.import-nav-btn:hover {
  background-color: #fff3e0;
}

/* 顶部 header 第三个按钮：外链打开 RF4 中文数据站 */
.rf4-stat-btn {
  padding: 10px 24px;
  border: 2px solid #2e7d32;
  background-color: white;
  color: #2e7d32;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
}

.rf4-stat-btn:hover {
  background-color: #e8f5e9;
}

/* 分享方案按钮 */
.share-btn {
  padding: 10px 24px;
  border: 2px solid #7b1fa2;
  background-color: white;
  color: #7b1fa2;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
}

.share-btn:hover {
  background-color: #f3e5f5;
}

/* 查询按钮 */
.query-btn {
  padding: 8px 20px;
  border: 2px solid #42b983;
  background-color: white;
  color: #42b983;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
}

.query-btn:hover:not(:disabled) {
  background-color: #e8f5e9;
}

.query-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 鱼种选择器 */
.fish-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
  padding: 12px 15px;
  background-color: #e3f2fd;
  border-radius: 8px;
  flex-wrap: wrap;
}

.fish-label {
  font-weight: bold;
  color: #1565c0;
  font-size: 14px;
}

.fish-select {
  padding: 6px 12px;
  border: 1px solid #90caf9;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
  outline: none;
}

.fish-select:focus {
  border-color: #1565c0;
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

.fish-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
  flex-wrap: wrap;
}

.tips-icon::before {
  content: '💡';
}

.tips-range {
  color: #1565c0;
  font-weight: 600;
  background-color: #bbdefb;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

h2 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.rule-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 15px;
  background-color: #e8f5e9;
  border-radius: 8px;
}

.rule-label {
  font-weight: bold;
  color: #333;
}

.rule-btn {
  padding: 8px 20px;
  border: 2px solid #4caf50;
  background-color: white;
  color: #4caf50;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.rule-btn:hover {
  background-color: #e8f5e9;
}

.rule-btn.active {
  background-color: #4caf50;
  color: white;
}

.rule-warning {
  text-align: center;
  padding: 15px;
  background-color: #fff3e0;
  color: #ff9800;
  border-radius: 8px;
  margin-bottom: 15px;
  font-weight: bold;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  margin-bottom: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
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

.equipment-selector {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  transition: opacity 0.3s;
}

.equipment-selector.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.type-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-item {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 20px;
  flex-wrap: nowrap;
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
  min-width: 80px;
  font-weight: bold;
  color: #2c3e50;
  font-size: 16px;
}

.type-value {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.selected-category-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.selected-rating-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: #fff7ed;
  color: #c2410c;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.selected-name {
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
  min-width: 140px;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.selected-tension {
  color: #9b59b6;
  padding: 4px 12px;
  background-color: #f5f0fa;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.friction-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.friction-label {
  font-size: 12px;
  color: #666;
}

.friction-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.friction-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.custom-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.material-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.material-label {
  font-size: 14px;
  color: #666;
}

.material-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
  outline: none;
}

.material-select:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.hook-name-input {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 200px;
  outline: none;
}

.hook-name-input:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
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

.wear-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.wear-label {
  font-size: 12px;
  color: #666;
}

.wear-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
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

.clear-btn {
  width: 28px;
  height: 28px;
  border: none;
  background-color: #e74c3c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #c0392b;
}

.actual-tension {
  color: #27ae60;
  font-weight: bold;
  padding: 4px 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
  font-size: 14px;
  margin-left: 10px;
}

.actual-panel-tension {
  color: #2980b9;
  font-weight: bold;
  padding: 4px 10px;
  background-color: #e8f5fa;
  border-radius: 4px;
  font-size: 14px;
  margin-left: 10px;
}

.adapt-weight-tag {
  color: #8e44ad;
  background-color: #f3e9fa;
}

/* 提交推荐装备 */
.submit-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  margin-bottom: 20px;
}

.submit-build-btn {
  padding: 12px 32px;
  border: 2px solid #ff9800;
  background-color: white;
  color: #ff9800;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s;
}

.submit-build-btn:hover {
  background-color: #ff9800;
  color: white;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-popup {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-title {
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-size: 20px;
  text-align: center;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.form-select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.form-select-multiple {
  height: auto;
  min-height: 120px;
}

.select-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.form-textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.modal-cancel-btn {
  padding: 10px 24px;
  border: 1px solid #ddd;
  background-color: white;
  color: #666;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.modal-cancel-btn:hover {
  background-color: #f5f5f5;
}

.modal-confirm-btn {
  padding: 10px 24px;
  border: none;
  background-color: #42b983;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.modal-confirm-btn:hover {
  background-color: #38a376;
}

.modal-confirm-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

@media (min-width: 768px) and (max-width: 1200px) {
  .app {
    padding: 15px;
    max-width: 900px;
  }

  h1 {
    font-size: 22px;
  }

  .type-item {
    padding: 15px 20px;
    gap: 15px;
  }

  .type-label {
    min-width: 60px;
    font-size: 14px;
  }

  .type-value {
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

@media (max-width: 768px) {
  .app {
    padding: 10px;
    max-width: 100%;
  }

  h1 {
    font-size: 18px;
    text-align: center;
  }

  h2 {
    font-size: 16px;
    margin-bottom: 10px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .rule-selector {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
  }

  .type-item {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 15px;
    gap: 10px;
  }

  .type-label {
    min-width: auto;
    font-size: 14px;
  }

  .type-value {
    flex-wrap: nowrap;
    gap: 6px;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .custom-input-group {
    flex-wrap: wrap;
    gap: 6px;
  }

  .wear-input-wrapper,
  .friction-input-wrapper {
    margin-left: 0;
  }

  .selected-name {
    min-width: 100%;
  }

  .selected-tension {
    font-size: 12px;
  }

  .actual-tension,
  .actual-panel-tension {
    font-size: 12px;
    padding: 3px 8px;
    margin-left: 0;
  }

  .wear-input,
  .friction-input,
  .tension-input {
    width: 45px;
  }
}
</style>
