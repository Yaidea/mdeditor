/**
 * @file src/shared/composables/useTimerManager.js
 * @description 统一的定时器管理 Composable
 *
 * 提供安全的定时器管理，自动在组件卸载时清理所有待处理的定时器，
 * 防止内存泄漏和组件卸载后的回调执行。
 */

import { ref, onUnmounted } from 'vue'

/**
 * 定时器管理 Composable
 *
 * @example
 * ```js
 * const { schedule, scheduleSequence, cancel, clearAll } = useTimerManager()
 *
 * // 单个定时器
 * const id = schedule(() => console.log('done'), 1000)
 *
 * // 顺序执行多个任务
 * scheduleSequence([
 *   { callback: () => console.log('1'), delay: 100 },
 *   { callback: () => console.log('2'), delay: 100 },
 * ])
 *
 * // 取消定时器
 * cancel(id)
 * ```
 *
 * @returns {Object} 定时器管理方法
 */
export function useTimerManager() {
  // 使用 Map 存储定时器 ID 和清理函数
  const pendingTimers = ref(new Map())

  /**
   * 调度一个定时器
   * @param {Function} callback - 要执行的回调函数
   * @param {number} delay - 延迟时间（毫秒）
   * @param {string|number} [customId] - 可选的自定义 ID，用于后续取消
   * @returns {string|number} 定时器 ID
   */
  const schedule = (callback, delay, customId = null) => {
    const id = customId ?? Date.now() + Math.random()

    const timerId = setTimeout(() => {
      // 执行后从列表中移除
      pendingTimers.value.delete(id)
      callback()
    }, delay)

    pendingTimers.value.set(id, timerId)
    return id
  }

  /**
   * 调度一系列顺序执行的任务
   * 每个任务在前一个任务延迟后开始
   * @param {Array<{callback: Function, delay: number}>} tasks - 任务数组
   * @returns {number} 最终延迟时间
   */
  const scheduleSequence = (tasks) => {
    let totalDelay = 0

    tasks.forEach(({ callback, delay }) => {
      schedule(callback, totalDelay + delay)
      totalDelay += delay
    })

    return totalDelay
  }

  /**
   * 创建一个顺序调度器，方便逐个添加任务
   * @param {number} [baseDelay=0] - 基础延迟
   * @param {number} [stepDelay=100] - 每步之间的延迟
   * @returns {Object} 调度器对象
   */
  const createSequencer = (baseDelay = 0, stepDelay = 100) => {
    let currentDelay = baseDelay

    return {
      /**
       * 添加一个任务到序列
       * @param {Function} callback - 要执行的回调
       * @param {number} [customDelay] - 自定义延迟（可选）
       * @returns {Object} this，用于链式调用
       */
      add(callback, customDelay = stepDelay) {
        schedule(callback, currentDelay)
        currentDelay += customDelay
        return this
      },

      /**
       * 获取当前累计延迟
       * @returns {number} 当前延迟
       */
      get delay() {
        return currentDelay
      },

      /**
       * 设置当前延迟
       * @param {number} delay - 新的延迟值
       * @returns {Object} this
       */
      setDelay(delay) {
        currentDelay = delay
        return this
      }
    }
  }

  /**
   * 取消指定的定时器
   * @param {string|number} id - 定时器 ID
   * @returns {boolean} 是否成功取消
   */
  const cancel = (id) => {
    const timerId = pendingTimers.value.get(id)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      pendingTimers.value.delete(id)
      return true
    }
    return false
  }

  /**
   * 清除所有待处理的定时器
   */
  const clearAll = () => {
    pendingTimers.value.forEach((timerId) => {
      clearTimeout(timerId)
    })
    pendingTimers.value.clear()
  }

  /**
   * 获取当前待处理定时器数量
   * @returns {number} 定时器数量
   */
  const getPendingCount = () => {
    return pendingTimers.value.size
  }

  /**
   * 检查是否有指定 ID 的定时器
   * @param {string|number} id - 定时器 ID
   * @returns {boolean} 是否存在
   */
  const has = (id) => {
    return pendingTimers.value.has(id)
  }

  // 组件卸载时自动清理所有定时器
  onUnmounted(() => {
    clearAll()
  })

  return {
    schedule,
    scheduleSequence,
    createSequencer,
    cancel,
    clearAll,
    getPendingCount,
    has
  }
}

/**
 * 创建一个独立的定时器管理器（非 Composable 版本）
 * 用于非 Vue 组件环境或需要手动管理生命周期的场景
 *
 * @returns {Object} 定时器管理器
 */
export function createTimerManager() {
  const pendingTimers = new Map()

  const schedule = (callback, delay, customId = null) => {
    const id = customId ?? Date.now() + Math.random()

    const timerId = setTimeout(() => {
      pendingTimers.delete(id)
      callback()
    }, delay)

    pendingTimers.set(id, timerId)
    return id
  }

  const cancel = (id) => {
    const timerId = pendingTimers.get(id)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      pendingTimers.delete(id)
      return true
    }
    return false
  }

  const clearAll = () => {
    pendingTimers.forEach((timerId) => clearTimeout(timerId))
    pendingTimers.clear()
  }

  return { schedule, cancel, clearAll }
}
