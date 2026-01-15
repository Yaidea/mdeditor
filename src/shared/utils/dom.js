/**
 * @file src/shared/utils/dom.js
 * @description 统一的 DOM 操作工具
 *
 * 提供通用的 DOM 操作封装，包括：
 * - 离屏容器样式
 * - 选区操作
 * - 滚动位置保存/恢复
 */

/**
 * 离屏隐藏样式预设
 * 用于创建不可见但可访问的 DOM 元素（如复制操作）
 */
export const OFFSCREEN_STYLES = {
  /**
   * 绝对定位版本 - 用于一般场景
   */
  absolute: {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    width: '1px',
    height: '1px',
    opacity: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: '-1',
    visibility: 'hidden'
  },

  /**
   * 固定定位版本 - 用于需要避免滚动影响的场景
   */
  fixed: {
    position: 'fixed',
    left: '-99999px',
    top: '-99999px',
    width: '1px',
    height: '1px',
    opacity: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: '-1',
    visibility: 'hidden'
  },

  /**
   * 复制专用版本 - 更严格的隐藏，避免页面抖动
   */
  clipboard: {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: '-9999',
    visibility: 'hidden',
    margin: '0',
    padding: '0',
    border: 'none',
    outline: 'none',
    transform: 'translate(-9999px, -9999px)',
    display: 'block',
    contain: 'strict'
  },

  /**
   * 渲染容器版本 - 用于 Mermaid 等需要宽度的渲染
   */
  render: {
    position: 'fixed',
    left: '-99999px',
    top: '-99999px',
    width: '1024px',
    height: 'auto',
    opacity: '0',
    pointerEvents: 'none',
    lineHeight: 'normal'
  }
};

/**
 * DOM 工具类
 */
export class DOMUtils {
  /**
   * 将样式对象应用到元素
   * @param {HTMLElement} element - 目标元素
   * @param {Object} styles - 样式对象
   */
  static applyStyles(element, styles) {
    if (!element || !styles) return;
    Object.assign(element.style, styles);
  }

  /**
   * 应用离屏隐藏样式
   * @param {HTMLElement} element - 目标元素
   * @param {'absolute'|'fixed'|'clipboard'|'render'} type - 样式类型
   */
  static applyOffscreenStyles(element, type = 'absolute') {
    const styles = OFFSCREEN_STYLES[type] || OFFSCREEN_STYLES.absolute;
    this.applyStyles(element, styles);
  }

  /**
   * 创建离屏容器
   * @param {string} html - 容器内的 HTML 内容
   * @param {'absolute'|'fixed'|'clipboard'|'render'} type - 样式类型
   * @returns {HTMLDivElement} 创建的容器元素
   */
  static createOffscreenContainer(html = '', type = 'absolute') {
    const container = document.createElement('div');
    this.applyOffscreenStyles(container, type);
    if (html) {
      container.innerHTML = html;
    }
    return container;
  }

  /**
   * 创建并选中元素内容的选区
   * @param {HTMLElement} element - 要选中的元素
   * @returns {{range: Range, selection: Selection}} 创建的 Range 和 Selection 对象
   */
  static createSelection(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return { range, selection };
  }

  /**
   * 清除当前选区
   */
  static clearSelection() {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }

  /**
   * 保存当前滚动位置
   * @returns {{x: number, y: number}} 滚动位置
   */
  static saveScrollPosition() {
    return {
      x: window.scrollX || window.pageXOffset || 0,
      y: window.scrollY || window.pageYOffset || 0
    };
  }

  /**
   * 恢复滚动位置
   * @param {{x: number, y: number}} position - 要恢复的位置
   */
  static restoreScrollPosition(position) {
    if (position && typeof window.scrollTo === 'function') {
      window.scrollTo(position.x, position.y);
    }
  }

  /**
   * 保存当前焦点元素
   * @returns {Element|null} 当前焦点元素
   */
  static saveActiveElement() {
    return document.activeElement;
  }

  /**
   * 恢复焦点到指定元素
   * @param {Element|null} element - 要恢复焦点的元素
   */
  static restoreActiveElement(element) {
    try {
      if (element && typeof element.focus === 'function') {
        element.focus();
      }
    } catch {
      // 忽略焦点恢复失败
    }
  }

  /**
   * 安全地从 DOM 中移除元素
   * @param {HTMLElement} element - 要移除的元素
   * @returns {boolean} 是否成功移除
   */
  static safeRemove(element) {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
        return true;
      }
    } catch {
      // 忽略移除失败
    }
    return false;
  }

  /**
   * 执行需要临时 DOM 元素的操作
   * @param {HTMLElement} element - 临时元素
   * @param {Function} operation - 要执行的操作
   * @returns {Promise<*>} 操作结果
   */
  static async withTemporaryElement(element, operation) {
    document.body.appendChild(element);
    try {
      return await operation(element);
    } finally {
      this.safeRemove(element);
    }
  }

  /**
   * 同步版本的临时元素操作
   * @param {HTMLElement} element - 临时元素
   * @param {Function} operation - 要执行的操作
   * @returns {*} 操作结果
   */
  static withTemporaryElementSync(element, operation) {
    document.body.appendChild(element);
    try {
      return operation(element);
    } finally {
      this.safeRemove(element);
    }
  }
}
