/**
 * @file src/core/markdown/code-formatter.js
 * @description 代码高亮处理器
 *
 * 专门处理代码块的语法高亮，支持多种编程语言和主题。
 */

import { defaultColorTheme, getCodeStyle } from '../../config/theme-presets.js';

/**
 * 语言别名映射
 */
const LANGUAGE_ALIASES = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'shell': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'htm': 'html',
  'xml': 'html',
  'c++': 'cpp',
  'c#': 'csharp',
  'cs': 'csharp',
  'fs': 'fsharp',
  'vb': 'vbnet',
  'ps1': 'powershell',
  'psm1': 'powershell',
};

/**
 * 获取标准化的语言名称
 * @param {string} language - 原始语言名称
 * @returns {string} - 标准化的语言名称
 */
export function normalizeLanguage(language) {
  if (!language) return 'text';

  const normalized = language.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

/**
 * 检查是否为支持的编程语言
 * @param {string} language - 语言名称
 * @returns {boolean} - 是否支持
 */
export function isSupportedLanguage(language) {
  const supportedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'html',
    'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'markdown',
    'bash', 'shell', 'powershell', 'sql', 'r', 'matlab', 'perl',
    'lua', 'dart', 'elixir', 'erlang', 'haskell', 'clojure', 'fsharp',
    'vbnet', 'assembly', 'dockerfile', 'nginx', 'apache', 'text'
  ];

  return supportedLanguages.includes(normalizeLanguage(language));
}

/**
 * 生成微信兼容的语法高亮样式
 * @param {string} color - 颜色值
 * @param {string} type - 语法类型 (keyword, string, comment, etc.)
 * @returns {string} - 样式字符串
 */
function createWechatCompatibleStyle(color, type) {
  const className = `syntax-${type}`;
  return `style="color: ${color} !important; font-weight: inherit; text-decoration: none;" class="${className}" data-syntax="${type}" data-color="${color}"`;
}

/**
 * 主要的代码高亮函数 - 使用固定的代码样式配色
 * @param {string} code - 代码内容
 * @param {string} language - 编程语言
 * @param {Object} codeTheme - 代码主题
 * @returns {string} - 高亮后的代码
 */
