/**
 * @file src/core/markdown/inline-formatter.js
 * @description 内联 Markdown 格式处理器
 *
 * 合并以下处理逻辑：
 * - 转义处理: escapeHtml, preprocessEscapes, postprocessEscapes
 * - 样式处理: processBoldAndItalic, processStrikethrough
 * - 链接处理: processLinks, processImages, cleanUrl, sanitizeAttribute
 * - 特殊格式: processHighlight, processSubscript, processSuperscript, processKeyboard
 * - 内联代码: processInlineCode, restoreCodePlaceholders
 * - 管道入口: processAllInlineFormats
 * - 文本清理: cleanReferenceLinks, cleanText
 */

import { REGEX_PATTERNS } from '../../config/constants/index.js';
import { escapeHtml as sharedEscapeHtml, cleanUrl as sharedCleanUrl } from '../../shared/utils/text.js';
import { extractMath, restoreMath, renderMathPlaceholders } from './math/index.js';

// ============================================================================
// 转义处理
// ============================================================================

const ESCAPE_PLACEHOLDERS = {
  '\\\\': 'XESCBSX',
  '\\*': 'XESCASX',
  '\\_': 'XESCUSX',
  '\\`': 'XESCBTX',
  '\\~': 'XESCTLX',
  '\\[': 'XESCLBX',
  '\\]': 'XESCRBX',
  '\\(': 'XESCLPX',
  '\\)': 'XESCRPX',
  '\\#': 'XESCHSX',
  '\\+': 'XESCPLX',
  '\\-': 'XESCMNX',
  '\\.': 'XESCDTX',
  '\\!': 'XESCEXX'
};

const PLACEHOLDER_TO_CHAR = {
  'XESCBSX': '\\',
  'XESCASX': '*',
  'XESCUSX': '_',
  'XESCBTX': '`',
  'XESCTLX': '~',
  'XESCLBX': '[',
  'XESCRBX': ']',
  'XESCLPX': '(',
  'XESCRPX': ')',
  'XESCHSX': '#',
  'XESCPLX': '+',
  'XESCMNX': '-',
  'XESCDTX': '.',
  'XESCEXX': '!'
};

/**
 * 转义 HTML 特殊字符
 */
export function escapeHtml(text) {
  return sharedEscapeHtml(text);
}

/**
 * 预处理转义字符，将其替换为占位符
 */
export function preprocessEscapes(text) {
  if (!text) return '';

  let result = text;
  for (const [escape, placeholder] of Object.entries(ESCAPE_PLACEHOLDERS)) {
    result = result.replace(new RegExp(escape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), placeholder);
  }
  return result;
}

/**
 * 后处理占位符，将其替换回实际字符
 */
export function postprocessEscapes(text) {
  if (!text) return '';

  let result = text;
  for (const [placeholder, char] of Object.entries(PLACEHOLDER_TO_CHAR)) {
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedPlaceholder, 'g'), char);
  }
  return result;
}

// ============================================================================
// 样式处理
// ============================================================================

/**
 * 处理粗体和斜体文本的组合格式
 */
