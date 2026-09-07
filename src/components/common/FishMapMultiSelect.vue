<template>
  <div class="multi-select-picker">
    <label v-if="label" class="picker-label">{{ label }}</label>

    <!-- 已选标签 -->
    <div v-if="modelValue.length" class="selected-tags">
      <span v-for="(val, i) in modelValue" :key="i" class="selected-tag">
        {{ val }}
        <span class="tag-remove" :title="'移除 ' + val" @click.stop="toggle(val)">✕</span>
      </span>
    </div>

    <!-- 搜索框 -->
    <input
      v-model.trim="keyword"
      type="text"
      class="picker-search"
      :placeholder="placeholder"
    />

    <!-- 多选列表 -->
    <div class="multi-select-container">
      <div
        v-for="item in filteredOptions"
        :key="displayValue(item)"
        class="multi-select-item"
        :class="{ selected: isSelected(item) }"
        @click="toggle(displayValue(item))"
      >
        <span class="checkbox-icon">{{ isSelected(item) ? '☑' : '☐' }}</span>
        <span class="item-text">{{ displayValue(item) }}</span>
      </div>
      <div v-if="filteredOptions.length === 0" class="picker-empty">未找到匹配选项</div>
    </div>

    <span class="select-hint">已选择 {{ modelValue.length }} {{ unit }}</span>
  </div>
</template>

<script>
import { searchAndRankEquipment } from '../../utils/search.js'
import { toSafeDisplay } from '../../utils/sanitize.js'

/**
 * 鱼种/地图通用多选组件：已选标签 + 关键字搜索 + 勾选列表 + 数量提示。
 * 统一计算器「提交方案弹窗」与方案列表「编辑弹窗」中的适用鱼种/地图选择交互。
 * 通过 v-model 双向绑定选中的 display 值数组。
 */
export default {
  name: 'FishMapMultiSelect',
  props: {
    /** 已选中的值数组（通常为选项的 display 字段值） */
    modelValue: {
      type: Array,
      default: () => []
    },
    /** 可选项列表，每项至少包含 displayField 指定字段 */
    options: {
      type: Array,
      default: () => []
    },
    /** 字段名：选项展示值与选中值来源 */
    displayField: {
      type: String,
      default: 'display_name'
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '输入关键字搜索...'
    },
    /** 数量提示的单位文案，如「个鱼种」「张地图」 */
    unit: {
      type: String,
      default: '项'
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      keyword: ''
    }
  },
  computed: {
    filteredOptions() {
      if (!this.keyword) return this.options
      return searchAndRankEquipment(this.options, this.keyword, [this.displayField])
    }
  },
  methods: {
    toSafeDisplay,
    displayValue(item) {
      return this.toSafeDisplay(item && item[this.displayField])
    },
    isSelected(item) {
      return this.modelValue.includes(this.displayValue(item))
    },
    /** 切换选中状态（只触发 v-model 更新，不直接改动 props） */
    toggle(value) {
      if (value == null || value === '') return
      const next = this.modelValue.includes(value)
        ? this.modelValue.filter(v => v !== value)
        : [...this.modelValue, value]
      this.$emit('update:modelValue', next)
    }
  }
}
</script>

<style scoped>
.multi-select-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.picker-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

/* 已选标签 */
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

/* 搜索框 */
.picker-search {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--color-surface);
  color: var(--text-main);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.picker-search:focus {
  border-color: var(--color-success-accent);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.picker-search::placeholder {
  color: var(--text-hint);
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
  flex-shrink: 0;
}

.multi-select-item.selected .checkbox-icon {
  color: var(--color-success-accent);
}

.item-text {
  font-size: 14px;
  color: var(--text-main);
}

.picker-empty {
  padding: 14px;
  text-align: center;
  color: var(--text-hint);
  font-size: 13px;
}

.select-hint {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
}
</style>
