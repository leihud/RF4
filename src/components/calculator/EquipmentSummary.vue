<template>
  <div class="summary-section">
    <h2>装备组合总览</h2>
    <div class="summary-card">
      <!-- 第一行：装备组合（整行） -->
      <div class="summary-row full-row">
        <span class="summary-label">装备组合:</span>
        <span class="summary-value">{{ equipmentSummaryText }}</span>
      </div>
      <!-- 第二行：两种最小拉力并排 -->
      <div class="summary-row" v-if="lockTensionMinInfo">
        <span class="summary-label">锁轮下最小拉力:</span>
        <span class="summary-value tension-min-value">{{ `${lockTensionMinInfo.label}: ${lockTensionMinInfo.valueText}` }}</span>
      </div>
      <div class="summary-row" v-if="panelTensionMinInfo">
        <span class="summary-label">常规下最小拉力:</span>
        <span class="summary-value tension-min-value">{{ `${panelTensionMinInfo.label}: ${panelTensionMinInfo.valueText}` }}</span>
      </div>
      <!-- 第三行：鱼竿/渔轮适配重并排 -->
      <div
        v-for="item in summaryAdaptWeightRows"
        :key="'adapt-' + item.type"
        class="summary-row"
      >
        <span class="summary-label">{{ item.label }}:</span>
        <span class="summary-value" :class="{ 'empty-value': !item.value }">
          {{ item.value || '未设置' }}
        </span>
      </div>
      <!-- 第四行：鱼竿/渔轮价格并排 -->
      <div v-for="item in selectedEquipmentList" :key="item.equipmentType" class="summary-row price-row">
        <span class="summary-label">{{ item.equipmentType }}价格:</span>
        <span class="summary-value">
          <span v-if="item.silverPrice" class="silver-price">银币：{{ formatPrice(item.silverPrice, 2) }}</span>
          <span v-if="item.goldPrice" class="gold-price">金币：{{ formatPrice(item.goldPrice, 2) }}</span>
          <span v-if="!item.silverPrice && !item.goldPrice">无</span>
        </span>
      </div>
      <!-- 第五行：装备总价格（整行） -->
      <div class="summary-row total-price-row full-row">
        <span class="summary-label">装备总价格:</span>
        <span class="summary-value">
          <span v-if="totalSilverPrice" class="silver-price">银币：{{ formatPrice(totalSilverPrice, 2) }}</span>
          <span v-if="totalGoldPrice" class="gold-price">金币：{{ formatPrice(totalGoldPrice, 2) }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import {
  calculateCustomActualTension,
  formatTension,
  buildMinTensionInfo
} from '../../utils/tension.js'
import { parsePrice, formatPrice, getMergedAdaptWeight } from '../../utils/display.js'
import { safeToNumber, toSafeNumber, toSafeDisplay } from '../../utils/sanitize.js'

/**
 * 装备组合总览：装备组合文本、锁轮/常规最小拉力、适配重、价格汇总。
 * 全部由 props 派生展示，无内部状态。
 */
export default {
  name: 'EquipmentSummary',
  props: {
    /** 已选择的鱼竿/渔轮列表 */
    selectedEquipmentList: {
      type: Array,
      default: () => []
    },
    /** 主线/引线手动录入 { 主线: {maxTension, wear}, 引线: {...} } */
    customEquipment: {
      type: Object,
      default: () => ({})
    },
    /** 部位 → 实际锁轮拉力 */
    actualLockTensionMap: {
      type: Object,
      default: () => ({})
    },
    /** 部位 → 实际面板拉力（含摩擦） */
    actualPanelTensionMap: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    selectedEquipmentMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        map[item.equipmentType] = item
      }
      return map
    },
    equipmentSummaryText() {
      const rod = this.selectedEquipmentMap['鱼竿']
      const reel = this.selectedEquipmentMap['渔轮']
      const pickName = (eq) => {
        if (!eq) return '未选择'
        const s = toSafeDisplay(eq.model || eq.equipmentName, '')
        return s || '未选择'
      }
      const rodName = pickName(rod)
      const reelName = pickName(reel)
      const mainLine = this.customEquipment['主线']
      const leader = this.customEquipment['引线']
      const fmt = (t) => {
        const mt = toSafeNumber(t.value && t.value.maxTension, 0)
        return mt > 0 ? `${toSafeDisplay(t.label || '')}(${mt}kN)` : '未设置'
      }
      return [
        rodName,
        reelName,
        fmt({ label: '主线', value: mainLine }),
        fmt({ label: '引线', value: leader })
      ].join(' + ')
    },
    /**
     * 锁轮下最小拉力（仅一行）：
     * 对比鱼竿实际锁轮 / 渔轮实际锁轮 / 主线实际拉力 / 引线实际拉力，取最小
     * 未选择/未录入（value<=0）的项跳过不参与
     */
    lockTensionMinInfo() {
      return buildMinTensionInfo(
        this.selectedEquipmentMap,
        this.actualLockTensionMap,
        this.customEquipment,
        calculateCustomActualTension,
        toSafeNumber,
        formatTension
      )
    },
    /**
     * 常规下最小拉力（仅一行）：
     * 对比鱼竿实际面板拉力 / 渔轮实际面板拉力（含摩擦） / 主线/引线实际拉力，取最小
     */
    panelTensionMinInfo() {
      return buildMinTensionInfo(
        this.selectedEquipmentMap,
        this.actualPanelTensionMap,
        this.customEquipment,
        calculateCustomActualTension,
        toSafeNumber,
        formatTension
      )
    },
    /** 鱼竿/渔轮各自的适配重展示行（合并后） */
    summaryAdaptWeightRows() {
      const rows = []
      const rod = this.selectedEquipmentMap['鱼竿']
      if (rod) {
        rows.push({ type: '鱼竿', label: '鱼竿适配重', value: getMergedAdaptWeight(rod, '鱼竿') })
      }
      const reel = this.selectedEquipmentMap['渔轮']
      if (reel) {
        rows.push({ type: '渔轮', label: '渔轮适配重', value: getMergedAdaptWeight(reel, '渔轮') })
      }
      return rows
    },
    totalSilverPrice() {
      return this.selectedEquipmentList.reduce((sum, item) => sum + parsePrice(item.silverPrice), 0)
    },
    totalGoldPrice() {
      return this.selectedEquipmentList.reduce((sum, item) => sum + parsePrice(item.goldPrice), 0)
    }
  },
  methods: {
    formatPrice
  }
}
</script>

