<template>
  <div class="wear-curve-card">
    <div class="curve-header">
      <h4 class="curve-title">
        磨损-拉力曲线
        <span class="curve-mode-tag">{{ mode === 'panel' ? '面板拉力' : '锁轮拉力' }}</span>
      </h4>
      <p class="curve-desc">横轴为磨损比例，观察各部分拉力随磨损的衰减快慢</p>
    </div>

    <div v-if="wearSeries.length" class="curve-body">
      <svg
        class="curve-svg"
        :viewBox="`0 0 ${W} ${H}`"
        role="img"
        aria-label="磨损-拉力曲线图"
      >
        <!-- 横向网格线 + Y 轴刻度 -->
        <g v-for="t in yTicks" :key="'yt' + t.ratio">
          <line
            class="grid-line"
            :x1="padL" :y1="yAt(t.ratio)" :x2="padL + innerW" :y2="yAt(t.ratio)"
          />
          <text class="axis-text" :x="padL - 6" :y="yAt(t.ratio) + 4" text-anchor="end">
            {{ t.label }}
          </text>
        </g>

        <!-- X 轴刻度 -->
        <g v-for="t in xTicks" :key="'xt' + t.wear">
          <text
            class="axis-text"
            :x="padL + (t.wear / 100) * innerW"
            :y="padT + innerH + 16"
            text-anchor="middle"
          >{{ t.wear }}%</text>
        </g>

        <!-- 各装备曲线 -->
        <path
          v-for="(s, i) in wearSeries"
          :key="'path' + s.key"
          class="curve-line"
          :d="s.path"
          :stroke="palette[i % palette.length]"
          fill="none"
        />

        <!-- 当前磨损位置指示点 -->
        <circle
          v-for="(s, i) in wearSeries"
          :key="'dot' + s.key"
          class="cursor-dot"
          :cx="xAt(s.wear)"
          :cy="yAt(s.yMax ? 1 : 0)"
          r="3"
          :stroke="palette[i % palette.length]"
        />
        <line
          v-for="(s, i) in wearSeries"
          :key="'cursor' + s.key"
          class="cursor-line"
          :x1="xAt(s.wear)" :y1="padT"
          :x2="xAt(s.wear)" :y2="padT + innerH"
          :stroke="palette[i % palette.length]"
        />
      </svg>

      <div class="curve-legend">
        <div
          v-for="(s, i) in wearSeries"
          :key="'legend' + s.key"
          class="legend-item"
          :title="`${s.name}（磨损 ${s.wear}%）→ ${s.curValue} kN`"
        >
          <span class="legend-dot" :style="{ backgroundColor: palette[i % palette.length] }"></span>
          <span class="legend-name">{{ s.name }}</span>
          <span class="legend-value">{{ s.curValue }} kN</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  calculateActualLockTension,
  calculateActualPanelTension,
  toSafeNumber
} from '../../utils/tension.js'

/** 单件在某磨损下的拉力 */
function tensionAt(item, type, calcRule, friction, mode, wear) {
  if (type === 'line') {
    const maxTension = toSafeNumber(item.maxTension, 0)
    return maxTension * (1 - wear / 100)
  }
  const probe = { ...item, wear }
  if (mode === 'panel') {
    return calculateActualPanelTension(probe, calcRule, friction)
  }
  return calculateActualLockTension(probe, calcRule)
}

function fmtNum(v) {
  const n = Math.round(v * 100) / 100
  return String(n)
}

export default {
  name: 'WearCurveChart',
  props: {
    /** [{ key, name, type: 'rod'|'reel'|'line', item }] */
    candidates: { type: Array, default: () => [] },
    calcRule: { type: String, default: 'guide' },
    friction: { type: Number, default: 0 },
    mode: { type: String, default: 'lock' }
  },
  data() {
    return {
      W: 340,
      H: 190,
      padL: 46,
      padR: 12,
      padT: 14,
      padB: 26
    }
  },
  computed: {
    innerW() { return this.W - this.padL - this.padR },
    innerH() { return this.H - this.padT - this.padB },
    yTicks() {
      return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({ ratio, label: fmtNum(this.yMax * ratio) }))
    },
    xTicks() {
      return [0, 25, 50, 75, 100].map((wear) => ({ wear }))
    },
    palette() {
      return ['#1565c0', '#e65100', '#2e7d32', '#7b1fa2', '#00695c']
    },
    /** 纯数据（不含 path），供 yMax 与 wearSeries 复用，避免循环依赖 */
    seriesData() {
      return this.candidates.map((c) => {
        const pts = []
        for (let wear = 0; wear <= 100; wear += 2) {
          pts.push([wear, tensionAt(c.item, c.type, this.calcRule, this.friction, this.mode, wear)])
        }
        const itemWear = toSafeNumber(c.item && c.item.wear, 0)
        const curValue = tensionAt(c.item, c.type, this.calcRule, this.friction, this.mode, itemWear)
        return {
          key: c.key,
          name: c.name,
          wear: itemWear,
          pts,
          curValue: fmtNum(curValue)
        }
      })
    },
    yMax() {
      let max = 1
      for (const s of this.seriesData) {
        for (const p of s.pts) if (p[1] > max) max = p[1]
      }
      return max * 1.08
    },
    wearSeries() {
      return this.seriesData.map((s) => {
        const path = s.pts
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${this.xAt(p[0]).toFixed(1)},${this.yAt(p[1] / this.yMax).toFixed(1)}`)
          .join(' ')
        return { ...s, path }
      })
    }
  },
  methods: {
    xAt(wear) { return this.padL + (wear / 100) * this.innerW },
    yAt(ratio) { return this.padT + this.innerH - ratio * this.innerH }
  }
}
</script>

<style scoped>
.wear-curve-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.curve-header {
  margin-bottom: 10px;
}

.curve-title {
  font-size: 15px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.curve-mode-tag {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border);
  padding: 1px 8px;
  border-radius: 10px;
}

.curve-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.curve-svg {
  width: 100%;
  height: auto;
  max-height: 210px;
}

.grid-line {
  stroke: var(--color-border);
  stroke-width: 1;
}

.axis-text {
  fill: var(--text-secondary);
  font-size: 10px;
}

.curve-line {
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cursor-line {
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.6;
}

.cursor-dot {
  fill: var(--color-surface);
  stroke-width: 2;
}

.curve-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 6px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-main);
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-value {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
