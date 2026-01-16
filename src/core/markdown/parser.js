/**
 * @file src/core/markdown/parser.js
 * @description Markdown 解析器统一入口
 *
 * 简化解析流程，移除过度抽象。
 */

import {
  EDITOR_OPERATIONS,
  MARKDOWN_SYNTAX,
  REGEX_PATTERNS,
  SOCIAL_FORMATTING
} from '../../config/constants/index.js';
import { defaultColorTheme } from '../../config/theme-presets.js';
import { getThemesSafe } from '../../shared/utils/theme.js';
import { calculateLineHeight } from '../../shared/utils/typography.js';
import {
  cleanReferenceLinks,
  formatInline,
  processInlineFormatsWithoutEscapes
} from './inline-formatter.js';
import { formatCodeBlock } from './code-formatter.js';
import { SocialStyler } from './social-adapters.js';
import { renderMath } from './math/index.js';

function getBaseFontSize(fontSettings) {
  return fontSettings?.fontSize || 16;
}

function getLineHeightForFont(fontSize) {
  if (fontSize <= 14) return '1.7';
  if (fontSize <= 18) return '1.6';
  return '1.5';
}

function isCodeBlockFence(trimmedLine) {
  return trimmedLine.startsWith(MARKDOWN_SYNTAX.CODE_BLOCK);
}

function isHorizontalRule(trimmedLine) {
  return REGEX_PATTERNS.HORIZONTAL_RULE.test(trimmedLine);
}

function isHeading(trimmedLine) {
  return REGEX_PATTERNS.HEADING.test(trimmedLine);
}

function isBlockquoteLine(trimmedLine) {
  return trimmedLine.startsWith('>');
}

function isMathBlockStart(trimmedLine) {
  return trimmedLine === '$$';
}

function isMathBlockEnd(trimmedLine) {
  return trimmedLine === '$$';
}

function createContext({ colorTheme, codeTheme, themeSystem, fontSettings, options }) {
  return {
    currentTheme: colorTheme || defaultColorTheme,
    codeTheme,
    themeSystem,
    fontSettings,
    options: {
      isPreview: Boolean(options?.isPreview),
      cleanHtml: Boolean(options?.cleanHtml)
    },
    inCodeBlock: false,
    codeBlockContent: '',
    codeBlockLanguage: '',
    inBlockquote: false,
    blockquoteContent: [],
    inMathBlock: false,
    mathBlockContent: ''
  };
}

function startCodeBlock(context, language = '') {
  context.inCodeBlock = true;
  context.codeBlockContent = '';
  context.codeBlockLanguage = language;
}

function endCodeBlock(context) {
  const blockInfo = {
    content: context.codeBlockContent,
    language: context.codeBlockLanguage
  };

  context.inCodeBlock = false;
  context.codeBlockContent = '';
  context.codeBlockLanguage = '';

  return blockInfo;
}

function addCodeBlockLine(context, line) {
  context.codeBlockContent += line + '\n';
}

function startMathBlock(context) {
  context.inMathBlock = true;
  context.mathBlockContent = '';
}

function endMathBlock(context) {
  const latex = context.mathBlockContent.trim();
  context.inMathBlock = false;
  context.mathBlockContent = '';
  return latex;
}

function addMathBlockLine(context, line) {
  if (context.mathBlockContent) {
    context.mathBlockContent += '\n';
  }
  context.mathBlockContent += line;
}

function formatMathBlock(latex, theme, fontSettings = null) {
  const html = renderMath(latex, true);
  const fontSize = fontSettings?.fontSize || 16;
  return `<div style="margin: 16px 0; text-align: center; font-size: ${fontSize}px; overflow-x: auto;">${html}</div>`;
}

function startBlockquote(context) {
  context.inBlockquote = true;
  context.blockquoteContent = [];
}

function addBlockquoteLine(context, line) {
  context.blockquoteContent.push(line);
}

function endBlockquote(context) {
  const content = [...context.blockquoteContent];
  context.inBlockquote = false;
  context.blockquoteContent = [];
  if (content.length === 0) return '';
  return formatBlockquote(content, context.currentTheme, getBaseFontSize(context.fontSettings));
}

const LIST_TYPES = {
  UNORDERED: 'unordered',
  ORDERED: 'ordered',
  TASK: 'task',
  NONE: 'none'
};

class ListProcessor {
  constructor() {
    this.reset();
    this.BASE_INDENT = 16;
    this.ORDERED_BASE_INDENT = 16;
    this.NESTED_INDENT = 20;
    this.LIST_MARGIN_TOP = 8;
    this.LIST_MARGIN_BOTTOM = 8;
  }

  reset() {
    this.currentDepth = 0;
    this.lastListType = LIST_TYPES.NONE;
  }

  parseListItem(line) {
    const listMatch = line.match(/^(\s*)([*\-+]|\d+\.)\s+(.+)$/);
    if (!listMatch) {
      return null;
    }

    const [, indent, marker, content] = listMatch;
    const depth = Math.floor(indent.length / EDITOR_OPERATIONS.LIST_INDENT.SPACES_PER_LEVEL);
    const isOrdered = /^\d+\./.test(marker);

    const taskMatch = content.match(/^\[([ x])\]\s+(.+)$/);
    if (taskMatch) {
      const [, checked, taskText] = taskMatch;
      return {
        type: LIST_TYPES.TASK,
        depth,
        marker,
        content: taskText,
        isChecked: checked === 'x',
        originalContent: content,
        indent: indent.length
      };
    }

    return {
      type: isOrdered ? LIST_TYPES.ORDERED : LIST_TYPES.UNORDERED,
      depth,
      marker,
      content,
      isChecked: false,
      originalContent: content,
      indent: indent.length
    };
  }