export function highlightCode(code, language, codeTheme) {
  if (!code) return '';

  void language; // 明确标记参数暂未使用

  const highlight = codeTheme?.syntaxHighlight;

  if (!highlight || Object.keys(highlight).length === 0) {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/ /g, '&nbsp;');
  }

  // 先转义HTML字符
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const chars = result.split('');
  const processed = new Array(chars.length).fill(false);
  const highlights = [];

  const rules = [
    // 1. 注释 - 最高优先级
    { pattern: /\/\/.*$/gm, color: highlight.comment, type: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, color: highlight.comment, type: 'comment' },

    // 2. 字符串
    { pattern: /(["'`])(?!gt;|lt;|amp;|quot;)[^"'`]*?\1/g, color: highlight.string, type: 'string' },

    // 3. 关键字
    { pattern: /\b(function|const|let|var|if|else|for|while|return|class|import|export|from|default|async|await|try|catch|finally|public|private|protected|static|void|int|string|boolean|true|false|null|undefined)\b/g, color: highlight.keyword, type: 'keyword' },

    // 4. 数字
    { pattern: /\b\d+(?:\.\d+)?\b/g, color: highlight.number, type: 'number' },

    // 5. 函数名
    { pattern: /\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\()/g, color: highlight.function, type: 'function' }
  ];

  // 按优先级处理每个规则，避免重叠
  rules.forEach(rule => {
    let match;
    rule.pattern.lastIndex = 0;

    while ((match = rule.pattern.exec(result)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      let canProcess = true;
      for (let i = start; i < end; i++) {
        if (processed[i]) {
          canProcess = false;
          break;
        }
      }

      if (canProcess) {
        highlights.push({
          start,
          end,
          text: match[0],
          color: rule.color,
          type: rule.type
        });

        for (let i = start; i < end; i++) {
          processed[i] = true;
        }
      }
    }
  });

  // 按位置排序
  highlights.sort((a, b) => a.start - b.start);

  // 构建最终结果
  let finalResult = '';
  let lastIndex = 0;

  highlights.forEach(hl => {
    if (hl.start > lastIndex) {
      const unprocessedText = result.substring(lastIndex, hl.start);
      finalResult += unprocessedText;
    }

    const styleAttr = createWechatCompatibleStyle(hl.color, hl.type);
    finalResult += `<span ${styleAttr}><font color="${hl.color}">${hl.text}</font></span>`;
    lastIndex = hl.end;
  });

  if (lastIndex < result.length) {
    const remainingText = result.substring(lastIndex);
    finalResult += remainingText;
  }

  result = finalResult;

  // 智能地保护空格
  const tagPlaceholders = [];
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  let tagIndex = 0;
  result = result.replace(/<[^>]+>/g, (match) => {
    const placeholder = `\x00TAG_${uniqueId}_${tagIndex}\x00`;
    tagPlaceholders.push({ placeholder, tag: match });
    tagIndex++;
    return placeholder;
  });

  result = result.replace(/ /g, '&nbsp;');

  tagPlaceholders.forEach(({ placeholder, tag }) => {
    result = result.replace(placeholder, tag);
  });

  return result;
}

/**
 * 格式化代码块，包含语法高亮和主题样式
 * @param {string} content - 代码内容
 * @param {string} language - 编程语言
 * @param {object} [_unusedTheme=defaultColorTheme] - （兼容保留，未使用）颜色主题对象
 * @param {object|null} [codeTheme=null] - 代码样式主题对象
 * @param {boolean} [isPreview=false] - 是否为预览模式
 * @param {number} [baseFontSize=16] - 基础字号
 * @returns {string} - 格式化后的代码块 HTML 字符串
 */
export function formatCodeBlock(content, language, _unusedTheme = defaultColorTheme, codeTheme = null, isPreview = false, baseFontSize = 16) {
  const trimmedContent = (content || '').trim();
  // Mermaid: keep raw block to avoid breaking diagram syntax
  const lang = (language || '').toString().trim().toLowerCase();
  if (lang === 'mermaid') {
    const escaped = trimmedContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const blockMargin = `${Math.max(8, Math.round(baseFontSize))}px`;
    return `<div class="mermaid-block" style="margin: ${blockMargin} 0; line-height: 0; font-size: 0;"><div class="mermaid">${escaped}</div></div>`;
  }

  const safeCodeTheme = codeTheme || getCodeStyle('mac');
  const highlightedContent = highlightCode(trimmedContent, language, safeCodeTheme);
  const contentForCopy = highlightedContent;
  const imp = !isPreview ? '!important' : '';
  const codeFontSize = 14;

  const preStyle = `
    background: ${safeCodeTheme.background} ${imp};
    border-radius: 12px ${imp};
    ${safeCodeTheme.hasHeader ? `padding: 0 ${imp};` : `padding: 24px ${imp};`}
    overflow: hidden ${imp};
    font-size: ${codeFontSize}px ${imp};
    line-height: 1.3 ${imp};
    border: none ${imp};
    position: relative ${imp};
    font-family: Consolas, monospace ${imp};
    margin: 32px 0 ${imp};
    font-weight: 400 ${imp};
    color: ${safeCodeTheme.color} ${imp};
    box-sizing: border-box ${imp};
    display: block ${imp};
    color-scheme: light ${imp};
    min-height: auto ${imp};
    height: auto ${imp};
    max-height: none ${imp};
    ${!isPreview ? 'vertical-align: top !important;' : ''}
  `.replace(/\s+/g, ' ').trim();

  const scrollAreaStyle = `
    overflow-x: auto ${imp};
    overflow-y: hidden ${imp};
    width: 100% ${imp};
    color-scheme: light ${imp};
    box-sizing: border-box ${imp};
    ${safeCodeTheme.hasHeader ? `padding: 12px 24px 20px 24px ${imp};` : `padding: 24px ${imp};`}
    -webkit-overflow-scrolling: touch ${imp};
  `.replace(/\s+/g, ' ').trim();

  const codeStyle = `
    background: transparent ${imp};
    border: none ${imp};
    font-family: Consolas, monospace ${imp};
    font-size: ${codeFontSize}px ${imp};
    line-height: 1.3 ${imp};
    color: ${safeCodeTheme.color} ${imp};
    display: block ${imp};
    width: 100% ${imp};
    overflow-x: auto ${imp};
    overflow-y: hidden ${imp};
    color-scheme: light ${imp};
    -webkit-overflow-scrolling: touch ${imp};
    white-space: pre ${imp};
    text-indent: 0 ${imp};
    word-spacing: normal ${imp};
    letter-spacing: normal ${imp};
    margin: 0 ${imp};
    padding: 0 ${imp};
    box-sizing: border-box ${imp};
    min-height: auto ${imp};
    height: auto ${imp};
    max-height: none ${imp};
    ${!isPreview ? 'vertical-align: top !important;' : ''}
  `.replace(/\s+/g, ' ').trim();

  const expanderStyle = `
    display: inline-block !important;
    min-width: max-content !important;
    width: auto !important;
    max-width: none !important;
  `.replace(/\s+/g, ' ').trim();

  const codeStyleCopy = `
    background: transparent ${!isPreview ? '!important' : ''};
    border: none ${!isPreview ? '!important' : ''};
    font-family: Consolas, monospace ${!isPreview ? '!important' : ''};
    font-size: ${codeFontSize}px ${!isPreview ? '!important' : ''};
    line-height: 1.3 ${!isPreview ? '!important' : ''};
    color: ${safeCodeTheme.color} ${!isPreview ? '!important' : ''};
    display: inline-block ${!isPreview ? '!important' : ''};
    width: auto ${!isPreview ? '!important' : ''};
    max-width: none ${!isPreview ? '!important' : ''};
    white-space: pre ${!isPreview ? '!important' : ''};
    word-spacing: normal ${!isPreview ? '!important' : ''};
    letter-spacing: normal ${!isPreview ? '!important' : ''};
    -webkit-overflow-scrolling: touch ${!isPreview ? '!important' : ''};
    text-indent: 0 ${!isPreview ? '!important' : ''};
    margin: 0 ${!isPreview ? '!important' : ''};
    padding: 0 ${!isPreview ? '!important' : ''};
    box-sizing: border-box ${!isPreview ? '!important' : ''};
    vertical-align: top ${!isPreview ? '!important' : ''};
  `.replace(/\s+/g, ' ').trim();

  let headerElement = '';
  const defaultLabel = '\u4ee3\u7801';

  if (safeCodeTheme.hasHeader) {
    let headerContent;

    if (safeCodeTheme.id === 'mac') {
      const trafficLightSize = 12;
      const labelSize = Math.max(11, Math.round(baseFontSize * 0.75));
      const spacing = 6;
      headerContent = `<span class="mac-traffic-light-red" style="color: #ff5f56 !important; margin-right: ${spacing}px !important; font-size: ${trafficLightSize}px !important; line-height: 1 !important; display: inline !important; width: auto !important; height: auto !important;">\u25cf</span><span class="mac-traffic-light-yellow" style="color: #ffbd2e !important; margin-right: ${spacing}px !important; font-size: ${trafficLightSize}px !important; line-height: 1 !important; display: inline !important; width: auto !important; height: auto !important;">\u25cf</span><span class="mac-traffic-light-green" style="color: #27ca3f !important; margin-right: ${spacing * 2}px !important; font-size: ${trafficLightSize}px !important; line-height: 1 !important; display: inline !important; width: auto !important; height: auto !important;">\u25cf</span><span class="mac-code-label" style="font-size: ${labelSize}px !important; color: #8b949e !important; line-height: 1 !important; display: inline !important;">${language || 'code'}</span>`;
    } else {
      headerContent = safeCodeTheme.headerContent.replace(defaultLabel, language || defaultLabel);
    }

    let protectedHeaderStyle = !isPreview
      ? safeCodeTheme.headerStyle.replace(/line-height:\s*[\d.]+;?/g, 'line-height: 1.2 !important;') + ' min-height: auto !important; height: auto !important;'
      : safeCodeTheme.headerStyle;

    if (safeCodeTheme.id === 'mac') {
      const headerPadding = 12;
      protectedHeaderStyle = protectedHeaderStyle.replace(/padding:\s*[^;]+;/g, `padding: ${headerPadding}px 20px;`);
    }

    headerElement = `
      <div style="${protectedHeaderStyle}">
        ${headerContent}
      </div>
    `.replace(/\s+/g, ' ').trim();
  }

  const syntaxProtectionCSS = safeCodeTheme.syntaxHighlight ? `
    <style>
      .syntax-keyword, .syntax-keyword font { color: ${safeCodeTheme.syntaxHighlight.keyword} !important; }
      .syntax-string, .syntax-string font { color: ${safeCodeTheme.syntaxHighlight.string} !important; }
      .syntax-comment, .syntax-comment font { color: ${safeCodeTheme.syntaxHighlight.comment} !important; }
      .syntax-number, .syntax-number font { color: ${safeCodeTheme.syntaxHighlight.number} !important; }
      .syntax-function, .syntax-function font { color: ${safeCodeTheme.syntaxHighlight.function} !important; }

      [data-syntax="keyword"], [data-syntax="keyword"] font { color: ${safeCodeTheme.syntaxHighlight.keyword} !important; }
      [data-syntax="string"], [data-syntax="string"] font { color: ${safeCodeTheme.syntaxHighlight.string} !important; }
      [data-syntax="comment"], [data-syntax="comment"] font { color: ${safeCodeTheme.syntaxHighlight.comment} !important; }
      [data-syntax="number"], [data-syntax="number"] font { color: ${safeCodeTheme.syntaxHighlight.number} !important; }
      [data-syntax="function"], [data-syntax="function"] font { color: ${safeCodeTheme.syntaxHighlight.function} !important; }

      .hljs.code__pre,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"],
      div[style*="overflow-x: auto"] {
        scrollbar-width: thin !important;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent !important;
      }

      .hljs.code__pre::-webkit-scrollbar,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar,
      div[style*="overflow-x: auto"]::-webkit-scrollbar {
        height: 8px !important;
        background: transparent !important;
      }

      .hljs.code__pre::-webkit-scrollbar-thumb,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb,
      div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3) !important;
        border-radius: 4px !important;
        border: none !important;
      }

      .hljs.code__pre::-webkit-scrollbar-thumb:hover,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb:hover,
      div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5) !important;
      }

      .hljs.code__pre::-webkit-scrollbar-track,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar-track,
      div[style*="overflow-x: auto"]::-webkit-scrollbar-track {
        background: transparent !important;
      }
    </style>
  ` : `
    <style>
      .hljs.code__pre,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"],
      div[style*="overflow-x: auto"] {
        scrollbar-width: thin !important;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent !important;
      }

      .hljs.code__pre::-webkit-scrollbar,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar,
      div[style*="overflow-x: auto"]::-webkit-scrollbar {
        height: 8px !important;
        background: transparent !important;
      }

      .hljs.code__pre::-webkit-scrollbar-thumb,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb,
      div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3) !important;
        border-radius: 4px !important;
        border: none !important;
      }

      .hljs.code__pre::-webkit-scrollbar-thumb:hover,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb:hover,
      div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5) !important;
      }

      .hljs.code__pre::-webkit-scrollbar-track,
      pre[style*="overflow-x: auto"] > div[style*="overflow-x: auto"]::-webkit-scrollbar-track,
      div[style*="overflow-x: auto"]::-webkit-scrollbar-track {
        background: transparent !important;
      }
    </style>
  `;

  if (isPreview) {
    if (safeCodeTheme.hasHeader) {
      return `${syntaxProtectionCSS}<pre class="hljs code__pre" style="${preStyle}">${headerElement}<div style="${scrollAreaStyle}"><code style="${codeStyle}">${highlightedContent}</code></div></pre>`;
    }
    return `${syntaxProtectionCSS}<pre class="hljs code__pre" style="${preStyle}"><div style="${scrollAreaStyle}"><code style="${codeStyle}">${highlightedContent}</code></div></pre>`;
  }

  const expanderOpen = `<span style="${expanderStyle}">`;
  const expanderClose = `</span>`;
  if (safeCodeTheme.hasHeader) {
    return `${syntaxProtectionCSS}<pre class="hljs code__pre" style="${preStyle}">${headerElement}<div style="${scrollAreaStyle}">${expanderOpen}<code style="${codeStyleCopy}">${contentForCopy}</code>${expanderClose}</div></pre>`;
  }
  return `${syntaxProtectionCSS}<pre class="hljs code__pre" style="${preStyle}"><div style="${scrollAreaStyle}">${expanderOpen}<code style="${codeStyleCopy}">${contentForCopy}</code>${expanderClose}</div></pre>`;
}