export function processBoldAndItalic(text, theme) {
  const transform = (input) => {
    let result = input;

    // 首先处理粗斜体 ***text*** 和 ___text___
    result = result.replace(/\*\*\*(.*?)\*\*\*/g, (_, content) => {
      return `<strong><em style="color: ${theme.primary}; font-style: italic; font-weight: 900;">${content}</em></strong>`;
    });

    result = result.replace(/(^|[^A-Za-z0-9_])_{3}(.+?)_{3}(?![A-Za-z0-9_])/g, (match, pre, content) => {
      return `${pre}<strong><em style="color: ${theme.primary}; font-style: italic; font-weight: 900;">${content}</em></strong>`;
    });

    // 处理嵌套的粗体包含斜体的情况
    result = result.replace(/\*\*([^*]*(?:\*[^*]+\*[^*]*)*)\*\*/g, (match, content) => {
      const processedContent = content.replace(/\*([^*]+)\*/g, '<em style="color: ' + theme.textSecondary + '; font-style: italic;">$1</em>');
      return `<strong style="color: ${theme.primary}; font-weight: 900;">${processedContent}</strong>`;
    });

    // 处理下划线粗体包含斜体
    result = result.replace(/(^|[^A-Za-z0-9_])__([^_]*(?:_[^_]+_[^_]*)*)__(?![A-Za-z0-9_])/g, (match, pre, content) => {
      const processedContent = content.replace(/(^|[^A-Za-z0-9_])_([^_]+)_(?![A-Za-z0-9_])/g, (m2, pre2, inner) => `${pre2}<em style="color: ${theme.textSecondary}; font-style: italic;">${inner}</em>`);
      return `${pre}<strong style="color: ${theme.primary}; font-weight: 900;">${processedContent}</strong>`;
    });

    // 处理剩余的独立粗体
    result = result.replace(/\*\*([^*]+)\*\*/g, (_, content) => {
      return `<strong style="color: ${theme.primary}; font-weight: 900;">${content}</strong>`;
    });

    result = result.replace(/(^|[^A-Za-z0-9_])__([^_]+)__(?![A-Za-z0-9_])/g, (match, pre, content) => {
      return `${pre}<strong style="color: ${theme.primary}; font-weight: 900;">${content}</strong>`;
    });

    // 最后处理独立的斜体
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, content) => {
      return `<em style="color: ${theme.textSecondary}; font-style: italic;">${content}</em>`;
    });

    result = result.replace(/(^|[^A-Za-z0-9_])_([^_]+)_(?![A-Za-z0-9_])/g, (match, pre, content) => {
      return `${pre}<em style="color: ${theme.textSecondary}; font-style: italic;">${content}</em>`;
    });

    return result;
  };

  // 仅对标签外文本应用样式替换
  return text.split(/(<[^>]+>)/g).map(seg => (seg && seg.startsWith('<')) ? seg : transform(seg)).join('');
}

/**
 * 处理粗体文本（向后兼容）
 */
export function processBold(text, theme) {
  return processBoldAndItalic(text, theme);
}

/**
 * 处理斜体文本（向后兼容）
 */
export function processItalic(text, _theme) {
  return text;
}

/**
 * 处理删除线文本
 */
export function processStrikethrough(text, theme) {
  return text.replace(/~~(.*?)~~/g, (_, content) => {
    return `<del style="color: ${theme.textMuted}; text-decoration: line-through;">${content}</del>`;
  });
}

// ============================================================================
// 链接与图片处理
// ============================================================================

/**
 * 处理链接
 */
export function processLinks(text, theme) {
  return text.replace(REGEX_PATTERNS.LINK, (_, linkText, url) => {
    const sanitizedUrl = sharedCleanUrl(url);
    if (!sanitizedUrl) return linkText;
    return `<a href="${sanitizedUrl}" style="color: ${theme.primary}; text-decoration: none; border-bottom: 1px solid ${theme.primary}4D;" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  });
}

/**
 * 处理图片
 */
export function processImages(text, theme) {
  return text.replace(REGEX_PATTERNS.IMAGE, (_, altText, url) => {
    const sanitizedUrl = sharedCleanUrl(url);
    const hasAlt = typeof altText === 'string' && altText.trim().length > 0;
    const cleanAlt = hasAlt ? altText.trim() : '图片';

    const safeAlt = sanitizeAttribute(cleanAlt);
    const captionAttr = hasAlt ? ' data-md-caption="true"' : '';

    if (!sanitizedUrl) {
      const placeholderText = sharedEscapeHtml(cleanAlt || '图片');
      return `<span class="md-image-placeholder">${placeholderText}</span>`;
    }

    return `<img src="${sanitizedUrl}" alt="${safeAlt}"${captionAttr} style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px ${theme.shadowColor}; margin: 8px 0; display: block;" loading="lazy">`;
  });
}

