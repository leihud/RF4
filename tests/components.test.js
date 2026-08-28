// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppToast from '../src/components/common/AppToast.vue'
import EquipmentSummary from '../src/components/calculator/EquipmentSummary.vue'
import ComparePage from '../src/components/ComparePage.vue'
import Calculator from '../src/components/Calculator.vue'
import BuildsListPage from '../src/components/BuildsListPage.vue'
import ValuePage from '../src/components/ValuePage.vue'
import ImportPage from '../src/components/ImportPage.vue'
import AppHeader from '../src/components/common/AppHeader.vue'

describe('AppToast 共享提示组件', () => {
  it('show() 后显示消息与类型样式', async () => {
    const wrapper = mount(AppToast)
    wrapper.vm.show('保存成功', 'success')
    await nextTick()
    expect(wrapper.vm.visible).toBe(true)
    expect(wrapper.text()).toContain('保存成功')
    expect(wrapper.find('.toast-success').exists()).toBe(true)
  })

  it('重复 show() 只显示最新一条消息', async () => {
    const wrapper = mount(AppToast)
    wrapper.vm.show('第一条')
    wrapper.vm.show('第二条')
    await nextTick()
    expect(wrapper.text()).toContain('第二条')
    expect(wrapper.text()).not.toContain('第一条')
  })

  it('3 秒后自动隐藏', async () => {
    const wrapper = mount(AppToast)
    wrapper.vm.show('自动消失测试')
    expect(wrapper.vm.visible).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 3200))
    expect(wrapper.vm.visible).toBe(false)
  })
})

describe('EquipmentSummary 装备组合总览', () => {
  const baseProps = {
    selectedEquipmentList: [
      { equipmentType: '鱼竿', model: '测试竿A', silverPrice: '1,000', goldPrice: '', panelTension: 30, lockTension: 25, category: '海竿' },
      { equipmentType: '渔轮', model: '测试轮B', silverPrice: '2,000', goldPrice: '10', lockTension: 40, frictionForce: 20, category: '纺车式' }
    ],
    customEquipment: {
      '主线': { maxTension: 0, wear: 0, material: '', diameter: 0, length: 0 },
      '引线': { maxTension: 0, wear: 0, material: '', diameter: 0, length: 0 }
    },
    actualLockTensionMap: {},
    actualPanelTensionMap: {}
  }

  it('渲染五行结构的关键标签', () => {
    const wrapper = mount(EquipmentSummary, { props: baseProps })
    const text = wrapper.text()
    expect(text).toContain('装备组合')
    expect(text).toContain('总价格')
    expect(text).toContain('鱼竿适配重')
    expect(text).toContain('渔轮适配重')
    expect(text).toContain('鱼竿价格')
    expect(text).toContain('渔轮价格')
  })

  it('装备组合文本包含已选装备型号', () => {
    const wrapper = mount(EquipmentSummary, { props: baseProps })
    expect(wrapper.text()).toContain('测试竿A')
    expect(wrapper.text()).toContain('测试轮B')
  })

  it('总价格为银价求和（含千分位价格解析）', () => {
    const wrapper = mount(EquipmentSummary, { props: baseProps })
    // 1000 + 2000 = 3000
    expect(wrapper.vm.totalSilverPrice).toBe(3000)
    expect(wrapper.vm.totalGoldPrice).toBe(10)
  })

  it('主线录入拉力后展示最小拉力行', () => {
    const props = {
      ...baseProps,
      customEquipment: {
        ...baseProps.customEquipment,
        '主线': { maxTension: 12.5, wear: 0, material: '氟碳线', diameter: 0.35, length: 150 }
      },
      actualLockTensionMap: { '鱼竿': 25, '渔轮': 40 },
      actualPanelTensionMap: { '鱼竿': 30, '渔轮': 20 }
    }
    const wrapper = mount(EquipmentSummary, { props })
    const text = wrapper.text()
    expect(text).toContain('锁轮下最小拉力')
    expect(text).toContain('常规下最小拉力')
    // 主线 12.5kN 应为锁轮下最小值
    expect(text).toContain('12.50')
  })
})

