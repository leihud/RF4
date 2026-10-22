import { createRouter, createWebHistory } from 'vue-router'
import Calculator from '../components/Calculator.vue'
import { ROUTES } from '../constants/routes.js'

// 对比页等懒加载：把大依赖从首页主包拆出，降低首屏体积
const routes = [
  {
    path: ROUTES.CALCULATOR,
    name: 'Calculator',
    component: Calculator
  },
  {
    path: ROUTES.QUERY,
    name: 'DatabaseQuery',
    component: () => import('../components/DatabaseQueryPage.vue')
  },
  {
    path: ROUTES.COMPARE,
    name: 'Compare',
    component: () => import('../components/ComparePage.vue')
  },
  {
    path: ROUTES.VALUE,
    name: 'Value',
    component: () => import('../components/ValuePage.vue')
  },
  {
    // 未匹配路由统一重定向回首页，避免白屏/404 死页
    path: '/:pathMatch(.*)*',
    redirect: ROUTES.CALCULATOR
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 页面标题随路由切换：浏览器历史/收藏可区分页面
const TITLE_MAP = {
  [ROUTES.CALCULATOR]: '装备计算器',
  [ROUTES.QUERY]: '数据查询',
  [ROUTES.COMPARE]: '装备参数对比',
  [ROUTES.VALUE]: '装备价值统计'
}
router.afterEach((to) => {
  document.title = TITLE_MAP[to.path]
    ? `${TITLE_MAP[to.path]} - RF4 装备计算器`
    : 'RF4 装备计算器'
})

export default router