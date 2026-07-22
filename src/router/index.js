import { createRouter, createWebHistory } from 'vue-router'
import Calculator from '../components/Calculator.vue'
import Compare from '../components/ComparePage.vue'
import ImportPage from '../components/ImportPage.vue'

const routes = [
  {
    path: '/',
    name: 'Calculator',
    component: Calculator
  },
  {
    path: '/compare',
    name: 'Compare',
    component: Compare
  },
  {
    path: '/import',
    name: 'Import',
    component: ImportPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router