  formatListItem(listItem, theme, fontSettings = null) {
    const { type } = listItem;

    switch (type) {
      case LIST_TYPES.TASK:
        return this.formatTaskListItem(listItem, theme, fontSettings);
      case LIST_TYPES.ORDERED:
        return this.formatOrderedListItem(listItem, theme, fontSettings);
      case LIST_TYPES.UNORDERED:
        return this.formatUnorderedListItem(listItem, theme, fontSettings);
      default:
        return '';
    }
  }

  formatTaskListItem(listItem, theme, fontSettings = null) {
    const { depth, content, isChecked } = listItem;

    const { fontSize, lineHeight } = this.getFontSettings(fontSettings);

    const formattedTaskText = formatInline(content, theme, fontSize);
    const marginLeft = this.BASE_INDENT + (depth * this.NESTED_INDENT);

    const checkboxSize = Math.max(14, Math.round(fontSize * 0.9));
    const checkboxFontSize = Math.max(10, Math.round(checkboxSize * 0.7));

    let checkboxHtml;
    if (isChecked) {
      checkboxHtml = `<span style="display: inline-flex; align-items: center; justify-content: center; width: ${checkboxSize}px; height: ${checkboxSize}px; background-color: ${theme.primary}; border-radius: 3px; margin-right: 8px; color: white; font-size: ${checkboxFontSize}px; font-weight: bold; vertical-align: middle; flex-shrink: 0;">${SOCIAL_FORMATTING.LIST_SYMBOLS.TASK_CHECKED}</span>`;
    } else {
      checkboxHtml = `<span style="display: inline-block; width: ${checkboxSize}px; height: ${checkboxSize}px; background-color: ${theme.bgPrimary || '#ffffff'}; border: 2px solid ${theme.borderMedium || '#8b949e'}; border-radius: 3px; margin-right: 8px; vertical-align: middle; flex-shrink: 0;"></span>`;
    }

    const textStyle = isChecked
      ? `text-decoration: line-through; color: ${theme.textSecondary || '#656d76'}; opacity: 0.8;`
      : `color: ${theme.textPrimary || '#24292f'};`;

    return `<p style="margin-left: ${marginLeft}px; margin-top: ${this.LIST_MARGIN_TOP}px; margin-bottom: ${this.LIST_MARGIN_BOTTOM}px; font-size: ${fontSize}px; line-height: ${lineHeight}; display: flex; align-items: center;">${checkboxHtml}<span style="${textStyle}">${formattedTaskText}</span></p>`;
  }

  getOrderedListMarker(num, depth) {
    const number = parseInt(num);

    switch (depth % 4) {
      case 0:
        return `${number}.`;
      case 1:
        return `${this.numberToLowerAlpha(number)}.`;
      case 2:
        return `${this.numberToLowerRoman(number)}.`;
      case 3:
        return `(${number})`;
      default:
        return `${number}.`;
    }
  }

