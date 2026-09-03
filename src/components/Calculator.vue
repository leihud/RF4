<template>
  <div class="app">
    <DisclaimerModal v-if="showDisclaimer" @close="showDisclaimer = false" />
    <div class="header">
      <h1>装备计算器</h1>
      <div class="header-buttons">
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
      <!-- 搜索输入框 -->
      <div class="fish-search-wrapper">
        <input
          v-model="targetFishSearch"
          type="text"
          class="fish-search-input"
          placeholder="搜索鱼种..."
          @focus="onFishSearchFocus"
        />
        <!-- 下拉列表 -->
        <div class="custom-dropdown" v-if="showFishDropdown">
          <div 
            class="dropdown-item" 
            :class="{ selected: selectedFish === '' }"
            @click="selectTargetFish('')"
          >
            不限
          </div>
          <div 
            v-for="fish in filteredTargetFishList" 
            :key="fish.name"
            class="dropdown-item"
            :class="{ selected: selectedFish === fish.display_name }"
            @click="selectTargetFish(fish.display_name)"
          >
            {{ fish.display_name }}
          </div>
        </div>
      </div>
      
      <span class="fish-label">目标地图:</span>
      <select v-model="selectedMap" class="fish-select">
        <option value="">不限</option>
        <option v-for="map in mapsList" :key="map.name" :value="map.display_name">
          {{ map.display_name }}
        </option>
      </select>
      
      <span class="fish-label">目标方案:</span>
      <select v-model="selectedBuild" class="fish-select">
        <option :value="null">请选择方案</option>
        <option v-for="build in filteredBuildNames" :key="build.id" :value="build">
          {{ build.name }} (总计{{ formatBuildPrice(build) }} | {{ formatBuildDate(build.created_at) }})
        </option>
      </select>
      
      <button class="query-btn" @click="queryAndApplyBuild" :disabled="!selectedBuild">
        加载装备方案
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

    <div v-if="dataLoadError" class="rule-warning" style="background-color: var(--color-warning-bg); color: var(--color-danger-strong);">
      装备数据加载失败
    </div>

    <div v-if="isLoading && equipmentData.length === 0" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <span class="loading-text">正在加载装备数据...</span>
      <AppSkeleton :rows="6" />
    </div>

    <div class="equipment-selector" :class="{ disabled: !calculationRule, flash: justApplied }">
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
                  <span class="wear-presets">
                    <button
                      v-for="p in WEAR_PRESETS"
                      :key="p"
                      type="button"
                      class="wear-preset-btn"
                      :title="'设为' + p + '% 磨损'"
                      @click="customEquipment[type].wear = p"
                    >{{ p }}</button>
                  </span>
                  <span class="input-label">线径:</span>
                  <input
                    type="number"
                    class="diameter-input"
                    v-model.number="customEquipment[type].diameter"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  <span class="input-unit">mm</span>
                  <span class="input-label">长度:</span>
                  <input
                    type="number"
                    class="length-input"
                    v-model.number="customEquipment[type].length"
                    placeholder="0"
                    min="0"
                  />
                  <span class="input-unit">{{ type === '主线' ? 'm' : 'cm' }}</span>
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
                  <button
                    v-for="p in WEAR_PRESETS"
                    :key="p"
                    type="button"
                    class="wear-preset-btn"
                    :title="'设为' + p + '% 磨损'"
                    @click="selectedEquipmentMap[type].wear = p"
                  >{{ p }}</button>
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
                  <button
                    v-for="f in frictionPresets"
                    :key="f"
                    type="button"
                    class="friction-preset-btn"
                    :title="'设为摩擦值 ' + f"
                    @click="setFriction(f)"
                  >{{ f }}</button>
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
          <!-- 移除按钮紧跟在更换装备后面，避免被参数区裁剪而不可见 -->
          <button
            v-if="selectedEquipmentMap[type]"
            class="clear-btn"
            title="移除该装备"
            aria-label="移除该装备"
            @click.stop="clearEquipmentByType(type)"
          >×</button>
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

    <!-- 磨损-拉力衰减曲线 -->
    <WearCurveChart
      v-if="allEquipmentSelected && wearCurveCandidates.length > 1"
      :candidates="wearCurveCandidates"
      :calc-rule="calculationRule"
      :friction="friction"
      mode="lock"
    />

    <!-- 提交推荐装备按钮 -->
    <div class="submit-section">
      <button 
        class="submit-build-btn" 
        @click="openSubmitModal"
        :disabled="!hasSelectedEquipment"
        :title="hasSelectedEquipment ? '' : '请先选择鱼竿、渔轮等装备'"
      >
        提交推荐装备搭配
      </button>
    </div>

    <!-- 提交弹窗 -->
    <div v-if="showSubmitModal" class="modal-mask" @click.self="closeSubmitModal">
      <div class="modal-popup">
        <h3 class="modal-title">提交推荐装备搭配</h3>
        <!-- 加载方案时显示提交模式选择 -->
        <div v-if="_sourceBuild" class="submit-mode-selector">
          <label class="mode-option">
            <input type="radio" v-model="submitMode" value="new" />
            <span>新增提交</span>
            <span class="mode-desc">作为新方案提交，需审核</span>
          </label>
          <label class="mode-option">
            <input type="radio" v-model="submitMode" value="overwrite" />
            <span>覆盖提交</span>
            <span class="mode-desc">覆盖原方案「{{ _sourceBuild.name }}」，需管理员密码</span>
          </label>
        </div>
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
          <!-- 鱼种和地图左右布局 -->
          <div class="form-row">
            <div class="form-group form-col">
              <label class="form-label">适用鱼种（可多选）</label>
              <!-- 已选标签 -->
              <div v-if="submitForm.suitableFish.length" class="selected-tags">
                <span v-for="(fish, i) in submitForm.suitableFish" :key="i" class="selected-tag">
                  {{ fish }}
                  <span class="tag-remove" @click="toggleFishSelection(fish)">✕</span>
                </span>
              </div>
              <!-- 搜索框 -->
              <input
                v-model="fishSearchKeyword"
                type="text"
                class="search-input"
                placeholder="输入鱼种名称搜索..."
              />
              <!-- 多选列表 -->
              <div class="multi-select-container">
                <div 
                  v-for="fish in filteredFishSpeciesList" 
                  :key="fish.name"
                  class="multi-select-item"
                  :class="{ selected: submitForm.suitableFish.includes(fish.display_name) }"
                  @click="toggleFishSelection(fish.display_name)"
                >
                  <span class="checkbox-icon">{{ submitForm.suitableFish.includes(fish.display_name) ? '☑' : '☐' }}</span>
                  <span class="item-text">{{ fish.display_name }}</span>
                </div>
              </div>
              <span class="select-hint">已选择 {{ submitForm.suitableFish.length }} 个鱼种</span>
            </div>
            <div class="form-group form-col">
              <label class="form-label">适用地图（可多选）</label>
              <!-- 已选标签 -->
              <div v-if="submitForm.suitableMap.length" class="selected-tags">
                <span v-for="(map, i) in submitForm.suitableMap" :key="i" class="selected-tag">
                  {{ map }}
                  <span class="tag-remove" @click="toggleMapSelection(map)">✕</span>
                </span>
              </div>
              <!-- 搜索框 -->
              <input
                v-model="mapSearchKeyword"
                type="text"
                class="search-input"
                placeholder="输入地图名称搜索..."
              />
              <!-- 多选列表 -->
              <div class="multi-select-container">
                <div 
                  v-for="map in filteredMapList" 
                  :key="map.name"
                  class="multi-select-item"
                  :class="{ selected: submitForm.suitableMap.includes(map.display_name) }"
                  @click="toggleMapSelection(map.display_name)"
                >
                  <span class="checkbox-icon">{{ submitForm.suitableMap.includes(map.display_name) ? '☑' : '☐' }}</span>
                  <span class="item-text">{{ map.display_name }}</span>
                </div>
              </div>
              <span class="select-hint">已选择 {{ submitForm.suitableMap.length }} 张地图</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" @click="closeSubmitModal">取消</button>
          <button class="modal-confirm-btn" @click="submitBuild" :disabled="isSubmitting">
            {{ isSubmitting ? '提交中...' : (submitMode === 'overwrite' ? '覆盖提交' : '确认提交') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast 提示（共享组件，自管定时器） -->
    <AppToast ref="toast" />
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
import {
  calculateActualLockTension,
  calculateActualPanelTension,
  calculateCustomActualTension,
  clampFriction,
  getFrictionMax,
  formatTension
} from '../utils/tension.js'
import { getMergedAdaptWeight } from '../utils/display.js'
import { sanitizeEquipmentFields, safeToNumber, toSafeNumber, toSafeDisplay } from '../utils/sanitize.js'
import { loadRodAndReelData } from '../utils/equipmentLoader.js'
import { encodePreset, decodePreset, getShareUrl } from '../utils/presetShare.js'
import DisclaimerModal from './calculator/DisclaimerModal.vue'
import EquipmentSearchDropdown from './calculator/EquipmentSearchDropdown.vue'
import EquipmentSummary from './calculator/EquipmentSummary.vue'
import WearCurveChart from './calculator/WearCurveChart.vue'
import AppToast from './common/AppToast.vue'
import AppSkeleton from './common/AppSkeleton.vue'
import { lockScroll, bindEscape } from '../utils/modal.js'

export default {
  name: 'Calculator',
  components: {
    DisclaimerModal,
    EquipmentSearchDropdown,
    EquipmentSummary,
    WearCurveChart,
    AppToast,
    AppSkeleton
  },
  data() {
    return {
      selectedType: null,
      equipmentData: [],
      dataLoadError: false,
      isLoading: false,
      showDisclaimer: false,
      customEquipment: {
        '主线': { maxTension: 0, wear: 0, material: '', diameter: 0, length: 0 },
        '引线': { maxTension: 0, wear: 0, material: '', diameter: 0, length: 0 },
        '鱼钩': { name: '' }
      },
      friction: DEFAULT_FRICTION,
      selectedEquipmentList: [],
      calculationRule: CALC_RULES.GUIDE,
      justApplied: false,
      WEAR_PRESETS: [0, 50, 100],
      CALC_RULE_OPTIONS,
      LINE_MATERIALS,
      formatTension,
      shareHint: '',
      selectedFish: '',
      selectedMap: '',
      selectedBuild: null,
      targetFishSearch: '',
      showFishDropdown: false,
      showSubmitModal: false,
      isSubmitting: false,
      submitForm: {
        name: '',
        description: '',
        suitableFish: [],
        suitableMap: []
      },
      _sourceBuild: null,
      submitMode: 'new', // 'new' | 'overwrite'
      mapsList: [],
      fishSpeciesList: [],
      recommendedBuilds: [],
      fishSearchKeyword: '',
      mapSearchKeyword: ''
    }
  },
  mounted() {
    this.loadEquipmentData()
    document.addEventListener('click', this.handleClickOutside)
    // 仅在当前浏览器会话首次打开时弹出免责声明
    if (!sessionStorage.getItem('disclaimer_shown')) {
      this.showDisclaimer = true
      sessionStorage.setItem('disclaimer_shown', '1')
    }
    this.restoreFromUrl()
    // 读取方案汇总页「一键应用」暂存的方案（立即读出并清除，防止刷新重复应用）
    try {
      const payload = sessionStorage.getItem('apply_build_payload')
      if (payload) {
        this._pendingBuild = JSON.parse(payload)
        sessionStorage.removeItem('apply_build_payload')
      }
    } catch (e) {
      console.error('解析待应用方案失败:', e)
    }
    this.loadMapsAndFishSpecies()
    this.loadRecommendedBuilds()
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
    if (this._stateSaveTimer) clearTimeout(this._stateSaveTimer)
    if (this._escOff) {
      this._escOff()
      this._escOff = null
    }
    if (this.showSubmitModal) lockScroll(false)
  },
  watch: {
    calculationRule(val) {
      if (val) {
        this.friction = clampFriction(this.friction, val)
      }
      if (this._stateReady) this.scheduleSaveState()
    },
    // 状态持久化：装备/线材/摩擦变化后防抖写入 localStorage，刷新页面可恢复
    selectedEquipmentList: {
      deep: true,
      handler() { if (this._stateReady) this.scheduleSaveState() }
    },
    customEquipment: {
      deep: true,
      handler() { if (this._stateReady) this.scheduleSaveState() }
    },
    friction() {
      if (this._stateReady) this.scheduleSaveState()
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
        this.selectedBuild = null
      }
    },
    /** 地图切换时，清空方案选择 */
    selectedMap(newMap) {
      if (!newMap) {
        this.selectedBuild = null
      }
    },
    /** 提交弹窗：打开时锁定 body 滚动并支持 Esc 关闭 */
    showSubmitModal(open) {
      if (open) {
        lockScroll(true)
        this._escOff = bindEscape(this.closeSubmitModal)
      } else {
        lockScroll(false)
        if (this._escOff) {
          this._escOff()
          this._escOff = null
        }
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
    /** 摩擦快捷预设：低/高/上限，去重后展示 */
    frictionPresets() {
      const max = this.frictionMax
      return [...new Set([10, 25, max].filter(v => v > 0 && v <= max))]
    },
    selectedEquipmentMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        map[item.equipmentType] = item
      }
      return map
    },
    /** 磨损曲线候选件：竿/轮 + 已录入的主线/引线 */
    wearCurveCandidates() {
      const out = []
      const add = (key, name, type, item) => {
        if (item) out.push({ key, name, type, item })
      }
      const rod = this.selectedEquipmentMap['鱼竿']
      if (rod) add('rod', rod.model || rod.equipmentName || '鱼竿', 'rod', rod)
      const reel = this.selectedEquipmentMap['渔轮']
      if (reel) add('reel', reel.model || reel.equipmentName || '渔轮', 'reel', reel)
      const line = this.customEquipment['主线']
      if (line && Number(line.maxTension) > 0) add('line', '主线', 'line', line)
      const leader = this.customEquipment['引线']
      if (leader && Number(leader.maxTension) > 0) add('leader', '引线', 'line', leader)
      return out
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
    /** 根据选中的鱼种和地图过滤方案列表（保留重名方案） */
    filteredBuildNames() {
      let builds = this.recommendedBuilds.filter(b => b.name)
      
      // 如果没有选择鱼种或地图，返回所有方案
      if (!this.selectedFish && !this.selectedMap) {
        return builds
      }
      
      // 根据鱼种和地图过滤
      return builds.filter(build => {
        const fishMatch = !this.selectedFish || 
          (build.suitable_fish && build.suitable_fish.includes(this.selectedFish))
        const mapMatch = !this.selectedMap || 
          (build.suitable_map && build.suitable_map.includes(this.selectedMap))
        return fishMatch && mapMatch
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
    },
    /** 根据搜索关键词过滤鱼种列表 */
    filteredFishSpeciesList() {
      if (!this.fishSearchKeyword.trim()) {
        return this.fishSpeciesList
      }
      const keyword = this.fishSearchKeyword.toLowerCase()
      return this.fishSpeciesList.filter(fish => 
        fish.display_name.toLowerCase().includes(keyword)
      )
    },
    /** 根据搜索关键词过滤地图列表 */
    filteredMapList() {
      if (!this.mapSearchKeyword.trim()) {
        return this.mapsList
      }
      const keyword = this.mapSearchKeyword.toLowerCase()
      return this.mapsList.filter(map => 
        map.display_name.toLowerCase().includes(keyword)
      )
    },
    /** 过滤目标鱼种下拉列表 */
    filteredTargetFishList() {
      if (!this.targetFishSearch.trim()) {
        return this.fishSpeciesList
      }
      const keyword = this.targetFishSearch.toLowerCase()
      return this.fishSpeciesList.filter(fish => 
        fish.display_name.toLowerCase().includes(keyword)
      )
    },
    /** 判断是否选择了必要的装备 */
    hasSelectedEquipment() {
      // 必须选择鱼竿，其他为可选
      return !!this.selectedEquipmentMap['鱼竿']
    }
  },
  methods: {
    toSafeNumber,
    toSafeDisplay,
    getMergedAdaptWeight,
    isCustomInputType(type) {
      return CUSTOM_INPUT_TYPES.includes(type)
    },
    isSearchableType(type) {
      return SEARCHABLE_TYPES.includes(type)
    },
    /** 摩擦快捷设置（自动钉制到当前规则上限） */
    setFriction(value) {
      this.friction = clampFriction(value, this.calculationRule)
    },
    /** 防抖持久化当前计算状态 */
    scheduleSaveState() {
      if (this._stateSaveTimer) clearTimeout(this._stateSaveTimer)
      this._stateSaveTimer = setTimeout(() => {
        try {
          const state = {
            equipment: this.selectedEquipmentList.map(item => ({
              type: item.equipmentType,
              model: item.model || item.equipmentName,
              wear: item.wear || 0
            })),
            custom: this.customEquipment,
            friction: this.friction,
            rule: this.calculationRule
          }
          localStorage.setItem('calc_state_v1', JSON.stringify(state))
        } catch (e) { /* 存储不可用（隐私模式/超容量）时静默降级 */ }
      }, 400)
    },
    /** 从 localStorage 恢复上次计算状态（仅当无 URL 方案/一键应用时） */
    restoreFromSavedState() {
      try {
        const raw = localStorage.getItem('calc_state_v1')
        if (!raw) return
        const state = JSON.parse(raw)
        if (state.rule) this.calculationRule = state.rule
        if (state.friction != null) this.friction = clampFriction(state.friction, this.calculationRule)
        if (state.custom) {
          for (const type of ['主线', '引线']) {
            if (state.custom[type]) Object.assign(this.customEquipment[type], state.custom[type])
          }
          if (state.custom['鱼钩'] && state.custom['鱼钩'].name) {
            this.customEquipment['鱼钩'].name = state.custom['鱼钩'].name
          }
        }
        if (Array.isArray(state.equipment)) {
          for (const saved of state.equipment) {
            const item = this.equipmentData.find(d =>
              d.equipmentType === saved.type &&
              (d.model === saved.model || d.equipmentName === saved.model)
            )
            if (item) this.selectedEquipmentList.push({ ...item, wear: saved.wear || 0 })
          }
        }
      } catch (e) {
        console.error('恢复本地状态失败:', e)
      }
    },
    async loadEquipmentData() {
      this.equipmentData = []
      this.isLoading = true
      const { rodData, reelData, error } = await loadRodAndReelData()
      this.equipmentData = [...rodData, ...reelData]
      this.dataLoadError = error
      this.isLoading = false
      // 数据就绪后恢复 URL 中的装备方案
      this.applyPendingPreset()
      // 应用方案汇总页「一键应用」的方案（显式操作，优先于 URL 恢复）
      if (this._pendingBuild) {
        this.applyRecommendedBuild(this._pendingBuild)
        this.showToast(`已应用方案「${this._pendingBuild.name || '未命名方案'}」`, 'success')
        this._pendingBuild = null
        this._hadExternalRestore = true
        // 应用高亮：短暂闪烁装备区，让用户感知哪些内容被方案修改
        this.justApplied = true
        setTimeout(() => { this.justApplied = false }, 1500)
      }
      // 无 URL 方案且无一键应用时，恢复上次本地状态；之后开启持久化
      if (!this._hadExternalRestore && !this._pendingPreset) {
        this.restoreFromSavedState()
      }
      this._stateReady = true
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
          this.showToast('当前鱼竿无法装备此类型渔轮', 'error')
          return
        }
      }
      const existingIndex = this.selectedEquipmentList.findIndex(
        item => item.equipmentType === safe.equipmentType
      )
      const next = { ...safe, wear: 0 }
      if (existingIndex >= 0) {
        next.wear = toSafeNumber(this.selectedEquipmentList[existingIndex].wear, 0)
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
      
      // 点击在目标鱼种搜索框或下拉列表内，不关闭
      const fishSearchInput = el.querySelector('.fish-search-input')
      const customDropdown = el.querySelector('.custom-dropdown')
      if ((fishSearchInput && fishSearchInput.contains(event.target)) || 
          (customDropdown && customDropdown.contains(event.target))) {
        return
      }
      
      // 点击免责声明区域时不处理
      const disclaimers = document.querySelectorAll('.disclaimer-mask, .disclaimer-popup, .disclaimer-footer')
      for (const el2 of disclaimers) {
        if (el2 && el2.contains && el2.contains(event.target)) return
      }
      
      // 关闭鱼种下拉列表
      this.showFishDropdown = false
      
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
    /** 从 URL 参数恢复装备方案 */
    restoreFromUrl() {
      const preset = decodePreset(window.location.search)
      if (!preset) return
      this._hadExternalRestore = true
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
        rodWear: rod ? toSafeNumber(rod.wear, 0) : 0,
        reelWear: reel ? toSafeNumber(reel.wear, 0) : 0,
        friction: toSafeNumber(this.friction, 0),
        mainLineTension: toSafeNumber(this.customEquipment['主线'].maxTension, 0),
        mainLineWear: toSafeNumber(this.customEquipment['主线'].wear, 0),
        leaderLineTension: toSafeNumber(this.customEquipment['引线'].maxTension, 0),
        leaderLineWear: toSafeNumber(this.customEquipment['引线'].wear, 0),
        calculationRule: this.calculationRule
      }
      const url = getShareUrl(state)
      try {
        await navigator.clipboard.writeText(url)
        this.showToast('分享链接已复制', 'success')
        this.shareHint = ''
      } catch (_) {
        // 剪贴板 API 不可用时，将链接直接展示在按钮位置供手动复制
        this.shareHint = url
        this.showToast('复制失败，链接已显示在按钮上，请手动复制', 'error')
      }
    },
    /** 从数据库加载地图和鱼种列表 */
    async loadMapsAndFishSpecies() {
      try {
        const [mapsRes, fishRes] = await Promise.allSettled([
          fetch('/api/maps'),
          fetch('/api/fish_species')
        ])
        if (mapsRes.status === 'fulfilled' && mapsRes.value.ok) {
          try {
            const mapsData = await mapsRes.value.json()
            if (mapsData.success) this.mapsList = mapsData.data || []
          } catch (e) { console.error('解析地图数据失败:', e) }
        }
        if (fishRes.status === 'fulfilled' && fishRes.value.ok) {
          try {
            const fishData = await fishRes.value.json()
            if (fishData.success) this.fishSpeciesList = fishData.data || []
          } catch (e) { console.error('解析鱼种数据失败:', e) }
        }
        if (this.mapsList.length === 0 && this.fishSpeciesList.length === 0) {
          this.showToast('地图和鱼种数据加载失败', 'error')
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
      // 如果之前应用过推荐方案，预填表单
      if (this._sourceBuild) {
        const b = this._sourceBuild
        this.submitForm = {
          name: b.name || '',
          description: b.description || '',
          suitableFish: Array.isArray(b.suitable_fish)
            ? b.suitable_fish
            : (b.suitable_fish ? b.suitable_fish.split(',').map(s => s.trim()).filter(Boolean) : []),
          suitableMap: Array.isArray(b.suitable_map)
            ? b.suitable_map
            : (b.suitable_map ? b.suitable_map.split(',').map(s => s.trim()).filter(Boolean) : [])
        }
        this.submitMode = 'new'
      } else {
        this.submitMode = 'new'
      }
      this.showSubmitModal = true
    },
    closeSubmitModal() {
      this.showSubmitModal = false
      this._sourceBuild = null
    },
    async submitBuild() {
      const rod = this.selectedEquipmentMap['鱼竿']
      const reel = this.selectedEquipmentMap['渔轮']
      
      const build = {
        name: this.submitForm.name,
        rodModel: rod ? (rod.model || rod.equipmentName) : '',
        rodName: rod ? rod.equipmentName : '',
        rodCategory: rod ? rod.category : '',
        rodPrice: rod ? toSafeNumber(rod.silverPrice, 0) : 0,
        rodTension: rod ? toSafeNumber(this.actualPanelTensionMap['鱼竿'], 0) : 0,
        reelModel: reel ? (reel.model || reel.equipmentName) : '',
        reelName: reel ? reel.equipmentName : '',
        reelCategory: reel ? reel.category : '',
        reelPrice: reel ? toSafeNumber(reel.silverPrice, 0) : 0,
        reelTension: reel ? toSafeNumber(this.actualPanelTensionMap['渔轮'], 0) : 0,
        mainLineTension: toSafeNumber(this.customEquipment['主线'].maxTension, 0),
        mainLineWear: toSafeNumber(this.customEquipment['主线'].wear, 0),
        mainLineMaterial: this.customEquipment['主线'].material || '',
        mainLineDiameter: toSafeNumber(this.customEquipment['主线'].diameter, 0),
        mainLineLength: toSafeNumber(this.customEquipment['主线'].length, 0),
        leaderLineTension: toSafeNumber(this.customEquipment['引线'].maxTension, 0),
        leaderLineWear: toSafeNumber(this.customEquipment['引线'].wear, 0),
        leaderLineMaterial: this.customEquipment['引线'].material || '',
        leaderLineDiameter: toSafeNumber(this.customEquipment['引线'].diameter, 0),
        leaderLineLength: toSafeNumber(this.customEquipment['引线'].length, 0),
        hookName: this.customEquipment['鱼钩'].name || '',
        calculationRule: this.calculationRule,
        friction: toSafeNumber(this.friction, 0),
        description: this.submitForm.description,
        suitableFish: Array.isArray(this.submitForm.suitableFish) ? this.submitForm.suitableFish.join(',') : this.submitForm.suitableFish,
        suitableMap: Array.isArray(this.submitForm.suitableMap) ? this.submitForm.suitableMap.join(',') : this.submitForm.suitableMap
      }

      this.isSubmitting = true
      try {
        let response, result
        if (this.submitMode === 'overwrite' && this._sourceBuild) {
          // 覆盖提交：需要管理员密码
          const password = prompt('覆盖提交需要管理员密码：')
          if (password === null) { this.isSubmitting = false; return }
          response = await fetch('/api/recommended_builds', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: this._sourceBuild.id, build, password })
          })
        } else {
          // 新增提交
          response = await fetch('/api/recommended_builds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ build })
          })
        }
        result = await response.json()
        if (result.success) {
          const msg = this.submitMode === 'overwrite' ? '方案已更新' : '方案已提交，等待审核通过后展示'
          this.showToast(msg, 'success')
          this.closeSubmitModal()
          this.submitForm = { name: '', description: '', suitableFish: [], suitableMap: [] }
          this._sourceBuild = null
          // 刷新方案列表
          this.loadRecommendedBuilds()
        } else {
          const errorMsg = result.error || result.message || '未知错误'
          this.showToast('保存失败：' + errorMsg, 'error')
          console.error('保存失败详情:', result)
        }
      } catch (error) {
        this.showToast('提交失败：' + error.message, 'error')
        console.error('提交异常:', error)
      } finally {
        this.isSubmitting = false
      }
    },
    /** 格式化方案总价格 */
    formatBuildPrice(build) {
      const total = (build.rod_price || 0) + (build.reel_price || 0)
      if (!total) return '-'
      return total.toLocaleString('zh-CN')
    },
    /** 格式化方案创建时间 */
    formatBuildDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
    /** 查询并应用选中的方案 */
    queryAndApplyBuild() {
      if (!this.selectedBuild) {
        this.showToast('请先选择目标方案', 'error')
        return
      }
      
      this.applyRecommendedBuild(this.selectedBuild)
    },
    /** 应用推荐装备搭配到当前选择 */
    applyRecommendedBuild(build) {
      // 保存方案元数据，供提交弹窗预填
      this._sourceBuild = build
      
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
        this.customEquipment['主线'].diameter = build.main_line_diameter || 0
        this.customEquipment['主线'].length = build.main_line_length || 0
      }
      
      // 设置引线
      if (build.leader_line_tension > 0) {
        this.customEquipment['引线'].maxTension = build.leader_line_tension
        this.customEquipment['引线'].wear = build.leader_line_wear || 0
        this.customEquipment['引线'].material = build.leader_line_material || ''
        this.customEquipment['引线'].diameter = build.leader_line_diameter || 0
        this.customEquipment['引线'].length = build.leader_line_length || 0
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
    },
    /** 切换鱼种选择状态 */
    toggleFishSelection(fishName) {
      const index = this.submitForm.suitableFish.indexOf(fishName)
      if (index > -1) {
        // 已选中，取消选择
        this.submitForm.suitableFish.splice(index, 1)
      } else {
        // 未选中，添加选择
        this.submitForm.suitableFish.push(fishName)
      }
    },
    /** 切换地图选择状态 */
    toggleMapSelection(mapName) {
      const index = this.submitForm.suitableMap.indexOf(mapName)
      if (index > -1) {
        this.submitForm.suitableMap.splice(index, 1)
      } else {
        this.submitForm.suitableMap.push(mapName)
      }
    },
    /** 选择目标鱼种 */
    selectTargetFish(fishName) {
      this.selectedFish = fishName
      this.showFishDropdown = false
      this.targetFishSearch = fishName
    },
    /** 鱼种搜索框聚焦：清空搜索词并展开下拉，方便重新搜索 */
    onFishSearchFocus() {
      this.targetFishSearch = ''
      this.showFishDropdown = true
    },
    /** 显示/隐藏鱼种下拉列表 */
    toggleFishDropdown() {
      this.showFishDropdown = !this.showFishDropdown
    },
    showToast(message, type = 'info') {
      this.$refs.toast.show(message, type)
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
  border-bottom: 2px solid var(--color-primary-bg);
}

h1 {
  color: var(--color-primary);
  font-size: 28px;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

/* 磨损/摩擦快捷预设按钮 */
.wear-presets {
  display: inline-flex;
  gap: 4px;
}

.wear-preset-btn,
.friction-preset-btn {
  padding: 1px 6px;
  margin-left: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--text-secondary);
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.wear-preset-btn:hover,
.friction-preset-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* 一键应用方案后的短暂高亮 */
.equipment-selector.flash {
  animation: apply-flash 1.4s ease;
}

@keyframes apply-flash {
  0%, 100% { box-shadow: none; }
  30% { box-shadow: 0 0 0 3px var(--color-success-bg), 0 0 14px var(--color-success-accent); }
}

/* 分享方案按钮 */
.share-btn {
  padding: 10px 24px;
  border: 2px solid #7b1fa2;
  background-color: var(--color-surface);
  color: #7b1fa2;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
}

.share-btn:hover {
  background-color: var(--color-warning-bg-light);
}

/* 查询按钮 */
.query-btn {
  padding: 8px 20px;
  border: 2px solid var(--color-success-accent);
  background-color: var(--color-surface);
  color: var(--color-success-accent);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
}

.query-btn:hover:not(:disabled) {
  background-color: var(--color-success-bg);
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
  background-color: var(--color-primary-bg);
  border-radius: 8px;
  flex-wrap: wrap;
  position: relative;
}

.fish-label {
  font-weight: bold;
  color: var(--color-primary);
  font-size: 14px;
}

.fish-select {
  padding: 6px 12px;
  border: 1px solid var(--color-primary-light);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-surface);
  color: var(--text-main);
  cursor: pointer;
  outline: none;
}

.fish-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

.fish-search-wrapper {
  position: relative;
  display: inline-block;
}

/* 目标鱼种搜索输入框 */
.fish-search-input {
  padding: 6px 12px;
  border: 1px solid var(--color-primary-light);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-surface);
  color: var(--text-main);
  outline: none;
  min-width: 150px;
}

.fish-search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

/* 自定义下拉列表 */
.custom-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 4px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.dropdown-item:hover {
  background-color: var(--bg-page);
}

.dropdown-item.selected {
  background-color: var(--color-primary-bg);
  font-weight: bold;
}

.fish-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-main);
  flex-wrap: wrap;
}