describe('ComparePage 参数对比', () => {
  it('选择装备加入对比全流程渲染正常（回归：曾出现 parsePrice 未导入）', async () => {
    const rods = [
      { id: 1, model: '测试竿A', category: '海竿', form: '海竿', strengthKg: '30', panelTension: 30, silverPrice: '1,000', rating: '' },
      { id: 2, model: '测试竿B', category: '海竿', form: '海竿', strengthKg: '25', panelTension: 25, silverPrice: '800', rating: '' }
    ]
    global.fetch = async (url) => ({
      ok: true,
      json: async () => {
        if (String(url).includes('/api/rods')) return rods
        if (String(url).includes('/api/reels')) return []
        return []
      }
    })

    const wrapper = mount(ComparePage)
    await flushPromises()
    await nextTick()

    // 点击第一个装备加入对比，不应抛异常（如 parsePrice is not defined）
    const items = wrapper.findAll('.equipment-item')
    expect(items.length).toBeGreaterThan(0)
    await items[0].trigger('click')
    await nextTick()

    expect(wrapper.vm.compareEquipmentList.length).toBe(1)
    expect(wrapper.find('.compare-table').exists()).toBe(true)
    expect(wrapper.text()).toContain('测试竿A')

    // 再加一件触发差异行/差值渲染路径
    await items[1].trigger('click')
    await nextTick()
    expect(wrapper.vm.compareEquipmentList.length).toBe(2)
    expect(wrapper.text()).toContain('强度')
  })
})

describe('各页面挂载冒烟测试（暴露未定义引用/模板错误）', () => {
  const rod = { id: 1, model: '测试竿A', equipmentName: '测试竿A', category: '海竿', form: '海竿', strengthKg: '30', panelTension: 30, lockTension: 25, silverPrice: '1,000', goldPrice: '', rating: '', adaptWeight: '15-50' }
  const reel = { id: 2, model: '测试轮B', equipmentName: '测试轮B', category: '纺车式', form: '纺车式', lockTension: '40', frictionForce: '20', panelTension: 20, silverPrice: '2,000', goldPrice: '10', rating: '' }

  const setupFetch = () => {
    global.fetch = async (url) => {
      const u = String(url)
      let body = []
      if (u.includes('/api/recommended_builds')) body = { success: true, data: [], hasMore: false }
      else if (u.includes('/api/meta')) body = { success: true, data: {} }
      else if (u.includes('/api/maps')) body = [{ name: 'm1', display_name: '测试地图' }]
      else if (u.includes('/api/fish_species')) body = [{ name: 'f1', display_name: '测试鱼种' }]
      else if (u.includes('/api/rods')) body = [rod]
      else if (u.includes('/api/reels')) body = [reel]
      return { ok: true, json: async () => body }
    }
  }

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setupFetch()
  })

  it('Calculator 挂载渲染无异常', async () => {
    const wrapper = mount(Calculator)
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.equipment-selector').exists()).toBe(true)
    wrapper.unmount()
  })

  it('BuildsListPage 挂载渲染无异常', async () => {
    const wrapper = mount(BuildsListPage)
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.builds-list-page').exists()).toBe(true)
    wrapper.unmount()
  })

  it('ValuePage 挂载渲染无异常', async () => {
    const wrapper = mount(ValuePage)
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.value-page').exists()).toBe(true)
    wrapper.unmount()
  })

  it('ImportPage 挂载渲染无异常', async () => {
    const wrapper = mount(ImportPage)
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.import-page').exists()).toBe(true)
    wrapper.unmount()
  })

  it('AppHeader 挂载渲染无异常', () => {
    const wrapper = mount(AppHeader)
    expect(wrapper.find('.app-header').exists()).toBe(true)
    wrapper.unmount()
  })
})