  numberToLowerAlpha(num) {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(97 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result || 'a';
  }

  numberToLowerRoman(num) {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const literals = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i'];

    let result = '';
    let i = 0;

    while (num > 0) {
      if (num >= values[i]) {
        result += literals[i];
        num -= values[i];
      } else {
        i++;
      }
    }

    return result;
  }

  formatOrderedListItem(listItem, theme, fontSettings = null) {
    const { depth, marker, content } = listItem;

    const num = marker.replace('.', '');
    const displayMarker = this.getOrderedListMarker(num, depth);

    const colors = this.getListColors(theme);
    const color = colors[Math.min(depth, colors.length - 1)];
    const marginLeft = this.ORDERED_BASE_INDENT + (depth * this.NESTED_INDENT);

    const { fontSize, lineHeight } = this.getFontSettings(fontSettings);

    const formattedContent = formatInline(content, theme, fontSize);

    return `<p style="margin-left: ${marginLeft}px; margin-top: ${this.LIST_MARGIN_TOP}px; margin-bottom: ${this.LIST_MARGIN_BOTTOM}px; font-size: ${fontSize}px; line-height: ${lineHeight};"><span style="color: ${color}; font-weight: 600; font-size: ${fontSize}px; margin-right: 8px; display: inline-block;">${displayMarker}</span>${formattedContent}</p>`;
  }

  formatUnorderedListItem(listItem, theme, fontSettings = null) {
    const { depth, content } = listItem;

    const symbols = SOCIAL_FORMATTING.LIST_SYMBOLS.UNORDERED;
    const displayMarker = symbols[Math.min(depth, symbols.length - 1)];

    const colors = this.getListColors(theme);
    const color = colors[Math.min(depth, colors.length - 1)];
    const marginLeft = this.BASE_INDENT + (depth * this.NESTED_INDENT);

    const { fontSize, lineHeight } = this.getFontSettings(fontSettings);

    const formattedContent = formatInline(content, theme, fontSize);

    const symbolFontSize = this.getSymbolFontSize(depth, displayMarker, fontSize);
    const symbolScale = this.getSymbolScale(displayMarker);
    const fontWeight = depth === 0 ? '600' : '500';

    return `<p style="margin-left: ${marginLeft}px; margin-top: ${this.LIST_MARGIN_TOP}px; margin-bottom: ${this.LIST_MARGIN_BOTTOM}px; font-size: ${fontSize}px; line-height: ${lineHeight};"><span style="color: ${color}; font-weight: ${fontWeight}; font-size: ${symbolFontSize}px; display: inline-block; transform: scale(${symbolScale}); transform-origin: center; margin-right: 8px;">${displayMarker}</span>${formattedContent}</p>`;
  }

  processListLine(line, theme, fontSettings = null) {
    const listItem = this.parseListItem(line);

    if (!listItem) {
      return {
        isListItem: false,
        result: '',
        shouldContinue: false
      };
    }

    const result = this.formatListItem(listItem, theme, fontSettings);
    this.currentDepth = listItem.depth;
    this.lastListType = listItem.type;

    return {
      isListItem: true,
      result,
      shouldContinue: true,
      listItem
    };
  }

  getListColors(theme) {
    if (theme.primary) {
      const primaryColor = theme.primary;

      return [
        primaryColor,
        this.adjustColorBrightness(primaryColor, 0.7),
        this.adjustColorBrightness(primaryColor, 0.5),
        this.adjustColorBrightness(primaryColor, 0.3)
      ];
    }

    if (theme.listColors && Array.isArray(theme.listColors) && theme.listColors.length > 0) {
      return theme.listColors;
    }

    const fallbackPrimary = theme.primary || '#2563eb';
    return [
      fallbackPrimary,
      this.adjustColorBrightness(fallbackPrimary, 0.7),
      this.adjustColorBrightness(fallbackPrimary, 0.5),
      this.adjustColorBrightness(fallbackPrimary, 0.3)
    ];
  }

  adjustColorBrightness(color, factor) {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      const newR = Math.round(r * factor);
      const newG = Math.round(g * factor);
      const newB = Math.round(b * factor);

      const toHex = (n) => {
        const hexValue = n.toString(16);
        return hexValue.length === 1 ? '0' + hexValue : hexValue;
      };

      return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }

    return color;
  }

  getFontSettings(fontSettings = null) {
    const fontSize = fontSettings?.fontSize || 16;
    const lineHeight = getLineHeightForFont(fontSize);
    return { fontSize, lineHeight };
  }

  getSymbolFontSize(_depth, _symbol, baseFontSize = 16) {
    const symbolRatio = 0.88;
    const calculatedSize = Math.round(baseFontSize * symbolRatio);
    const minSize = Math.max(12, Math.round(baseFontSize * 0.75));

    return Math.max(minSize, calculatedSize);
  }

  getSymbolScale(symbol) {
    const symbolScales = {
      '●': 1.0,
      '○': 0.5,
      '▪': 1.2,
      '▫': 0.8,
      '‣': 1.0,
      '⁃': 1.0
    };

    return symbolScales[symbol] || 1.0;
  }
}

const TABLE_STATES = {
  NONE: 'none',
  DETECTING: 'detecting',
  PROCESSING: 'processing',
  COMPLETE: 'complete'
};

const TABLE_ROW_TYPES = {
  HEADER: 'header',
  SEPARATOR: 'separator',
  DATA: 'data',
  INVALID: 'invalid'
};