/**
 * 清理和验证 URL
 */
export function cleanUrl(url) {
  return sharedCleanUrl(url);
}

/**
 * 生成安全的 HTML 属性值
 */
export function sanitizeAttribute(value) {
  if (!value) return '';

  return value
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================================
// 特殊格式处理
// ============================================================================

/**
 * 处理高亮文本
 */
export function processHighlight(text, theme) {
  return text.replace(/==(.*?)==/g, (_, content) => {
    return `<mark style="background-color: ${theme.highlight}; color: ${theme.textPrimary}; padding: 1px 2px; border-radius: 2px;">${content}</mark>`;
  });
}

/**
 * 处理下标文本
 */
export function processSubscript(text, theme) {
  return text.replace(/~([^~\s]+)~/g, (_, content) => {
    return `<sub style="color: ${theme.textSecondary}; font-size: 0.8em;">${content}</sub>`;
  });
}

/**
 * 处理上标文本
 */
export function processSuperscript(text, theme) {
  return text.replace(/\^([^\^\s]+)\^/g, (_, content) => {
    return `<sup style="color: ${theme.textSecondary}; font-size: 0.8em;">${content}</sup>`;
  });
}

/**
 * 处理键盘按键
 */
export function processKeyboard(text, theme) {
  return text.replace(/<kbd>(.*?)<\/kbd>/g, (_, content) => {
    return `<kbd style="background-color: ${theme.borderLight}; color: ${theme.textPrimary}; padding: 2px 6px; border-radius: 3px; border: 1px solid ${theme.borderMedium}; font-family: monospace; font-size: 0.9em; box-shadow: 0 1px 2px ${theme.shadowColor};">${content}</kbd>`;
  });
}

// ============================================================================
// 内联代码处理
// ============================================================================

function generatePlaceholderId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function createCodeContext() {
  return {
    placeholders: [],
    id: generatePlaceholderId()
  };
}

/**
 * 处理内联代码
 */
export function processInlineCode(text, theme, baseFontSize = 16) {
  const context = createCodeContext();

  const processedText = text.replace(REGEX_PATTERNS.CODE, (_, code) => {
    const escapedCode = escapeHtml(code);
    const codeFontSize = 14;
    const codeHtml = `<code style="background-color: ${theme.inlineCodeBg}; color: ${theme.inlineCodeText}; padding: 2px 4px; border-radius: 3px; font-family: Consolas, monospace; font-size: ${codeFontSize}px; border: 1px solid ${theme.inlineCodeBorder};">${escapedCode}</code>`;

    const placeholder = `〖CODE_${context.id}_${context.placeholders.length}〗`;
    context.placeholders.push(codeHtml);

    return placeholder;
  });

  return { text: processedText, context };
}

/**
 * 恢复代码占位符
 */
export function restoreCodePlaceholders(text, context) {
  if (!context) {
    return text;
  }

  let result = text;
  const { placeholders, id } = context;

  placeholders.forEach((codeHtml, index) => {
    const placeholder = `〖CODE_${id}_${index}〗`;
    result = result.replace(placeholder, codeHtml);
  });

  return result;
}

// ============================================================================
// 文本清理
// ============================================================================

/**
 * 清理引用式链接和图片引用
 */
export function cleanReferenceLinks(text) {
  text = text.replace(/^\s*\[([^\]]+)\]:\s*([^\s]+)(\s+"[^"]*")?\s*$/gm, '');
  text = text.replace(/^\s*!\[([^\]]*)\]:\s*([^\s]+)(\s+"[^"]*")?\s*$/gm, '');
  return text;
}

/**
 * 清理和标准化文本
 */
export function cleanText(text) {
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  text = text.replace(/\t/g, '    ');
  text = text.replace(/[ \t]+$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text;
}

// ============================================================================
// 格式化管道
// ============================================================================

const INLINE_FORMAT_PROCESSORS = [
  {
    name: 'escapes',
    process: (text, theme, handleEscapes, baseFontSize, state) => handleEscapes ? preprocessEscapes(text) : text,
    condition: (handleEscapes) => handleEscapes
  },
  {
    name: 'inlineCode',
    process: (text, theme, handleEscapes, baseFontSize, state) => {
      const { text: processedText, context } = processInlineCode(text, theme, baseFontSize);
      state.codeContext = context;
      return processedText;
    },
    condition: () => true
  },
  {
    name: 'math',
    process: (text, theme, handleEscapes, baseFontSize, state) => {
      const { text: extractedText, placeholders } = extractMath(text);
      state.mathPlaceholders = placeholders;
      return extractedText;
    },
    condition: () => true
  },
  {
    name: 'images',
    process: (text, theme, handleEscapes, baseFontSize, state) => processImages(text, theme),
    condition: () => true
  },
  {
    name: 'links',
    process: (text, theme, handleEscapes, baseFontSize, state) => processLinks(text, theme),
    condition: () => true
  },
  {
    name: 'keyboard',
    process: (text, theme, handleEscapes, baseFontSize, state) => processKeyboard(text, theme),
    condition: () => true
  },
  {
    name: 'highlight',
    process: (text, theme, handleEscapes, baseFontSize, state) => processHighlight(text, theme),
    condition: () => true
  },
  {
    name: 'boldAndItalic',
    process: (text, theme, handleEscapes, baseFontSize, state) => processBoldAndItalic(text, theme),
    condition: () => true
  },
  {
    name: 'strikethrough',
    process: (text, theme, handleEscapes, baseFontSize, state) => processStrikethrough(text, theme),
    condition: () => true
  },
  {
    name: 'superscript',
    process: (text, theme, handleEscapes, baseFontSize, state) => processSuperscript(text, theme),
    condition: () => true
  },
  {
    name: 'subscript',
    process: (text, theme, handleEscapes, baseFontSize, state) => processSubscript(text, theme),
    condition: () => true
  },
  {
    name: 'restoreMath',
    process: (text, theme, handleEscapes, baseFontSize, state) => {
      if (!state.mathPlaceholders?.length) return text;
      const rendered = renderMathPlaceholders(state.mathPlaceholders);
      return restoreMath(text, rendered);
    },
    condition: () => true
  },
  {
    name: 'restoreCode',
    process: (text, theme, handleEscapes, baseFontSize, state) => restoreCodePlaceholders(text, state.codeContext),
    condition: () => true
  },
  {
    name: 'postprocessEscapes',
    process: (text, theme, handleEscapes, baseFontSize, state) => handleEscapes ? postprocessEscapes(text) : text,
    condition: (handleEscapes) => handleEscapes
  }
];

function executeFormattingPipeline(text, theme, handleEscapes, baseFontSize = 16) {
  let result = text;

  const state = {
    codeContext: null,
    mathPlaceholders: []
  };

  for (const processor of INLINE_FORMAT_PROCESSORS) {
    if (processor.condition(handleEscapes)) {
      result = processor.process(result, theme, handleEscapes, baseFontSize, state);
    }
  }

  return result;
}

/**
 * 处理所有内联文本格式
 */
export function processAllInlineFormats(text, theme, handleEscapes = true, baseFontSize = 16) {
  return executeFormattingPipeline(text, theme, handleEscapes, baseFontSize);
}

/**
 * 处理内联格式但不处理转义字符
 */
export function processInlineFormatsWithoutEscapes(text, theme, baseFontSize = 16) {
  return processAllInlineFormats(text, theme, false, baseFontSize);
}

/**
 * 格式化内联文本
 */
export function formatInline(text, theme, baseFontSize = 16) {
  if (!text) return '';
  return processAllInlineFormats(text, theme, true, baseFontSize);
}
