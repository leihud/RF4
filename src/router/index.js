import { createRouter, createWebHistory } from 'vue-router'
import Calculator from '../components/Calculator.vue'
import { ROUTES } from '../constants/routes.js'

// 对比页/导入页懒加载：把 xlsx 等大依赖从首页主包拆出，降低首屏体积
const routes = [
  {
    path: ROUTES.CALCULATOR,
    name: 'Calculator',
    component: Calculator
  },
  {
    path: ROUTES.COMPARE,
    name: 'Compare',
    component: () => import('../components/ComparePage.vue')
  },
  {
    path: '/builds',
    name: 'BuildsList',
    component: () => import('../components/BuildsListPage.vue')
  },
  {
    path: ROUTES.IMPORT,
    name: 'Import',
    component: () => import('../components/ImportPage.vue')
  },
  {
    path: ROUTES.VALUE,
    name: 'Value',
    component: () => import('../components/ValuePage.vue')
  },
  {
    path: ROUTES.LOCALIZE,
    name: 'Localize',
    component: () => import('../components/LocalizationPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router