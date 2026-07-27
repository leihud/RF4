import { createRouter, createWebHistory } from 'vue-router'
import Calculator from '../components/Calculator.vue'
import Compare from '../components/ComparePage.vue'
import ImportPage from '../components/ImportPage.vue'
import { ROUTES } from '../constants/routes.js'

const routes = [
  {
    path: ROUTES.CALCULATOR,
    name: 'Calculator',
    component: Calculator
  },
  {
    path: ROUTES.COMPARE,
    name: 'Compare',
    component: Compare
  },
  {
    path: ROUTES.IMPORT,
    name: 'Import',
    component: ImportPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router