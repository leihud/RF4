/**
 * ESLint flat config（ESLint v9+）。
 * 范围：前端源码 src 与测试 tests；
 * functions（Pages Functions 遵循 CF 运行时不强制风格）、
 * scripts / migrations / 构建产物等不参与前端门禁。
 */
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'coverage/**']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['src/**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser
    },
    rules: {
      // 下划线前缀变量视为有意忽略（事件回调等）
      'no-unused-vars': ['error', {
        caughtErrors: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_'
      }],
      // 项目单文件组件位于 src/components 下无独立路径前缀，关闭强制多词命名
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        vi: 'readonly'
      }
    },
    rules: {
      // 测试用例 catch (e) {} 静默忽略为常见意图
      'no-unused-vars': ['error', { caughtErrors: 'none' }]
    }
  }
]
