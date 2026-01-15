/**
 * @file src/shared/utils/storage.js
 * @description 统一的 localStorage 安全访问工具
 *
 * 提供对 localStorage 的安全封装，统一错误处理和 JSON 序列化。
 * 替代项目中分散的 try-catch localStorage 访问模式。
 */

/**
 * 临时存储键（用于自定义颜色等临时状态）
 */
export const TEMP_STORAGE_KEYS = {
  CUSTOM_COLOR: 'temp-custom-color',
  CUSTOM_THEME: 'temp-custom-theme'
};

/**
 * 安全存储工具类
 * 封装 localStorage 操作，提供统一的错误处理和 JSON 序列化
 */
export class SafeStorage {
  /**
   * 获取原始字符串值
   * @param {string} key - 存储键
   * @param {string} defaultValue - 默认值
   * @returns {string} 存储的值或默认值
   */
  static get(key, defaultValue = '') {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.warn(`[SafeStorage] 读取失败 '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * 设置原始字符串值
   * @param {string} key - 存储键
   * @param {string} value - 要存储的值
   * @returns {boolean} 操作是否成功
   */
  static set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`[SafeStorage] 写入失败 '${key}':`, error);
      return false;
    }
  }

  /**
   * 获取 JSON 解析后的值
   * @param {string} key - 存储键
   * @param {*} defaultValue - 默认值（解析失败或不存在时返回）
   * @returns {*} 解析后的值或默认值
   */
  static getJson(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      return JSON.parse(value);
    } catch (error) {
      console.warn(`[SafeStorage] JSON 解析失败 '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * 设置 JSON 序列化后的值
   * @param {string} key - 存储键
   * @param {*} value - 要存储的值（会被 JSON 序列化）
   * @returns {boolean} 操作是否成功
   */
  static setJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[SafeStorage] JSON 序列化失败 '${key}':`, error);
      return false;
    }
  }

  /**
   * 移除存储项
   * @param {string} key - 存储键
   * @returns {boolean} 操作是否成功
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`[SafeStorage] 移除失败 '${key}':`, error);
      return false;
    }
  }

  /**
   * 批量移除存储项
   * @param {string[]} keys - 存储键数组
   * @returns {boolean} 是否全部成功
   */
  static removeAll(keys) {
    return keys.every(key => this.remove(key));
  }

  /**
   * 检查键是否存在
   * @param {string} key - 存储键
   * @returns {boolean} 是否存在
   */
  static has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * 获取数值
   * @param {string} key - 存储键
   * @param {number} defaultValue - 默认值
   * @returns {number} 数值或默认值
   */
  static getNumber(key, defaultValue = 0) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * 获取整数
   * @param {string} key - 存储键
   * @param {number} defaultValue - 默认值
   * @returns {number} 整数或默认值
   */
  static getInt(key, defaultValue = 0) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      const num = parseInt(value, 10);
      return Number.isFinite(num) ? num : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}