class TableProcessor {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = TABLE_STATES.NONE;
    this.rows = [];
    this.currentRowIndex = 0;
  }

  isPotentialTableRow(line, trimmedLine) {
    return trimmedLine.includes(MARKDOWN_SYNTAX.TABLE_SEPARATOR) &&
           !this.isSeparatorRow(trimmedLine);
  }

  isSeparatorRow(trimmedLine) {
    return REGEX_PATTERNS.TABLE_SEPARATOR.test(trimmedLine);
  }

  getRowType(line, trimmedLine, rowIndex) {
    if (this.isSeparatorRow(trimmedLine)) {
      return TABLE_ROW_TYPES.SEPARATOR;
    }

    if (this.isPotentialTableRow(line, trimmedLine)) {
      return rowIndex === 0 ? TABLE_ROW_TYPES.HEADER : TABLE_ROW_TYPES.DATA;
    }

    return TABLE_ROW_TYPES.INVALID;
  }

  shouldStartTable(line, trimmedLine, lines, currentIndex) {
    if (!this.isPotentialTableRow(line, trimmedLine)) {
      return false;
    }

    let nextLineIndex = currentIndex + 1;
    while (nextLineIndex < lines.length && lines[nextLineIndex].trim() === '') {
      nextLineIndex++;
    }

    if (nextLineIndex < lines.length) {
      const nextLine = lines[nextLineIndex].trim();
      return this.isSeparatorRow(nextLine);
    }

    return false;
  }

  processTableRow(line, trimmedLine, lines, currentIndex, theme = {}, fontSettings = null) {
    const rowType = this.getRowType(line, trimmedLine, this.rows.length);

    switch (this.state) {
      case TABLE_STATES.NONE:
        if (this.shouldStartTable(line, trimmedLine, lines, currentIndex)) {
          this.state = TABLE_STATES.DETECTING;
          this.rows = [line];
          return { shouldContinue: true, result: '', tableComplete: false };
        }
        return { shouldContinue: false, result: '', tableComplete: false };

      case TABLE_STATES.DETECTING:
        if (rowType === TABLE_ROW_TYPES.SEPARATOR) {
          this.state = TABLE_STATES.PROCESSING;
          this.rows.push(line);
          return { shouldContinue: true, result: '', tableComplete: false };
        }
        this.reset();
        return { shouldContinue: false, result: '', tableComplete: false };

      case TABLE_STATES.PROCESSING:
        if (rowType === TABLE_ROW_TYPES.DATA) {
          this.rows.push(line);
          return { shouldContinue: true, result: '', tableComplete: false };
        }
        const result = this.formatTable(theme, fontSettings);
        this.reset();
        return { shouldContinue: false, result, tableComplete: true, reprocessLine: true };

      default:
        this.reset();
        return { shouldContinue: false, result: '', tableComplete: false };
    }
  }

  formatTable(theme = {}, fontSettings = null) {
    if (this.rows.length < 2) {
      return '';
    }

    const headerRow = this.rows[0];
    const alignmentRow = this.rows[1];
    const bodyRows = this.rows.slice(2);

    const alignments = this.parseAlignments(alignmentRow);

    const fontSize = fontSettings?.fontSize || 16;
    const lineHeight = getLineHeightForFont(fontSize);

    let tableHtml = `<table style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: ${fontSize}px; line-height: ${lineHeight};">`;

    tableHtml += this.formatTableHeader(headerRow, alignments, theme, fontSettings);

    if (bodyRows.length > 0) {
      tableHtml += this.formatTableBody(bodyRows, alignments, theme, fontSettings);
    }

    tableHtml += '</table>';
    return tableHtml;
  }

  parseAlignments(alignmentRow) {
    return alignmentRow.split(MARKDOWN_SYNTAX.TABLE_SEPARATOR)
      .map(cell => {
        const trimmed = cell.trim();
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
          return 'center';
        } else if (trimmed.endsWith(':')) {
          return 'right';
        }
        return 'left';
      })
      .slice(1, -1);
  }

  formatTableHeader(headerRow, alignments, theme, fontSettings = null) {
    const headerCells = headerRow.split(MARKDOWN_SYNTAX.TABLE_SEPARATOR)
      .map(cell => cell.trim())
      .slice(1, -1);

    if (headerCells.length === 0) {
      return '';
    }

    const fontSize = fontSettings?.fontSize || 16;

    let html = '<thead><tr style="background-color: #f6f8fa;">';
    headerCells.forEach((cell, index) => {
      const align = alignments[index] || 'left';
      const formattedCell = formatInline(cell, theme, fontSize);
      html += `<th style="border: 1px solid #d0d7de; padding: 8px 12px; text-align: ${align}; font-weight: 600; color: #24292e; font-size: ${fontSize}px;">${formattedCell}</th>`;
    });
    html += '</tr></thead>';
    return html;
  }

  formatTableBody(bodyRows, alignments, theme, fontSettings = null) {
    const fontSize = fontSettings?.fontSize || 16;

    let html = '<tbody>';
    bodyRows.forEach(row => {
      const cells = row.split(MARKDOWN_SYNTAX.TABLE_SEPARATOR)
        .map(cell => cell.trim())
        .slice(1, -1);

      if (cells.length > 0) {
        html += '<tr>';
        cells.forEach((cell, index) => {
          const align = alignments[index] || 'left';
          const formattedCell = formatInline(cell, theme, fontSize);
          html += `<td style="border: 1px solid #d0d7de; padding: 8px 12px; text-align: ${align}; color: #24292e; font-size: ${fontSize}px;">${formattedCell}</td>`;
        });
        html += '</tr>';
      }
    });
    html += '</tbody>';
    return html;
  }

  isProcessingTable() {
    return this.state !== TABLE_STATES.NONE;
  }

  completeTable(theme, fontSettings = null) {
    const result = this.formatTable(theme, fontSettings);
    this.reset();
    return result;
  }
}

function formatInlineTextInternal(text, theme = defaultColorTheme, baseFontSize = 16) {
  if (!text) return '';
  return processInlineFormatsWithoutEscapes(text, theme, baseFontSize);
}

function getBlockquoteStyles(baseFontSize = 16) {
  return {
    level1: {
      margin: '24px 0',
      padding: '18px 24px',
      fontSize: `${baseFontSize}px`,
      boxShadow: '0 4px 16px'
    },
    level2: {
      margin: '12px 0 12px 0px',
      padding: '12px 18px',
      fontSize: `${Math.round(baseFontSize * 0.94)}px`,
      boxShadow: '0 2px 8px'
    },
    level3: {
      margin: '8px 0 8px 0px',
      padding: '8px 12px',
      fontSize: `${Math.round(baseFontSize * 0.88)}px`,
      boxShadow: '0 1px 4px'
    },
    default: {
      margin: '6px 0 6px 0px',
      padding: '6px 10px',
      fontSize: `${Math.round(baseFontSize * 0.81)}px`,
      boxShadow: '0 1px 2px'
    }
  };
}

