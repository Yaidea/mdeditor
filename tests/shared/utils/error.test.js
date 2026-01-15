/**
 * @file tests/shared/utils/error.test.js
 * @description 错误工具（AppError/ErrorHandler）测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AppError,
  ErrorHandler,
  ERROR_TYPES,
  handleError,
  tryCatch,
  tryCatchAsync,
  handleClipboardError
} from '../../../src/shared/utils/error.js'

describe('AppError', () => {
  it('应设置类型与时间戳', () => {
    const e = new AppError('msg', ERROR_TYPES.NETWORK)
    expect(e.type).toBe(ERROR_TYPES.NETWORK)
    expect(e.timestamp).toBeTruthy()
  })
})

describe('ErrorHandler.wrap/getUserMessage', () => {
  it('wrap 应将原始错误包装为 AppError', () => {
    const err = new Error('boom')
    const wrapped = ErrorHandler.wrap(err, ERROR_TYPES.FILE, 'ctx')
    expect(wrapped).toBeInstanceOf(AppError)
    expect(wrapped.message).toContain('ctx')
    expect(wrapped.type).toBe(ERROR_TYPES.FILE)
  })

  it('getUserMessage: AppError 返回自身消息，非 AppError 返回通用消息', () => {
    const ae = new AppError('x')
    expect(ErrorHandler.getUserMessage(ae)).toBe('x')
    expect(ErrorHandler.getUserMessage(new Error('y')).length).toBeGreaterThan(0)
  })
})

describe('ErrorHandler.handleClipboardError/handleNetworkError', () => {
  it('handleClipboardError: 超时/权限', () => {
    const timeout = new Error('timeout')
    const e1 = ErrorHandler.handleClipboardError(timeout, 10)
    expect(e1.message).toContain('超时')

    const perm = new Error('Permission denied')
    const e2 = ErrorHandler.handleClipboardError(perm)
    expect(e2.message).not.toContain('超时')
  })

  it('handleNetworkError: 根据状态码与超时组装消息', () => {
    const eTimeout = ErrorHandler.handleNetworkError(new Error('timeout'), '/api')
    expect(eTimeout.message).toContain('超时')

    const e404 = ErrorHandler.handleNetworkError(new Error('x'), '/404', 404)
    expect(e404.message).toContain('未找到')

    const e500 = ErrorHandler.handleNetworkError({ message: 'x', status: 500 }, '/500')
    expect(e500.message).toContain('服务器错误')
  })
})

describe('ErrorHandler.retry/safeExecute', () => {
  it('retry 成功与失败路径', async () => {
    let count = 0
    const ok = await ErrorHandler.retry(async () => {
      if (count++ < 1) throw new Error('boom')
      return 'done'
    }, { maxAttempts: 2, delay: 0 })
    expect(ok).toBe('done')

    await expect(ErrorHandler.retry(async () => { throw new Error('boom') }, { maxAttempts: 2, delay: 0 }))
      .rejects.toBeInstanceOf(AppError)
  })

  it('safeExecute 应将异常包装并重新抛出', async () => {
    await expect(ErrorHandler.safeExecute(async () => { throw new Error('bad') }, 'ctx'))
      .rejects.toBeInstanceOf(AppError)
  })
})

describe('ErrorHandler.log', () => {
  it('应以 error 级别记录日志', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new AppError('test error', ERROR_TYPES.GENERIC)
    ErrorHandler.log(error)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('应以 warn 级别记录日志', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = new AppError('test warning', ERROR_TYPES.GENERIC)
    ErrorHandler.log(error, 'warn')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('应处理没有 timestamp 的错误', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ErrorHandler.log({ message: 'plain error' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('handleError', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('应返回 fallback 值', () => {
    const result = handleError(new Error('test'), 'context', { fallback: 'default' })
    expect(result).toBe('default')
  })

  it('silent 为 true 时不应输出日志', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    handleError(new Error('test'), 'context', { silent: true })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('rethrow 为 true 时应重新抛出错误', () => {
    expect(() => handleError(new Error('test'), 'context', { rethrow: true }))
      .toThrow(AppError)
  })

  it('rethrow 为 true 且错误已是 AppError 时应直接抛出', () => {
    const originalError = new AppError('original', ERROR_TYPES.FILE)
    expect(() => handleError(originalError, 'context', { rethrow: true }))
      .toThrow(originalError)
  })
})

describe('tryCatch', () => {
  it('函数成功时应返回结果', () => {
    const result = tryCatch(() => 'success', 'context')
    expect(result).toBe('success')
  })

  it('函数失败时应返回 fallback', () => {
    const result = tryCatch(() => { throw new Error('fail') }, 'context', 'fallback')
    expect(result).toBe('fallback')
  })

  it('应处理返回 Promise 的函数', async () => {
    const result = await tryCatch(() => Promise.resolve('async success'), 'context')
    expect(result).toBe('async success')
  })

  it('Promise 拒绝时应返回 fallback', async () => {
    const result = await tryCatch(() => Promise.reject(new Error('fail')), 'context', 'fallback')
    expect(result).toBe('fallback')
  })
})

describe('tryCatchAsync', () => {
  it('异步函数成功时应返回结果', async () => {
    const result = await tryCatchAsync(async () => 'async success', 'context')
    expect(result).toBe('async success')
  })

  it('异步函数失败时应返回 fallback', async () => {
    const result = await tryCatchAsync(async () => { throw new Error('fail') }, 'context', 'fallback')
    expect(result).toBe('fallback')
  })
})

describe('handleClipboardError 导出', () => {
  it('应作为便捷函数导出', () => {
    expect(handleClipboardError).toBe(ErrorHandler.handleClipboardError)
  })
})

describe('AppError 构造函数', () => {
  it('应保存原始错误', () => {
    const original = new Error('original')
    const appError = new AppError('wrapped', ERROR_TYPES.GENERIC, original)
    expect(appError.originalError).toBe(original)
  })

  it('应使用默认类型', () => {
    const appError = new AppError('message')
    expect(appError.type).toBe(ERROR_TYPES.GENERIC)
  })
})

describe('ErrorHandler.wrap', () => {
  it('应处理非 Error 类型的输入', () => {
    const wrapped = ErrorHandler.wrap('string error', ERROR_TYPES.GENERIC)
    expect(wrapped.message).toBe('string error')
    expect(wrapped.originalError).toBeNull()
  })
})

describe('ErrorHandler.handleNetworkError 更多场景', () => {
  it('应处理 400-499 状态码', () => {
    const error = ErrorHandler.handleNetworkError(new Error('bad request'), '/api', 400)
    expect(error.type).toBe(ERROR_TYPES.NETWORK)
  })

  it('无 URL 时超时消息应使用通用文案', () => {
    const error = ErrorHandler.handleNetworkError(new Error('timeout'), '')
    expect(error.message).toContain('超时')
  })

  it('无 URL 时 404 应使用通用文案', () => {
    const error = ErrorHandler.handleNetworkError(new Error('not found'), '', 404)
    expect(error.message).not.toContain('/api')
  })
})

describe('ErrorHandler.handleClipboardError 更多场景', () => {
  it('应处理 NotAllowedError', () => {
    const error = { name: 'NotAllowedError', message: 'clipboard blocked' }
    const result = ErrorHandler.handleClipboardError(error)
    expect(result.type).toBe(ERROR_TYPES.CLIPBOARD)
  })
})

describe('ERROR_TYPES', () => {
  it('应包含所有错误类型', () => {
    expect(ERROR_TYPES.VALIDATION).toBe('validation')
    expect(ERROR_TYPES.NETWORK).toBe('network')
    expect(ERROR_TYPES.CLIPBOARD).toBe('clipboard')
    expect(ERROR_TYPES.FILE).toBe('file')
    expect(ERROR_TYPES.THEME).toBe('theme')
    expect(ERROR_TYPES.GENERIC).toBe('generic')
  })
})

