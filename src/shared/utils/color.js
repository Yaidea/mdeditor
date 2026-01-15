/**
 * @file src/shared/utils/color.js
 * @description 颜色处理工具
 *
 * 提供统一的颜色操作函数，包括：
 * - 颜色亮度调整
 * - 颜色格式转换
 * - 颜色验证
 */

/**
 * 颜色工具类
 */
export class ColorUtils {
  /**
   * 调整颜色亮度
   * @param {string} color - 十六进制颜色值（如 #ff0000）
   * @param {number} factor - 亮度因子（0-2，1 为原色，>1 变亮，<1 变暗）
   * @returns {string} 调整后的颜色
   */
  static adjustBrightness(color, factor) {
    if (!color) return color;

    // 处理十六进制颜色
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const num = parseInt(hex, 16);

      // 使用 Math.min(255, ...) 和 Math.max(0, ...) 防止颜色值溢出
      const r = Math.min(255, Math.max(0, Math.round((num >> 16) * factor)));
      const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0x00ff) * factor)));
      const b = Math.min(255, Math.max(0, Math.round((num & 0x0000ff) * factor)));

      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    return color;
  }

  /**
   * 将十六进制颜色转换为 RGB 对象
   * @param {string} hex - 十六进制颜色值
   * @returns {{r: number, g: number, b: number}|null} RGB 对象或 null
   */
  static hexToRgb(hex) {
    if (!hex) return null;

    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  /**
   * 将 RGB 值转换为十六进制颜色
   * @param {number} r - 红色值 (0-255)
   * @param {number} g - 绿色值 (0-255)
   * @param {number} b - 蓝色值 (0-255)
   * @returns {string} 十六进制颜色值
   */
  static rgbToHex(r, g, b) {
    const toHex = (n) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n)));
      return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * 判断颜色是否为深色
   * @param {string} hex - 十六进制颜色值
   * @returns {boolean} 是否为深色
   */
  static isDarkColor(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return false;

    // 使用相对亮度公式
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  }

  /**
   * 获取对比色（用于文字颜色）
   * @param {string} hex - 背景颜色的十六进制值
   * @returns {string} 对比色（黑色或白色）
   */
  static getContrastColor(hex) {
    return this.isDarkColor(hex) ? '#ffffff' : '#000000';
  }

  /**
   * 验证十六进制颜色格式
   * @param {string} color - 要验证的颜色值
   * @returns {boolean} 是否为有效的十六进制颜色
   */
  static isValidHex(color) {
    if (!color || typeof color !== 'string') return false;
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color);
  }

  /**
   * 标准化十六进制颜色格式
   * @param {string} hex - 十六进制颜色值
   * @returns {string} 标准化的颜色值（6位小写）
   */
  static normalizeHex(hex) {
    if (!hex) return '';

    let color = hex.trim().toLowerCase();

    // 添加 # 前缀
    if (!color.startsWith('#')) {
      color = '#' + color;
    }

    // 将 3 位颜色扩展为 6 位
    if (color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }

    return this.isValidHex(color) ? color : '';
  }

  /**
   * 混合两种颜色
   * @param {string} color1 - 第一种颜色
   * @param {string} color2 - 第二种颜色
   * @param {number} ratio - 混合比例（0-1，0 为纯 color1，1 为纯 color2）
   * @returns {string} 混合后的颜色
   */
  static mixColors(color1, color2, ratio = 0.5) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return color1;

    const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
    const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
    const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

    return this.rgbToHex(r, g, b);
  }

  /**
   * 设置颜色透明度
   * @param {string} hex - 十六进制颜色值
   * @param {number} alpha - 透明度 (0-1)
   * @returns {string} rgba 颜色值
   */
  static setAlpha(hex, alpha) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
  }
}
