/**
 * @file tests/shared/utils/storage.test.js
 * @description SafeStorage 工具类测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SafeStorage,
  TEMP_STORAGE_KEYS
} from '@/shared/utils/storage.js'

describe('SafeStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('get/set 原始字符串', () => {
    it('应能存取字符串', () => {
      SafeStorage.set('test-key', 'test-value')
      expect(SafeStorage.get('test-key')).toBe('test-value')
    })

    it('不存在的键应返回默认值', () => {
      expect(SafeStorage.get('nonexistent', 'default')).toBe('default')
    })

    it('localStorage 异常时 get 应返回默认值', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied')
      })
      expect(SafeStorage.get('test-key', 'fallback')).toBe('fallback')
    })

    it('localStorage 异常时 set 应返回 false', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })
      expect(SafeStorage.set('test-key', 'value')).toBe(false)
    })
  })

  describe('getJson/setJson', () => {
    it('应能存取 JSON 对象', () => {
      const obj = { name: 'test', count: 42 }
      SafeStorage.setJson('json-key', obj)
      expect(SafeStorage.getJson('json-key')).toEqual(obj)
    })

    it('应能存取数组', () => {
      const arr = [1, 2, 3]
      SafeStorage.setJson('arr-key', arr)
      expect(SafeStorage.getJson('arr-key')).toEqual(arr)
    })

    it('不存在的键应返回默认值', () => {
      expect(SafeStorage.getJson('nonexistent', { default: true })).toEqual({ default: true })
    })

    it('JSON 解析失败应返回默认值', () => {
      localStorage.setItem('invalid-json', 'not valid json')
      expect(SafeStorage.getJson('invalid-json', null)).toBe(null)
    })
  })

  describe('remove/removeAll', () => {
    it('remove 应删除键', () => {
      SafeStorage.set('key1', 'value1')
      expect(SafeStorage.has('key1')).toBe(true)
      SafeStorage.remove('key1')
      expect(SafeStorage.has('key1')).toBe(false)
    })

    it('removeAll 应批量删除', () => {
      SafeStorage.set('key1', 'v1')
      SafeStorage.set('key2', 'v2')
      SafeStorage.removeAll(['key1', 'key2'])
      expect(SafeStorage.has('key1')).toBe(false)
      expect(SafeStorage.has('key2')).toBe(false)
    })
  })

  describe('getNumber/getInt', () => {
    it('getNumber 应返回浮点数', () => {
      SafeStorage.set('num', '3.14')
      expect(SafeStorage.getNumber('num')).toBe(3.14)
    })

    it('getInt 应返回整数', () => {
      SafeStorage.set('int', '42')
      expect(SafeStorage.getInt('int')).toBe(42)
    })

    it('非数字应返回默认值', () => {
      SafeStorage.set('nan', 'not a number')
      expect(SafeStorage.getNumber('nan', 0)).toBe(0)
      expect(SafeStorage.getInt('nan', 0)).toBe(0)
    })
  })

  describe('has', () => {
    it('存在的键返回 true', () => {
      SafeStorage.set('exists', 'yes')
      expect(SafeStorage.has('exists')).toBe(true)
    })

    it('不存在的键返回 false', () => {
      expect(SafeStorage.has('not-exists')).toBe(false)
    })
  })

  describe('类方法调用', () => {
    it('类方法应正常工作', () => {
      SafeStorage.set('quick-test', 'value')
      expect(SafeStorage.get('quick-test')).toBe('value')

      SafeStorage.setJson('quick-json', { a: 1 })
      expect(SafeStorage.getJson('quick-json')).toEqual({ a: 1 })

      SafeStorage.remove('quick-test')
      expect(SafeStorage.get('quick-test', 'default')).toBe('default')
    })
  })

  describe('TEMP_STORAGE_KEYS 常量', () => {
    it('应包含自定义颜色相关键', () => {
      expect(TEMP_STORAGE_KEYS.CUSTOM_COLOR).toBe('temp-custom-color')
      expect(TEMP_STORAGE_KEYS.CUSTOM_THEME).toBe('temp-custom-theme')
    })
  })
})