function generateBlockquoteStyle(theme, level, baseFontSize = 16) {
  const blockquoteStyles = getBlockquoteStyles(baseFontSize);
  const styleConfig = blockquoteStyles[`level${level}`] || blockquoteStyles.default;
  const shadowOpacity = level <= 3 ? ['1A', '14', '0F'][level - 1] || '0A' : '0A';

  return `
    border-left: 4px solid ${theme.primary};
    background: linear-gradient(135deg, ${theme.primary}14 0%, ${theme.primary}0A 50%, ${theme.primary}14 100%);
    margin: ${styleConfig.margin};
    padding: ${styleConfig.padding};
    border-radius: 6px;
    position: relative;
    box-shadow: ${styleConfig.boxShadow} ${theme.primary}${shadowOpacity};
    color: #1f2328;
    font-style: italic;
    line-height: 1.6;
    font-size: ${styleConfig.fontSize};
  `.replace(/\s+/g, ' ').trim();
}

function processQuoteLine(line) {
  const trimmedLine = line.trim();

  if (!trimmedLine.startsWith('>')) {
    return { isQuote: false, content: line, level: 0 };
  }

  let level = 0;
  let content = trimmedLine;

  while (content.startsWith('>')) {
    level++;
    content = content.substring(1).trim();
  }

  return { isQuote: true, content, level };
}

function processParagraphs(lines, theme, baseFontSize = 16) {
  const content = lines.join('\n').trim();
  if (!content) return '';

  const paragraphs = content.split(/\n{2,}/);
  const lineHeight = getLineHeightForFont(baseFontSize);

  return paragraphs.map(p => {
    const formattedP = formatInlineTextInternal(p.replace(/\n/g, '<br>'), theme, baseFontSize);
    return `<p style="margin: 8px 0; line-height: ${lineHeight}; font-size: ${baseFontSize}px;">${formattedP}</p>`;
  }).join('');
}

function buildNestedQuotes(lines, level, theme, baseFontSize = 16) {
  if (!lines || lines.length === 0) return '';

  let html = '';
  let currentBlockLines = [];
  let childLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const { isQuote, content, level: lineLevel } = processQuoteLine(line);

    if (isQuote && lineLevel > 1) {
      if (currentBlockLines.length > 0) {
        html += processParagraphs(currentBlockLines, theme, baseFontSize);
        currentBlockLines = [];
      }
      childLines.push('>' + content);
    } else if (isQuote) {
      if (childLines.length > 0) {
        html += buildNestedQuotes(childLines, level + 1, theme, baseFontSize);
        childLines = [];
      }
      currentBlockLines.push(content);
    } else {
      currentBlockLines.push(line);
    }
  }

  if (currentBlockLines.length > 0) {
    html += processParagraphs(currentBlockLines, theme, baseFontSize);
  }
  if (childLines.length > 0) {
    html += buildNestedQuotes(childLines, level + 1, theme, baseFontSize);
  }

  const style = generateBlockquoteStyle(theme, level, baseFontSize);
  return `<blockquote style="${style}">${html}</blockquote>`;
}

function formatBlockquote(contentLines, theme = defaultColorTheme, baseFontSize = 16) {
  return buildNestedQuotes(contentLines, 1, theme, baseFontSize);
}

function formatH1(formattedText, theme, fontSettings = null, options = {}) {
  const isPreview = options?.isPreview || false;

  if (isPreview) {
    return `<h1>${formattedText}</h1>`;
  }

  const baseFontSize = fontSettings?.fontSize || 16;
  const h1FontSize = Math.round(baseFontSize * 2.2);

  const h1Style = `
    margin: 1.8em 0 1.5em 0;
    font-weight: 700;
    font-size: ${h1FontSize}px;
    line-height: 1.3;
    text-align: center;
    background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: ${theme.textPrimary};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
  `.replace(/\s+/g, ' ').trim();

  const underlineStyle = `
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, transparent 0%, ${theme.primary} 20%, ${theme.primary} 80%, transparent 100%);
    border-radius: 2px;
    box-shadow: 0 2px 8px ${theme.primary}40;
    display: block;
    margin: 0 auto;
  `.replace(/\s+/g, ' ').trim();

  return `<h1 style="${h1Style}"><span>${formattedText}</span><span style="${underlineStyle}"></span></h1>`;
}

function formatH2(formattedText, theme, fontSettings = null, options = {}) {
  const isPreview = options?.isPreview || false;

  if (isPreview) {
    return `<h2>${formattedText}</h2>`;
  }

  const baseFontSize = fontSettings?.fontSize || 16;
  const h2FontSize = Math.round(baseFontSize * 1.5);

  const h2Style = `
    margin-top: 2rem;
    margin-bottom: 1.5rem;
    font-weight: 600;
    font-size: ${h2FontSize}px;
    line-height: 1.4;
    color: ${theme.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5em;
  `.replace(/\s+/g, ' ').trim();

  const borderStyle = `
    width: 5px;
    height: 1.1em;
    background: linear-gradient(180deg, ${theme.primary}20 0%, ${theme.primary}60 15%, ${theme.primary} 35%, ${theme.primary} 65%, ${theme.primary}60 85%, ${theme.primary}20 100%);
    border-radius: 3px;
    box-shadow: 0 0 6px ${theme.primary}25;
    display: inline-block;
    flex-shrink: 0;
  `.replace(/\s+/g, ' ').trim();

  return `<h2 style="${h2Style}"><span style="${borderStyle}"></span><span>${formattedText}</span></h2>`;
}

