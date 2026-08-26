/**
 * 全局路由路径常量：
 *  1) 供 vue-router 的 routes 配置直接引用
 *  2) 供组件内 $router.push(ROUTES.XXX) 统一使用
 * 避免路径字符串散落在各处、改动路径时漏改导致跳转 404
 */
export const ROUTES = Object.freeze({
  /** 装备计算器首页 */
  CALCULATOR: '/',
  /** 装备参数对比 */
  COMPARE: '/compare',
  /** Excel/csv 装备数据导入 */
  IMPORT: '/import',
  /** 装备价值统计 */
  VALUE: '/value'
})