<style scoped>
.summary-section {
  background-color: var(--color-success-bg);
  padding: 20px;
  border-radius: 8px;
  border: 2px solid var(--color-success-accent);
}

h2 {
  color: var(--text-heading);
  margin-bottom: 15px;
}

.summary-card {
  background-color: var(--color-surface);
  padding: 14px 20px;
  border-radius: 8px;
  /* 五行结构：同类项两两并排，首尾行横跨两列 */
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 24px;
}

/* 整行横跨两列（装备组合/总价格） */
.full-row {
  grid-column: 1 / -1;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-weight: bold;
  color: var(--text-heading);
  font-size: 16px;
}

.summary-value {
  color: var(--color-success-accent);
  font-weight: bold;
  font-size: 16px;
  flex: 1;
  text-align: right;
}

.price-row {
  background-color: var(--bg-secondary);
}

.total-price-row {
  background-color: var(--color-total-bg);
  font-size: 18px;
}

.total-price-row .summary-label {
  font-size: 18px;
  color: #d97706;
}

.total-price-row .summary-value {
  font-size: 18px;
  color: #d97706;
}

/* 汇总最小拉力行：与 total-price-row 同样的高亮底色，强调是汇总值 */
.summary-row:has(> .tension-min-value) {
  background-color: var(--color-tension-bg);
}

.tension-min-value {
  color: var(--color-tension-text);
  font-weight: bold;
}

.silver-price {
  margin-right: 12px;
  color: #94a3b8;
}

.gold-price {
  color: #eab308;
}

.summary-value.empty-value {
  color: #95a5a6;
  font-weight: normal;
}

@media (min-width: 768px) and (max-width: 1200px) {
  .summary-row {
    padding: 6px 0;
  }

  .summary-label,
  .summary-value {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  h2 {
    font-size: 16px;
    margin-bottom: 10px;
  }

  .summary-card {
    padding: 12px 15px;
    /* 窄屏回退单列纵向布局 */
    grid-template-columns: 1fr;
  }

  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    padding: 8px 0;
  }

  .summary-label,
  .summary-value {
    font-size: 13px;
  }

  .summary-value {
    text-align: left;
    flex: none;
  }
}
</style>