function formatOtherHeading(level, formattedText, theme, fontSettings = null) {
  const baseFontSize = fontSettings?.fontSize || 16;

  const fontMultipliers = {
    3: 1.3,
    4: 1.1,
    5: 1.0,
    6: 0.9
  };
  const multiplier = fontMultipliers[level] || 1.0;
  const fontSize = Math.round(baseFontSize * multiplier);

  const titleStyle = `
    font-size: ${fontSize}px;
    color: ${theme.textPrimary};
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    line-height: 1.25;
  `.replace(/\s+/g, ' ').trim();

  return `<h${level} style="${titleStyle}">${formattedText}</h${level}>`;
}

function formatHeading(trimmedLine, theme, fontSettings = null, options = {}) {
  const level = trimmedLine.match(/^#+/)[0].length;
  const text = trimmedLine.replace(/^#+\s*/, '');
  const fontSize = fontSettings?.fontSize || 16;
  const formattedText = formatInline(text, theme, fontSize);

  if (level === 1) {
    return formatH1(formattedText, theme, fontSettings, options);
  }
  if (level === 2) {
    return formatH2(formattedText, theme, fontSettings, options);
  }
  return formatOtherHeading(level, formattedText, theme, fontSettings);
}

function formatHorizontalRule(theme) {
  const currentTheme = theme || defaultColorTheme;
  return `<hr style="height: 2px; background: linear-gradient(to right, transparent, ${currentTheme.primary}, transparent); border: none; margin: 32px 0;">`;
}

function formatParagraph(trimmedLine, theme, fontSettings = null) {
  const fontSize = fontSettings?.fontSize || 16;
  const lineHeight = getLineHeightForFont(fontSize);
  const formattedText = processInlineFormatsWithoutEscapes(trimmedLine, theme, fontSize);
  return `<p style="margin: 12px 0; line-height: ${lineHeight}; font-size: ${fontSize}px; font-weight: normal;">${formattedText}</p>`;
}

function ensureSemiColon(style) {
  const trimmed = style.trim();
  if (!trimmed) return '';
  return /;\s*$/.test(trimmed) ? trimmed : `${trimmed};`;
}

function setOrReplaceDecl(style, prop, value) {
  const re = new RegExp(`${prop}\s*:\s*[^;]*;?`, 'i');
  const decl = `${prop}: ${value};`;
  if (re.test(style)) return style.replace(re, decl);
  const withSemi = ensureSemiColon(style);
  return `${withSemi} ${decl}`.trim();
}

function rewriteTagStyle(html, tag, mutator) {
  // 使用 \\b 确保只匹配独立的标签名，避免 <p> 匹配到 <path> 等
  const re = new RegExp(`<${tag}\\b([^>]*?)style="([^"]*)"([^>]*)>`, 'gi');
  return (html || '').replace(re, (_match, pre, style, post) => {
    const newStyle = mutator(style || '');
    return `<${tag}${pre}style="${newStyle}"${post}>`;
  });
}

function applyThemeStyles(html, options = {}) {
  if (!html) return '';
  const primary = normalizeColor(options?.colorTheme?.primary);

  const applyBlockquoteTheme = (style) => {
    let out = style || '';
    out = setOrReplaceDecl(out, 'border-left', `4px solid ${primary}`);
    const gradient = `linear-gradient(135deg, ${primary}14 0%, ${primary}0A 50%, ${primary}14 100%)`;
    out = setOrReplaceDecl(out, 'background', gradient);
    return out.replace(/\s+/g, ' ').trim();
  };

  let result = rewriteTagStyle(html, 'blockquote', applyBlockquoteTheme);

  const applyTableTheme = (style) => {
    let out = style || '';
    out = setOrReplaceDecl(out, 'border-collapse', 'collapse');
    out = setOrReplaceDecl(out, 'width', '100%');
    if (!/margin\s*:/i.test(out)) out = ensureSemiColon(out) + ' margin: 16px 0;';
    return out.replace(/\s+/g, ' ').trim();
  };
  const applyCellTheme = (style) => {
    let out = style || '';
    out = setOrReplaceDecl(out, 'border', '1px solid #d0d7de');
    out = setOrReplaceDecl(out, 'padding', '8px 12px');
    out = setOrReplaceDecl(out, 'color', '#24292e');
    return out.replace(/\s+/g, ' ').trim();
  };

  result = rewriteTagStyle(result, 'table', applyTableTheme);
  result = rewriteTagStyle(result, 'th', applyCellTheme);
  result = rewriteTagStyle(result, 'td', applyCellTheme);

  if (!options?.isPreview) {
    const applyH1Theme = (style) => {
      let out = style || '';
      const gradient = `linear-gradient(135deg, ${primary} 0%, ${primary} 100%)`;
      out = setOrReplaceDecl(out, 'background', gradient);
      return out.replace(/\s+/g, ' ').trim();
    };
    result = rewriteTagStyle(result, 'h1', applyH1Theme);
  }

  return result;
}

function normalizeColor(color, fallback = '#5865F2') {
  if (!color || typeof color !== 'string') return fallback;
  return color;
}

function ensureSemicolon(style) {
  const s = String(style || '').trim();
  if (!s) return '';
  return /;\s*$/.test(s) ? s : `${s};`;
}

function setOrReplace(style, prop, value) {
  const re = new RegExp(`${prop}\s*:\s*[^;]*;?`, 'i');
  const decl = `${prop}: ${value};`;
  if (re.test(style)) return style.replace(re, decl);
  const withSemi = ensureSemicolon(style);
  return `${withSemi} ${decl}`.trim();
}

function applyFontStyles(html, options = {}) {
  if (!html) return '';
  if (options?.isPreview) return html;
  const fs = options.fontSettings || {};
  const fontSize = Number(fs.fontSize) || 16;
  const letterSpacing = typeof fs.letterSpacing === 'number' ? fs.letterSpacing : 0;

  let lineHeight;
  if (typeof fs.lineHeight === 'number' && isFinite(fs.lineHeight) && fs.lineHeight > 0) {
    lineHeight = String(fs.lineHeight);
  } else {
    lineHeight = calculateLineHeight(fontSize);
  }

  const lineHeightCss = /[empx%]/i.test(String(lineHeight)) ? String(lineHeight) : String(lineHeight);

  const applyCommon = (style, base, extra = '') => {
    let out = style || '';
    out = setOrReplace(out, 'letter-spacing', `${letterSpacing}px`);
    const toPairs = (s) => String(s || '').split(';').map(x => x.trim()).filter(Boolean).map(d => d.split(':')).filter(p => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]);
    for (const [k, v] of toPairs(base)) out = setOrReplace(out, k, v);
    for (const [k, v] of toPairs(extra)) out = setOrReplace(out, k, v);
    return out.replace(/\s+/g, ' ').trim();
  };

  let result = html;

  // 注意：使用 \b 确保只匹配独立的 <p> 标签，避免匹配到 <path> 等标签
  result = result.replace(/<p\b(?![^>]*style=)/gi, `<p style="letter-spacing: ${letterSpacing}px; font-size: ${fontSize}px; line-height: ${lineHeightCss} !important; margin: 1.5em 8px; font-weight: 400;"`);
  result = rewriteTagStyle(result, 'p', (style) => applyCommon(style, `font-size: ${fontSize}px; line-height: ${lineHeightCss} !important;`, 'font-weight: 400;'));

  result = result.replace(/<li(?![^>]*style=)/gi, `<li style="letter-spacing: ${letterSpacing}px; font-size: ${fontSize}px; line-height: ${lineHeightCss} !important; font-weight: 400; margin: 0.5em 0;"`);
  result = rewriteTagStyle(result, 'li', (style) => applyCommon(style, `font-size: ${fontSize}px; line-height: ${lineHeightCss} !important;`, 'font-weight: 400;'));

  const h1Size = Math.round(fontSize * 2.2);
  const h2Size = Math.round(fontSize * 1.5);
  const h3Size = Math.round(fontSize * 1.3);
  const h4Size = Math.round(fontSize * 1.1);

  result = result.replace(/<h1(?![^>]*style=)/gi, `<h1 style="letter-spacing: ${letterSpacing}px; font-size: ${fontSize}px; line-height: 1.3em !important; font-weight: 700; margin: 1.8em 0 1.5em; text-align: center;"`);
  result = rewriteTagStyle(result, 'h1', (style) => {
    let out = style || '';
    out = setOrReplace(out, 'letter-spacing', `${letterSpacing}px`);
    if (!/font-size\s*:/i.test(out)) out = setOrReplace(out, 'font-size', `${h1Size}px`);
    if (!/line-height\s*:/i.test(out)) out = setOrReplace(out, 'line-height', '1.3em !important');
    if (!/font-weight\s*:/i.test(out)) out = setOrReplace(out, 'font-weight', '700');
    if (!/text-align\s*:/i.test(out)) out = setOrReplace(out, 'text-align', 'center');
    return out.replace(/\s+/g, ' ').trim();
  });

  result = result.replace(/<h2(?![^>]*style=)/gi, `<h2 style="letter-spacing: ${letterSpacing}px; font-size: ${h2Size}px; line-height: 1.4em !important; font-weight: 600; margin: 2em 0 1.5em;"`);
  result = rewriteTagStyle(result, 'h2', (style) => applyCommon(style, `font-size: ${h2Size}px; line-height: 1.4em !important;`, 'font-weight: 600;'));

  result = result.replace(/<h3(?![^>]*style=)/gi, `<h3 style="letter-spacing: ${letterSpacing}px; font-size: ${h3Size}px; line-height: ${lineHeightCss} !important; font-weight: 600; margin: 1.5em 0 1em;"`);
  result = rewriteTagStyle(result, 'h3', (style) => applyCommon(style, `font-size: ${h3Size}px; line-height: ${lineHeightCss} !important;`, 'font-weight: 600;'));

  result = result.replace(/<h4(?![^>]*style=)/gi, `<h4 style="letter-spacing: ${letterSpacing}px; font-size: ${h4Size}px; line-height: ${lineHeightCss} !important; font-weight: 600; margin: 1em 0 0.6em;"`);
  result = rewriteTagStyle(result, 'h4', (style) => applyCommon(style, `font-size: ${h4Size}px; line-height: ${lineHeightCss} !important;`, 'font-weight: 600;'));

  result = result.replace(/<ul(?![^>]*style=)/gi, `<ul style="letter-spacing: ${letterSpacing}px; font-size: ${fontSize}px; line-height: ${lineHeightCss} !important; margin: 1.5em 8px; padding-left: 25px; font-weight: 400;"`);
  result = rewriteTagStyle(result, 'ul', (style) => applyCommon(style, `font-size: ${fontSize}px; line-height: ${lineHeightCss} !important;`, 'font-weight: 400;'));

  result = result.replace(/<ol(?![^>]*style=)/gi, `<ol style="letter-spacing: ${letterSpacing}px; font-size: ${fontSize}px; line-height: ${lineHeightCss} !important; margin: 1.5em 8px; padding-left: 25px; font-weight: 400;"`);
  result = rewriteTagStyle(result, 'ol', (style) => applyCommon(style, `font-size: ${fontSize}px; line-height: ${lineHeightCss} !important;`, 'font-weight: 400;'));

  result = result.replace(/<blockquote(?![^>]*style=)/gi, `<blockquote style="letter-spacing: ${letterSpacing}px; font-size: ${fontSize}px; line-height: ${lineHeightCss} !important; margin: 1.5em 8px; font-weight: 400;"`);
  result = rewriteTagStyle(result, 'blockquote', (style) => applyCommon(style, `font-size: ${fontSize}px; line-height: ${lineHeightCss} !important;`, 'font-weight: 400;'));

  return result;
}

export function parseMarkdown(markdownText, options = {}) {
  if (!markdownText || typeof markdownText !== 'string') {
    return '';
  }

  const { colorTheme, codeStyle: codeTheme, themeSystem } = getThemesSafe({
    colorTheme: options.theme,
    codeStyle: options.codeTheme,
    themeSystem: options.themeSystem
  });

  const fontSettings = options.fontSettings || null;
  const context = createContext({ colorTheme, codeTheme, themeSystem, fontSettings, options });

  const cleanedText = cleanReferenceLinks(markdownText);
  const lines = cleanedText.split('\n');

  const tableProcessor = new TableProcessor();
  const listProcessor = new ListProcessor();

  let result = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (context.inCodeBlock) {
      if (isCodeBlockFence(trimmedLine)) {
        const blockInfo = endCodeBlock(context);
        const fontSize = getBaseFontSize(context.fontSettings);
        result += formatCodeBlock(
          blockInfo.content,
          blockInfo.language,
          context.currentTheme,
          context.codeTheme,
          context.options.isPreview,
          fontSize
        );
      } else {
        addCodeBlockLine(context, line);
      }
      i++;
      continue;
    }

    // 处理块级数学公式
    if (context.inMathBlock) {
      if (isMathBlockEnd(trimmedLine)) {
        const latex = endMathBlock(context);
        if (latex) {
          result += formatMathBlock(latex, context.currentTheme, context.fontSettings);
        }
      } else {
        addMathBlockLine(context, line);
      }
      i++;
      continue;
    }

    if (!trimmedLine) {
      if (context.inBlockquote) {
        addBlockquoteLine(context, '');
      }
      i++;
      continue;
    }

    if (context.inBlockquote && !isBlockquoteLine(trimmedLine)) {
      result += endBlockquote(context);
      continue;
    }

    if (isCodeBlockFence(trimmedLine)) {
      const language = trimmedLine.replace(MARKDOWN_SYNTAX.CODE_BLOCK, '').trim();
      startCodeBlock(context, language);
      i++;
      continue;
    }

    // 检测块级数学公式开始
    if (isMathBlockStart(trimmedLine)) {
      startMathBlock(context);
      i++;
      continue;
    }

    const tableResult = tableProcessor.processTableRow(
      line,
      trimmedLine,
      lines,
      i,
      context.currentTheme,
      context.fontSettings
    );

    if (tableResult.shouldContinue || tableResult.tableComplete) {
      if (tableResult.result) result += tableResult.result;
      if (tableResult.reprocessLine) {
        continue;
      }
      i++;
      continue;
    }

    const listResult = listProcessor.processListLine(line, context.currentTheme, context.fontSettings);
    if (listResult.isListItem) {
      if (listResult.result) result += listResult.result;
      i++;
      continue;
    }

    if (isHorizontalRule(trimmedLine)) {
      result += formatHorizontalRule(context.currentTheme);
      i++;
      continue;
    }

    if (isHeading(trimmedLine)) {
      result += formatHeading(trimmedLine, context.currentTheme, context.fontSettings, context.options);
      i++;
      continue;
    }

    if (isBlockquoteLine(trimmedLine)) {
      if (!context.inBlockquote) {
        startBlockquote(context);
      }
      const processedLine = trimmedLine === '>' ? '' : trimmedLine;
      addBlockquoteLine(context, processedLine);
      i++;
      continue;
    }

    result += formatParagraph(trimmedLine, context.currentTheme, context.fontSettings);
    i++;
  }

  if (tableProcessor.isProcessingTable()) {
    result += tableProcessor.completeTable(context.currentTheme, context.fontSettings);
  }
  if (context.inBlockquote) {
    result += endBlockquote(context);
  }
  // 处理未闭合的 math block
  if (context.inMathBlock) {
    const latex = endMathBlock(context);
    if (latex) {
      result += formatMathBlock(latex, context.currentTheme, context.fontSettings);
    }
  }

  result = applyThemeStyles(result, { colorTheme, themeSystem, isPreview: options.isPreview });
  result = applyFontStyles(result, { fontSettings, isPreview: options.isPreview });
  result = SocialStyler.process(result, {
    fontSettings,
    themeSystem,
    colorTheme,
    isPreview: options.isPreview
  });

  return result;
}

export class MarkdownParser {
  parse(markdownText, options = {}) {
    return parseMarkdown(markdownText, options);
  }
}

// 导出内部处理器和格式化函数供测试使用
export { ListProcessor, TableProcessor, LIST_TYPES, formatBlockquote };

export default MarkdownParser;
