/**
 * @file src/composables/useClipboard.js
 * @description 剪贴板功能管理 Composable
 *
 * 专门管理剪贴板相关功能，包括：
 * - 复制格式选项管理
 * - 复制操作执行
 * - 主题配置获取
 * - 复制格式选择
 */

import { ref, watch, onUnmounted } from 'vue'
import { copySocialFormat, copyMarkdownFormat, getCopyFormatOptions } from '../core/editor/copy-formats.js'
import { useGlobalThemeManager } from './index.js'
import { i18n } from '../plugins/i18n.js'
import { SafeStorage, TEMP_STORAGE_KEYS } from '../shared/utils/storage.js'

/**
 * 剪贴板功能管理 Composable
 * @param {Object} options - 配置选项
 * @param {Function} options.onNotify - 通知回调函数
 * @param {Function} options.getContent - 获取内容的回调函数
 * @returns {Object} 剪贴板状态和方法
 */
export function useClipboard(options = {}) {
  const { onNotify, getContent } = options

  // 获取主题管理器
  const themeManager = useGlobalThemeManager()

  // 状态
  const copyFormatOptions = ref(getCopyFormatOptions())
  const selectedCopyFormat = ref(copyFormatOptions.value[0]) // 存储选中项对象以保持向后兼容

  /**
   * 获取当前有效的颜色主题（包括临时自定义主题）
   * @returns {Object} 当前有效的主题配置
   */
  const getCurrentEffectiveTheme = () => {
    // 使用 SafeStorage 获取临时自定义主题
    const tempTheme = SafeStorage.getJson(TEMP_STORAGE_KEYS.CUSTOM_THEME, null)
    return tempTheme || themeManager.currentColorTheme.value
  }

  /**
   * 处理复制格式选择
   * @param {Object} format - 选择的复制格式
   */
  const handleCopyFormatSelect = async (format) => {
    try {
      // 获取当前内容
      const content = getContent?.() || ''
      if (!content.trim()) {
        onNotify?.('请先编辑内容', 'warning')
        return
      }

      let result
      const copyOptions = {
        theme: getCurrentEffectiveTheme(), // 使用有效主题
        codeTheme: themeManager.currentCodeStyle.value,
        themeSystem: themeManager.currentThemeSystem.value,
        fontSettings: themeManager.currentFontSettings.value
      }

      // 从可能嵌套的响应式对象中提取格式值
      const resolveFormatValue = (input, depth = 0) => {
        // 防止无限递归
        if (depth > 5 || !input) return null
        if (typeof input === 'string') return input
        if (typeof input === 'object') {
          // 如果 value 是字符串，直接返回
          if (typeof input.value === 'string') return input.value
          // 如果 value 是对象，递归解包
          if (input.value && typeof input.value === 'object') {
            return resolveFormatValue(input.value, depth + 1)
          }
          // 尝试通过 label 匹配
          if (typeof input.label === 'string') {
            const matched = copyFormatOptions.value.find(option => option.label === input.label)
            return matched?.value || null
          }
        }
        return null
      }

      // 如果没有指定格式，默认使用社交格式
      const formatValue = resolveFormatValue(format) || 'social'

      switch (formatValue) {
        case 'social':
          result = await copySocialFormat(content, copyOptions)
          break
        case 'markdown':
          result = await copyMarkdownFormat(content)
          break
        default:
          result = { success: false, message: '未知的复制格式' }
      }

      onNotify?.(result.message, result.success ? 'success' : 'error')
    } catch (error) {
      onNotify?.('❌ 复制失败: ' + error.message, 'error')
    }
  }

  /**
   * 设置选中的复制格式
   * @param {Object} format - 复制格式对象
   */
  const setSelectedCopyFormat = (format) => {
    selectedCopyFormat.value = format
  }

  /**
   * 根据值获取复制格式
   * @param {string} value - 格式值
   * @returns {Object|null} 复制格式对象
   */
  const getCopyFormatByValue = (value) => {
    return copyFormatOptions.value.find(option => option.value === value) || null
  }

  /**
   * 重新加载复制格式选项
   */
  const reloadCopyFormatOptions = () => {
    const prevVal = selectedCopyFormat.value?.value
    copyFormatOptions.value = getCopyFormatOptions()
    // 如果当前选中的格式不在新选项中，重置为第一个
    const matched = copyFormatOptions.value.find(option => option.value === prevVal)
    selectedCopyFormat.value = matched || copyFormatOptions.value[0]
  }

  // 监听语言切换，实时刷新复制菜单
  let stopLocaleWatch = null
  try {
    const loc = i18n?.global?.locale
    const localeRef = typeof loc === 'string' ? null : loc
    if (localeRef && typeof localeRef === 'object' && 'value' in localeRef) {
      stopLocaleWatch = watch(localeRef, () => reloadCopyFormatOptions())
    }
  } catch {}

  // 组件卸载时清理 watch
  onUnmounted(() => {
    if (stopLocaleWatch) {
      stopLocaleWatch()
      stopLocaleWatch = null
    }
  })

  return {
    // 状态
    copyFormatOptions,
    selectedCopyFormat,

    // 方法
    handleCopyFormatSelect,
    setSelectedCopyFormat,
    getCopyFormatByValue,
    reloadCopyFormatOptions,
    getCurrentEffectiveTheme
  }
}
