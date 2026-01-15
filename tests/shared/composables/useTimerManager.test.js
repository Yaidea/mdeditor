/**
 * @file tests/shared/composables/useTimerManager.test.js
 * @description useTimerManager composable 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimerManager, createTimerManager } from '@/shared/composables/useTimerManager.js'

// Mock Vue's onUnmounted
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onUnmounted: vi.fn((fn) => {
      // Store cleanup function for testing
      globalThis.__cleanupFn = fn
    })
  }
})

describe('useTimerManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    globalThis.__cleanupFn = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('schedule', () => {
    it('应在指定延迟后执行回调', () => {
      const { schedule } = useTimerManager()
      const callback = vi.fn()

      schedule(callback, 1000)
      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('应返回定时器 ID', () => {
      const { schedule } = useTimerManager()
      const id = schedule(() => {}, 1000)
      expect(id).toBeDefined()
    })

    it('应支持自定义 ID', () => {
      const { schedule, has } = useTimerManager()
      schedule(() => {}, 1000, 'my-custom-id')
      expect(has('my-custom-id')).toBe(true)
    })
  })

  describe('cancel', () => {
    it('应能取消定时器', () => {
      const { schedule, cancel } = useTimerManager()
      const callback = vi.fn()

      const id = schedule(callback, 1000)
      cancel(id)

      vi.advanceTimersByTime(1000)
      expect(callback).not.toHaveBeenCalled()
    })

    it('取消成功应返回 true', () => {
      const { schedule, cancel } = useTimerManager()
      const id = schedule(() => {}, 1000)
      expect(cancel(id)).toBe(true)
    })

    it('取消不存在的定时器应返回 false', () => {
      const { cancel } = useTimerManager()
      expect(cancel('nonexistent')).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('应清除所有定时器', () => {
      const { schedule, clearAll, getPendingCount } = useTimerManager()
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      schedule(callback1, 1000)
      schedule(callback2, 2000)
      expect(getPendingCount()).toBe(2)

      clearAll()
      expect(getPendingCount()).toBe(0)

      vi.advanceTimersByTime(2000)
      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })
  })

  describe('scheduleSequence', () => {
    it('应按序执行多个任务', () => {
      const { scheduleSequence } = useTimerManager()
      const results = []

      scheduleSequence([
        { callback: () => results.push(1), delay: 100 },
        { callback: () => results.push(2), delay: 100 },
        { callback: () => results.push(3), delay: 100 }
      ])

      vi.advanceTimersByTime(100)
      expect(results).toEqual([1])

      vi.advanceTimersByTime(100)
      expect(results).toEqual([1, 2])

      vi.advanceTimersByTime(100)
      expect(results).toEqual([1, 2, 3])
    })

    it('应返回总延迟时间', () => {
      const { scheduleSequence } = useTimerManager()
      const totalDelay = scheduleSequence([
        { callback: () => {}, delay: 100 },
        { callback: () => {}, delay: 200 },
        { callback: () => {}, delay: 150 }
      ])
      expect(totalDelay).toBe(450)
    })
  })

  describe('createSequencer', () => {
    it('应支持链式添加任务', () => {
      const { createSequencer } = useTimerManager()
      const results = []

      // 第一个任务在 delay=0 时立即执行，后续任务依次延迟
      createSequencer(0, 100)
        .add(() => results.push(1))
        .add(() => results.push(2))
        .add(() => results.push(3))

      // delay=0 的任务在第一次 advanceTimersByTime 就会执行
      // 第一个任务 delay=0，第二个任务 delay=100，第三个任务 delay=200
      vi.advanceTimersByTime(0)
      expect(results).toEqual([1])

      vi.advanceTimersByTime(100)
      expect(results).toEqual([1, 2])

      vi.advanceTimersByTime(100)
      expect(results).toEqual([1, 2, 3])
    })

    it('应能获取和设置当前延迟', () => {
      const { createSequencer } = useTimerManager()
      const seq = createSequencer(100, 50)

      expect(seq.delay).toBe(100)

      seq.add(() => {})
      expect(seq.delay).toBe(150)

      seq.setDelay(500)
      expect(seq.delay).toBe(500)
    })
  })

  describe('getPendingCount/has', () => {
    it('应正确报告待处理定时器数量', () => {
      const { schedule, getPendingCount, has } = useTimerManager()

      expect(getPendingCount()).toBe(0)

      const id1 = schedule(() => {}, 1000)
      const id2 = schedule(() => {}, 2000)

      expect(getPendingCount()).toBe(2)
      expect(has(id1)).toBe(true)
      expect(has(id2)).toBe(true)

      vi.advanceTimersByTime(1000)
      expect(getPendingCount()).toBe(1)
      expect(has(id1)).toBe(false)
      expect(has(id2)).toBe(true)
    })
  })

  describe('组件卸载清理', () => {
    it('onUnmounted 应被调用以清理定时器', () => {
      const { schedule } = useTimerManager()
      const callback = vi.fn()

      schedule(callback, 1000)

      // 模拟组件卸载
      expect(globalThis.__cleanupFn).toBeInstanceOf(Function)
      globalThis.__cleanupFn()

      vi.advanceTimersByTime(1000)
      expect(callback).not.toHaveBeenCalled()
    })
  })
})

describe('createTimerManager (非 Composable 版本)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应能调度和取消定时器', () => {
    const manager = createTimerManager()
    const callback = vi.fn()

    const id = manager.schedule(callback, 1000)
    manager.cancel(id)

    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()
  })

  it('clearAll 应清除所有定时器', () => {
    const manager = createTimerManager()
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    manager.schedule(callback1, 1000)
    manager.schedule(callback2, 2000)
    manager.clearAll()

    vi.advanceTimersByTime(2000)
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).not.toHaveBeenCalled()
  })
})
