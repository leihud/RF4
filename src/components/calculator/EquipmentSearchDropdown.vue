<template>
  <div class="search-dropdown">
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
    <div v-if="isDropdownOpen && categoryOptions.length > 0" class="category-filter-header">
      <button class="category-toggle-btn" @mousedown.prevent="showCategoryFilter = !showCategoryFilter">
        {{ showCategoryFilter ? '▼' : '▲' }} 装备类型
      </button>
    </div>
    <div v-if="isDropdownOpen && showCategoryFilter && categoryOptions.length > 0" class="category-filter-wrapper">
      <button
        v-for="cat in categoryOptions"
        :key="cat"
        :class="['category-filter-btn', { active: selectedCategory === cat }]"
        @mousedown.prevent="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>
    <div v-if="isDropdownOpen" class="dropdown-list">
      <div
        v-for="(equipment, eqIdx) in filteredEquipment"
        :key="toSafeDisplay(equipment.model || equipment.equipmentName, String(equipment.id || eqIdx))"
        class="dropdown-item"
        @click.stop="$emit('select', equipment)"
      >
        <span class="dropdown-name">{{ toSafeDisplay(equipment.model || equipment.equipmentName, '-') }}</span>
        <span class="dropdown-category">{{ toSafeDisplay(equipment.form || equipment.category, '') }}</span>
        <span
          v-if="equipment.ratingAlias && equipment.ratingAlias !== '常规'"
          class="dropdown-rating"
        >{{ toSafeDisplay(equipment.ratingAlias) }}</span>
      </div>
      <div v-if="filteredEquipment.length === 0" class="dropdown-empty">
        {{ emptyHint || autoEmptyHint }}
      </div>
    </div>
  </div>
</template>

<script>
import { searchAndRankEquipment, sortByPanelTension, EQUIPMENT_SEARCH_FIELDS } from '../../utils/search.js'
import { safeToString, toSafeDisplay } from '../../utils/sanitize.js'

/**
 * 装备搜索下拉：自持搜索词（200ms 防抖）、分类筛选与下拉展开状态，
 * 父组件仅需传入当前类型的装备列表并监听 select 事件。
 * 组件随父级 v-if 卸载时状态自动重置，无需父级手动清空。
 */
export default {
  name: 'EquipmentSearchDropdown',
  props: {
    equipmentList: {
      type: Array,
      default: () => []
    },
    /** 外部传入的过滤函数，用于过滤装备列表（如根据鱼竿类型过滤兼容渔轮） */
    equipmentFilter: {
      type: Function,
      default: null
    },
    /** 兼容的渔轮分类列表（null 表示不限制），用于生成不兼容提示 */
    compatibleCategories: {
      type: Array,
      default: null
    },
    /** 自定义空状态提示文本，不传则显示默认或自动生成不兼容提示 */
    emptyHint: {
      type: String,
      default: null
    }
  },
  emits: ['select'],
  data() {
    return {
      searchQuery: '',
      debouncedSearchQuery: '',
      searchTimeout: null,
      isDropdownOpen: false,
      selectedCategory: '',
      showCategoryFilter: false
    }
  },
  watch: {
    searchQuery(val) {
      if (this.searchTimeout) clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.debouncedSearchQuery = val
      }, 200)
    }
  },
  beforeUnmount() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
  },
  computed: {
    categoryOptions() {
      if (!Array.isArray(this.equipmentList)) return ['全部']
      const categories = [...new Set(this.equipmentList.map(item => item.form))].filter(Boolean)
      return ['全部', ...categories]
    },
    filteredEquipment() {
      if (!Array.isArray(this.equipmentList)) return []
      let filtered = this.equipmentList

      // 外部兼容性过滤（如鱼竿-渔轮兼容性）
      if (typeof this.equipmentFilter === 'function') {
        filtered = filtered.filter(this.equipmentFilter)
      }

      if (this.selectedCategory && this.selectedCategory !== '全部') {
        filtered = filtered.filter(item => item.form === this.selectedCategory)
      }

      if (this.debouncedSearchQuery.trim()) {
        // 搜索字段与参数对比页统一（EQUIPMENT_SEARCH_FIELDS），保证两处搜索语义一致
        filtered = searchAndRankEquipment(filtered, this.debouncedSearchQuery, EQUIPMENT_SEARCH_FIELDS)
      } else {
        filtered = sortByPanelTension(filtered)
      }

      return filtered
    },
    /** 根据当前筛选状态自动生成空状态提示 */
    autoEmptyHint() {
      // 用户手动选了分类，且该分类不在兼容列表中
      if (this.selectedCategory && this.selectedCategory !== '全部' && Array.isArray(this.compatibleCategories)) {
        if (!this.compatibleCategories.includes(this.selectedCategory)) {
          return `该类型鱼竿无法装备「${this.selectedCategory}」`
        }
      }
      return '未找到匹配的装备'
    }
  },
  methods: {
    toSafeDisplay
  }
}
</script>

<style scoped>
.search-dropdown {
  position: relative;
  /* 固定宽度，确保搜索框/装备类型筛选/结果下拉列表三部分永远等宽对齐，不随筛选按钮多少而缩放 */
  width: 520px;
  flex: 0 0 auto;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--color-success-accent);
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-heading);
  background-color: var(--color-surface);
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.search-input::placeholder {
  color: var(--text-hint);
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
  background-color: var(--color-success-bg-light);
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
  background-color: var(--color-success-bg-light);
  border-bottom: 1px solid #dcfce7;
}

.category-filter-btn {
  padding: 4px 12px;
  border: 1px solid var(--color-success-border);
  background-color: var(--color-surface);
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
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
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
  border-bottom: 1px solid var(--bg-page);
  transition: background-color 0.2s;
  gap: 18px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: var(--color-success-bg);
}

.dropdown-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-heading);
  line-height: 1.4;
  /* 允许换行显示完整名称，不再强制单行省略 */
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.dropdown-category {
  flex: 0 0 auto;
  min-width: 68px;
  max-width: 120px;
  padding: 4px 12px;
  background-color: var(--color-success-bg-light);
  color: #166534;
  border: 1px solid var(--color-success-border);
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
  background-color: var(--color-warning-bg-light);
  color: var(--color-warning-strong);
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
  color: var(--text-hint);
  font-size: 14px;
}

@media (min-width: 768px) and (max-width: 1200px) {
  .search-dropdown {
    /* 中等屏也使用固定宽度，避免筛选按钮多少导致宽度缩放不一致 */
    width: 440px;
    min-width: auto;
    max-width: none;
  }
}

@media (max-width: 768px) {
  .search-dropdown {
    min-width: 100%;
    width: 100%;
  }

  .dropdown-item {
    flex-wrap: wrap;
    padding: 10px 14px;
    gap: 10px;
  }

  .dropdown-name {
    flex: 1 1 100%;
    min-width: 100%;
    font-size: 15px;
    margin-right: 0;
    margin-bottom: 2px;
  }

  .dropdown-category {
    min-width: 56px;
    max-width: 96px;
    padding: 3px 10px;
    font-size: 12px;
  }
}
</style>
