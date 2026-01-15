/**
 * @file src/composables/settings/useColorSettings.js
 * @description 颜色设置相关逻辑
 *
 * 提供自定义颜色相关的状态管理和方法：
 * - 颜色调整工具函数
 * - 颜色选择器控制
 * - 自定义颜色应用
 */

import { ref, computed } from 'vue'
import { SafeStorage, TEMP_STORAGE_KEYS } from '../../shared/utils/storage.js'
import { ColorUtils } from '../../shared/utils/color.js'

/**
 * 颜色设置 Composable
 * @param {Object} themeManager - 主题管理器实例
 * @param {Function} emit - Vue emit 函数
 * @returns {Object} 颜色相关状态和方法
 */
export function useColorSettings(themeManager, emit) {
  // 状态
  const showColorPicker = ref(false)
  const selectedCustomColor = ref('#3b82f6')
  const currentCustomColor = ref('#3b82f6')
  const isUsingCustomColor = ref(false)
  const currentCustomTheme = ref(null)

  // 计算属性
  const isCustomColorActive = computed(() => isUsingCustomColor.value)

  /**
   * 调整颜色亮度（使用 ColorUtils）
   * @param {string} color - 十六进制颜色值
   * @param {number} factor - 亮度因子 (0-2)
   * @returns {string} 调整后的颜色
   */
  const adjustColorBrightness = (color, factor) => ColorUtils.adjustBrightness(color, factor)

  /**
   * 切换颜色选择器显示状态
   */
  const toggleColorPicker = () => {
    if (!showColorPicker.value) {
      // 打开颜色选择器时，如果当前有自定义颜色，则设置为选中的颜色
      if (isUsingCustomColor.value && currentCustomColor.value) {
        selectedCustomColor.value = currentCustomColor.value
      }
    }
    showColorPicker.value = !showColorPicker.value
  }

  /**
   * 关闭颜色选择器
   */
  const closeColorPicker = () => {
    showColorPicker.value = false
  }

  /**
   * 颜色变化回调
   * @param {string} color - 新颜色值
   */
  const onColorChange = (color) => {
    selectedCustomColor.value = color
  }

  /**
   * 确认自定义颜色
   * @param {string} color - 确认的颜色值
   * @param {Function} clearThemeSelection - 清除主题选择的回调
   */
  const onColorConfirm = async (color, clearThemeSelection) => {
    try {
      // 导入颜色生成器来创建临时主题
      const { ColorThemeGenerator } = await import('../../core/theme/index.js')
      const tempTheme = ColorThemeGenerator.generateThemeColors(color)

      // 创建完整的主题对象
      const customTheme = {
        id: 'temp-custom',
        name: '自定义颜色',
        description: '临时自定义颜色',
        ...tempTheme
      }

      // 设置状态
      currentCustomColor.value = color
      currentCustomTheme.value = customTheme // 保存自定义主题引用
      isUsingCustomColor.value = true
      showColorPicker.value = false

      // 清除选中的内置主题
      if (clearThemeSelection) {
        clearThemeSelection()
      }

      // 保存到localStorage以便刷新后恢复（使用 SafeStorage）
      SafeStorage.set(TEMP_STORAGE_KEYS.CUSTOM_COLOR, color)
      SafeStorage.setJson(TEMP_STORAGE_KEYS.CUSTOM_THEME, customTheme)

      // 设置临时主题标记
      if (themeManager.themeState) {
        themeManager.themeState.hasTemporaryCustomTheme = true
      }

      // 立即应用自定义主题
      themeManager.cssManager.forceApplyColorTheme(customTheme)

      // 触发自定义主题变化事件，通知其他组件
      window.dispatchEvent(new CustomEvent('custom-theme-changed', {
        detail: { theme: customTheme, color }
      }))

    } catch (error) {
      console.error('Failed to apply custom color:', error)
      emit('show-notification', '应用自定义颜色失败，请重试', 'error')
    }
  }

  /**
   * 重置颜色状态
   * @param {string} currentColorThemeId - 当前颜色主题ID
   * @returns {Object} 初始状态值
   */
  const resetColorState = (currentColorThemeId) => {
    showColorPicker.value = false

    let initialCustomColor = '#3b82f6'
    let initialIsUsingCustomColor = false
    let selectedThemeId = currentColorThemeId

    // 检查是否有临时自定义主题（使用 SafeStorage）
    const tempTheme = SafeStorage.getJson(TEMP_STORAGE_KEYS.CUSTOM_THEME, null)
    const tempColor = SafeStorage.get(TEMP_STORAGE_KEYS.CUSTOM_COLOR, '')

    if (tempTheme && tempColor) {
      // 有自定义主题，设置自定义状态
      currentCustomTheme.value = tempTheme
      currentCustomColor.value = tempColor
      selectedCustomColor.value = tempColor // 同步选中的自定义颜色
      isUsingCustomColor.value = true
      selectedThemeId = null // 清除内置主题选择
      // 记录初始自定义颜色状态
      initialCustomColor = tempColor
      initialIsUsingCustomColor = true
    } else {
      // 没有自定义主题，使用内置主题
      isUsingCustomColor.value = false
      currentCustomTheme.value = null
      // 记录初始状态
      initialIsUsingCustomColor = false
    }

    return {
      initialCustomColor,
      initialIsUsingCustomColor,
      selectedThemeId
    }
  }

  /**
   * 清除自定义颜色状态
   */
  const clearCustomColor = () => {
    isUsingCustomColor.value = false
    currentCustomTheme.value = null

    // 清除临时自定义颜色和标记（使用 SafeStorage）
    SafeStorage.removeAll([TEMP_STORAGE_KEYS.CUSTOM_COLOR, TEMP_STORAGE_KEYS.CUSTOM_THEME])

    // 清除临时主题标记
    if (themeManager.themeState) {
      themeManager.themeState.hasTemporaryCustomTheme = false
    }
  }

  /**
   * 重新应用自定义主题
   */
  const reapplyCustomTheme = () => {
    if (isUsingCustomColor.value && currentCustomTheme.value) {
      // 重新设置临时主题标记
      if (themeManager.themeState) {
        themeManager.themeState.hasTemporaryCustomTheme = true
      }

      // 重新应用自定义主题（只应用颜色，不触发额外事件）
      themeManager.cssManager.forceApplyColorTheme(currentCustomTheme.value)

      // 触发自定义主题变化事件，通知PreviewPane等组件更新
      window.dispatchEvent(new CustomEvent('custom-theme-changed', {
        detail: { theme: currentCustomTheme.value, color: currentCustomColor.value }
      }))
    }
  }

  return {
    // 状态
    showColorPicker,
    selectedCustomColor,
    currentCustomColor,
    isUsingCustomColor,
    currentCustomTheme,

    // 计算属性
    isCustomColorActive,

    // 方法
    adjustColorBrightness,
    toggleColorPicker,
    closeColorPicker,
    onColorChange,
    onColorConfirm,
    resetColorState,
    clearCustomColor,
    reapplyCustomTheme
  }
}
