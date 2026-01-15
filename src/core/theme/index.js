/**
 * @file src/core/theme/index.js
 * @description 主题系统统一导出
 *
 * 集中管理主题相关的核心功能
 */

// 主题管理器（包含 hexToRgb, computeThemeVariables）
export { cssManager, hexToRgb, computeThemeVariables } from './manager.js';

// 主题存储
export { ThemeStorage, STORAGE_KEYS, STORAGE_DEFAULTS } from './storage.js';

// 注意: loader.js 是 IIFE 模块，通过 import './loader.js' 直接执行
// 用于防止主题闪烁 (FOUC)，无导出
