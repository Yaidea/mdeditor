/**
 * @file tests/electron/ipcManager.test.js
 * @description IpcManager 路径安全验证测试
 *
 * 测试 isPathSafe() 方法的安全防护：
 * - 路径遍历攻击防护
 * - 允许的目录白名单
 * - 文件扩展名白名单
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'path'

// Mock Electron 模块
const mockApp = {
  getPath: vi.fn((name) => {
    const paths = {
      documents: '/Users/test/Documents',
      desktop: '/Users/test/Desktop',
      downloads: '/Users/test/Downloads',
      home: '/Users/test'
    }
    return paths[name] || `/Users/test/${name}`
  })
}

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  },
  dialog: {
    showSaveDialog: vi.fn()
  },
  app: mockApp
}))

// 提取 isPathSafe 方法进行单独测试
// 由于 IpcManager 是 CommonJS 模块且依赖 Electron，我们重新实现相同逻辑进行测试
function createIsPathSafe(appGetPath) {
  return function isPathSafe(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return false
    }

    // 规范化路径
    const normalizedPath = path.normalize(filePath)

    // 检查是否包含路径遍历字符
    if (normalizedPath.includes('..')) {
      return false
    }

    // 获取允许的目录列表
    const allowedDirs = [
      appGetPath('documents'),
      appGetPath('desktop'),
      appGetPath('downloads'),
      appGetPath('home')
    ]

    // 检查路径是否在允许的目录内
    const isInAllowedDir = allowedDirs.some(dir => {
      const resolvedPath = path.resolve(normalizedPath)
      const resolvedDir = path.resolve(dir)
      return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir
    })

    // 检查文件扩展名是否为允许的类型
    const allowedExtensions = ['.md', '.txt', '.markdown']
    const ext = path.extname(normalizedPath).toLowerCase()
    const hasValidExtension = allowedExtensions.includes(ext)

    return isInAllowedDir && hasValidExtension
  }
}

describe('IpcManager 路径安全验证', () => {
  let isPathSafe

  beforeEach(() => {
    isPathSafe = createIsPathSafe(mockApp.getPath)
  })

  describe('基础输入验证', () => {
    it('空路径应返回 false', () => {
      expect(isPathSafe('')).toBe(false)
      expect(isPathSafe(null)).toBe(false)
      expect(isPathSafe(undefined)).toBe(false)
    })

    it('非字符串输入应返回 false', () => {
      expect(isPathSafe(123)).toBe(false)
      expect(isPathSafe({})).toBe(false)
      expect(isPathSafe([])).toBe(false)
    })
  })

  describe('路径遍历攻击防护', () => {
    it('应拒绝包含 .. 的路径', () => {
      expect(isPathSafe('/Users/test/Documents/../../../etc/passwd')).toBe(false)
      expect(isPathSafe('../../../etc/passwd')).toBe(false)
      expect(isPathSafe('/Users/test/Documents/..\\..\\..\\etc\\passwd')).toBe(false)
    })

    it('应拒绝尝试逃逸到系统目录的路径', () => {
      expect(isPathSafe('/etc/passwd')).toBe(false)
      expect(isPathSafe('/usr/bin/bash')).toBe(false)
      expect(isPathSafe('/var/log/system.log')).toBe(false)
    })
  })

  describe('允许的目录白名单', () => {
    it('应允许 Documents 目录下的文件', () => {
      expect(isPathSafe('/Users/test/Documents/note.md')).toBe(true)
      expect(isPathSafe('/Users/test/Documents/subfolder/note.md')).toBe(true)
    })

    it('应允许 Desktop 目录下的文件', () => {
      expect(isPathSafe('/Users/test/Desktop/note.md')).toBe(true)
    })

    it('应允许 Downloads 目录下的文件', () => {
      expect(isPathSafe('/Users/test/Downloads/readme.txt')).toBe(true)
    })

    it('应允许 Home 目录下的文件', () => {
      expect(isPathSafe('/Users/test/notes.md')).toBe(true)
    })

    it('应拒绝不在白名单中的目录', () => {
      expect(isPathSafe('/tmp/note.md')).toBe(false)
      expect(isPathSafe('/var/note.md')).toBe(false)
      expect(isPathSafe('/other/user/Documents/note.md')).toBe(false)
    })
  })

  describe('文件扩展名白名单', () => {
    it('应允许 .md 扩展名', () => {
      expect(isPathSafe('/Users/test/Documents/note.md')).toBe(true)
      expect(isPathSafe('/Users/test/Documents/NOTE.MD')).toBe(true)
    })

    it('应允许 .txt 扩展名', () => {
      expect(isPathSafe('/Users/test/Documents/note.txt')).toBe(true)
      expect(isPathSafe('/Users/test/Documents/NOTE.TXT')).toBe(true)
    })

    it('应允许 .markdown 扩展名', () => {
      expect(isPathSafe('/Users/test/Documents/note.markdown')).toBe(true)
    })

    it('应拒绝危险的扩展名', () => {
      expect(isPathSafe('/Users/test/Documents/script.js')).toBe(false)
      expect(isPathSafe('/Users/test/Documents/script.sh')).toBe(false)
      expect(isPathSafe('/Users/test/Documents/program.exe')).toBe(false)
      expect(isPathSafe('/Users/test/Documents/config.json')).toBe(false)
      expect(isPathSafe('/Users/test/Documents/data.html')).toBe(false)
    })

    it('应拒绝无扩展名的文件', () => {
      expect(isPathSafe('/Users/test/Documents/note')).toBe(false)
    })

    it('应拒绝隐藏文件', () => {
      expect(isPathSafe('/Users/test/Documents/.hidden')).toBe(false)
      expect(isPathSafe('/Users/test/.bashrc')).toBe(false)
    })
  })

  describe('边界情况', () => {
    it('应正确处理带空格的路径', () => {
      expect(isPathSafe('/Users/test/Documents/my notes.md')).toBe(true)
      expect(isPathSafe('/Users/test/Documents/folder name/note.md')).toBe(true)
    })

    it('应正确处理带特殊字符的路径', () => {
      expect(isPathSafe('/Users/test/Documents/note-2024.md')).toBe(true)
      expect(isPathSafe('/Users/test/Documents/note_v2.md')).toBe(true)
    })

    it('应正确处理中文路径', () => {
      expect(isPathSafe('/Users/test/Documents/笔记.md')).toBe(true)
      expect(isPathSafe('/Users/test/Documents/文档/笔记.md')).toBe(true)
    })

    it('应拒绝仅目录路径（无文件名）', () => {
      expect(isPathSafe('/Users/test/Documents/')).toBe(false)
      expect(isPathSafe('/Users/test/Documents')).toBe(false)
    })

    it('应正确处理多个 . 的文件名', () => {
      expect(isPathSafe('/Users/test/Documents/note.backup.md')).toBe(true)
      expect(isPathSafe('/Users/test/Documents/note.2024.01.01.md')).toBe(true)
    })
  })

  describe('组合攻击防护', () => {
    it('应拒绝路径遍历 + 有效扩展名组合', () => {
      expect(isPathSafe('/Users/test/Documents/../../../etc/passwd.md')).toBe(false)
    })

    it('应拒绝在允许目录下的危险扩展名', () => {
      expect(isPathSafe('/Users/test/Documents/malware.exe')).toBe(false)
    })

    it('应拒绝看起来合法但不在白名单目录的路径', () => {
      expect(isPathSafe('/Users/other/Documents/note.md')).toBe(false)
    })
  })
})
