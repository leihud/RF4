/**
 * 展示层纯函数：价格解析/格式化、适配重合并展示。
 * 从 Calculator.vue 抽离，组件仅负责状态管理与 UI 渲染，保持可测试性。
 */

/** 从 "1,024.5 银币" 这类文本中解析价格数字，对象/无数字兜底 0 */
export function parsePrice(str) {
  if (str == null) return 0
  // 对象直接兜底 0，禁止隐式转字符串报错
  if (typeof str === 'object') return 0
  const cleaned = String(str).replace(/,/g, '')
  const match = cleaned.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

/**
 * 格式化金额显示：
 * 1. 修正浮点精度（通过 Math.round(x * 10^n) / 10^n 去除 62801.520000000004 这类误差
 * 2. 固定小数位（银币默认2位，金币默认2位）
 * 3. 添加千分位逗号
 */
export function formatPrice(val, decimals = 2) {
  if (val == null) return ''
  const num = typeof val === 'number' ? val : parsePrice(val)
  if (!isFinite(num)) return ''
  const factor = Math.pow(10, decimals)
  const fixed = Math.round(num * factor) / factor
  // 固定小数位后再分千位，避免 40999.5 显示成 40,999.5
  const str = fixed.toFixed(decimals)
  const [intPart, decPart] = str.split('.')
  const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart ? `${intWithCommas}.${decPart}` : intWithCommas
}

/**
 * 合并展示适配重：
 *  - 优先级 1：文本型 adaptWeight（范围描述，如 5-25g），竿/轮通用
 *  - 优先级 2：适配重星级/补充 adaptWeightStar（文本/数字，不强制加单位），竿/轮通用
 *  - 优先级 3：数字型 adaptWeightG（克重，自动加 g 单位），竿/轮通用
 *  - 优先级 4：鱼竿 testG / 渔轮 test（兜底）
 * 都为空返回 ''（调用方用 v-if 判断是否展示）
 */
export function getMergedAdaptWeight(equipment, type) {
  if (!equipment) return ''
  // 优先级 1：文本型 adaptWeight（范围描述，如 5-25g），竿/轮通用
  if (equipment.adaptWeight != null && equipment.adaptWeight !== '') {
    return equipment.adaptWeight
  }
  // 优先级 2：适配重星级/补充 adaptWeightStar（文本/数字，原样展示）
  if (equipment.adaptWeightStar != null && equipment.adaptWeightStar !== '' && equipment.adaptWeightStar !== 0) {
    return equipment.adaptWeightStar
  }
  // 优先级 3：数字型 adaptWeightG（克重，自动加 g 单位），竿/轮通用
  if (equipment.adaptWeightG != null && equipment.adaptWeightG !== '' && equipment.adaptWeightG !== 0) {
    return typeof equipment.adaptWeightG === 'number' ? `${equipment.adaptWeightG} g` : equipment.adaptWeightG
  }
  if (type === '鱼竿') {
    // 优先级 4：鱼竿测试克重 testG（兜底）
    if (equipment.testG != null && equipment.testG !== '' && equipment.testG !== 0) {
      return typeof equipment.testG === 'number' ? `${equipment.testG} g` : equipment.testG
    }
  } else if (type === '渔轮') {
    // 优先级 4：渔轮测试文本 test（兜底）
    if (equipment.test != null && equipment.test !== '') {
      return equipment.test
    }
  }
  return ''
}