.tips-icon::before {
  content: '💡';
}

.tips-range {
  color: var(--color-primary);
  font-weight: 600;
  background-color: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

h2 {
  color: var(--text-heading);
  margin-bottom: 15px;
}

.rule-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 15px;
  background-color: var(--color-success-bg);
  border-radius: 8px;
}

.rule-label {
  font-weight: bold;
  color: var(--text-main);
}

.rule-btn {
  padding: 8px 20px;
  border: 2px solid var(--color-success-accent);
  background-color: var(--color-surface);
  color: var(--color-success-accent);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.rule-btn:hover {
  background-color: var(--color-success-bg);
}

.rule-btn.active {
  background-color: var(--color-success-accent);
  color: white;
}

.rule-warning {
  text-align: center;
  padding: 15px;
  background-color: var(--color-warning-bg);
  color: var(--color-warning-accent);
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
  border: 4px solid var(--color-border);
  border-top: 4px solid var(--color-success-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 15px;
  color: var(--text-secondary);
  font-size: 14px;
}

.equipment-selector {
  background-color: var(--color-surface);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  transition: opacity 0.3s;
}

.equipment-selector h2 {
  color: var(--text-heading);
  font-size: 18px;
  margin: 0 0 16px 0;
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
  border: 2px solid var(--color-border);
  background-color: var(--color-surface);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 20px;
  flex-wrap: nowrap;
}

.type-item:hover {
  border-color: var(--color-success-accent);
  background-color: var(--color-success-bg-light);
}

.type-item.active {
  border-color: var(--color-success-accent);
  background-color: var(--color-success-bg);
}

.type-label {
  min-width: 80px;
  font-weight: bold;
  color: var(--text-heading);
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
  color: var(--text-hint);
  font-style: italic;
}

.selected-category-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.selected-rating-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: var(--color-warning-bg-light);
  color: var(--color-warning-strong);
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.selected-name {
  font-weight: bold;
  color: var(--text-heading);
  font-size: 14px;
  min-width: 140px;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.selected-tension {
  color: var(--color-primary);
  padding: 4px 12px;
  background-color: var(--color-primary-bg);
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
  color: var(--text-secondary);
}

.friction-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.friction-input:focus {
  outline: none;
  border-color: var(--color-success-accent);
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
  color: var(--text-secondary);
}

.material-select {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--color-surface);
  cursor: pointer;
  outline: none;
}

.material-select:focus {
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.hook-name-input {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  width: 200px;
  outline: none;
}

.hook-name-input:focus {
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.input-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.tension-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.tension-input:focus {
  outline: none;
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.diameter-input,
.length-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.diameter-input:focus,
.length-input:focus {
  outline: none;
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.input-unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.select-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-success-accent);
  border-radius: 4px;
  background-color: var(--color-surface);
  color: var(--color-success-accent);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  /* 参数区溢出裁剪时仍固定在行尾可见 */
  flex-shrink: 0;
}

.select-btn:hover {
  background-color: var(--color-success-accent);
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
  color: var(--text-secondary);
}

.wear-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.wear-input:focus {
  outline: none;
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.wear-unit {
  font-size: 14px;
  color: var(--text-secondary);
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
  /* 行尾固定，不随参数区伸缩 */
  flex-shrink: 0;
  margin-left: 8px;
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
  background-color: var(--color-success-bg);
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
  border: 2px solid var(--color-warning-accent);
  background-color: var(--color-surface);
  color: var(--color-warning-accent);
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s;
}

.submit-build-btn:hover:not(:disabled) {
  background-color: var(--color-warning-accent);
  color: white;
}

.submit-build-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: var(--color-border-light);
  color: var(--color-border-light);
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
  background-color: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-title {
  color: var(--text-heading);
  margin: 0 0 20px 0;
  font-size: 20px;
  text-align: center;
}

/* 提交模式选择器 */
.submit-mode-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: #f0f7ff;
  border: 1px solid #b3d4fc;
  border-radius: 8px;
}

.mode-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-surface);
}

.mode-option:hover {
  border-color: var(--color-primary);
}

.mode-option:has(input:checked) {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

.mode-option input[type="radio"] {
  margin: 0;
  accent-color: var(--color-primary);
}

.mode-option > span:first-of-type {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-main);
}

.mode-desc {
  font-size: 12px;
  color: #888;
  font-weight: normal;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 鱼种地图左右布局 */
.form-row {
  display: flex;
  gap: 16px;
}

.form-col {
  flex: 1;
  min-width: 0;
}

.form-col .multi-select-container {
  max-height: 180px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.form-input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.form-select {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-surface);
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:focus {
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

/* 搜索输入框 */
.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 8px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

/* 已选标签 */
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 24px;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.tag-remove {
  cursor: pointer;
  font-size: 12px;
  color: var(--text-hint);
  margin-left: 2px;
  line-height: 1;
}

.tag-remove:hover {
  color: var(--color-danger);
}

/* 多选容器 */
.multi-select-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
}

/* 多选项 */
.multi-select-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--bg-secondary);
}

.multi-select-item:last-child {
  border-bottom: none;
}

.multi-select-item:hover {
  background-color: var(--bg-page);
}

.multi-select-item.selected {
  background-color: var(--color-success-bg);
}

.checkbox-icon {
  font-size: 16px;
  margin-right: 8px;
  color: var(--text-secondary);
}

.multi-select-item.selected .checkbox-icon {
  color: var(--color-success-accent);
}

.item-text {
  font-size: 14px;
  color: var(--text-main);
}

.form-select-multiple {
  height: auto;
  min-height: 120px;
}

.select-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
}

.form-textarea {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  border-color: var(--color-success-accent);
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
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.modal-cancel-btn:hover {
  background-color: var(--bg-page);
}

.modal-confirm-btn {
  padding: 10px 24px;
  border: none;
  background-color: var(--color-success-accent);
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
  background-color: var(--color-border-light);
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

/* 提交弹窗移动端：鱼种地图改回纵向 */
@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  .form-col .multi-select-container {
    max-height: 200px;
  }
}
</style>

<style>
/* 夜间模式：Calculator 页面暗色覆盖 */
:root[data-theme="dark"] .fish-select,
:root[data-theme="dark"] .fish-search-input {
  color: var(--text-main);
  background-color: var(--color-surface);
}

:root[data-theme="dark"] .fish-select option {
  background-color: var(--color-surface);
  color: var(--text-main);
}

:root[data-theme="dark"] .fish-search-input::placeholder,
:root[data-theme="dark"] .fish-select option[value=""] {
  color: var(--text-hint);
}
</style>
