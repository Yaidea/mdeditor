/**
 * @file src/core/markdown/code-formatter.js
 * @description 代码高亮处理器
 *
 * 专门处理代码块的语法高亮，支持多种编程语言和主题。
 */

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
