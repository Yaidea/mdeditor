/**
 * @file src/core/markdown/parser.js
 * @description Markdown 解析器统一入口
 *
 * 本模块整合了 Markdown 解析的核心逻辑，提供统一的解析 API。
 * 内部使用策略模式处理不同类型的 Markdown 元素。
 *
 * 导出：
 * - parseMarkdown: 主解析函数
 * - MarkdownParser: 解析器类
 * - FormatterCoordinator: 格式化协调器
 * - FormatterContext: 上下文管理
 * - ListProcessor: 列表处理器
 * - TableProcessor: 表格处理器
 */

// 核心解析器
export { MarkdownParser } from './parser/core/MarkdownParser.js';

// 格式化协调器和上下文
export { FormatterCoordinator } from './parser/formatter-coordinator.js';
export { FormatterContext } from './parser/context.js';

// 处理器
export { ListProcessor, LIST_TYPES } from './processors/list.js';
export { TableProcessor, TABLE_STATES, TABLE_ROW_TYPES } from './processors/table.js';

// 行处理器
export {
  CodeBlockProcessor,
  HorizontalRuleProcessor,
  HeadingProcessor,
  BlockquoteProcessor,
  LINE_PROCESSORS,
  getLineProcessor
} from './processors/line.js';

// 策略
export {
  CodeBlockContentStrategy,
  EmptyLineStrategy,
  BlockquoteEndCheckStrategy,
  TableProcessingStrategy,
  ListProcessingStrategy,
  LineProcessorStrategy,
  ParagraphStrategy
} from './parser/strategies/index.js';

// 便捷函数：解析 Markdown 文本为 HTML
import { MarkdownParser } from './parser/core/MarkdownParser.js';

/**
 * 解析 Markdown 文本为 HTML 的便捷函数
 * @param {string} markdownText - 要解析的 Markdown 文本
 * @param {object} [options] - 解析选项
 * @param {object} [options.theme] - 颜色主题
 * @param {object} [options.codeTheme] - 代码高亮主题
 * @param {string} [options.themeSystem] - 排版系统
 * @param {object} [options.fontSettings] - 字体设置
 * @param {boolean} [options.isPreview] - 是否为预览模式
 * @returns {string} 生成的 HTML 字符串
 */
export function parseMarkdown(markdownText, options = {}) {
  const parser = new MarkdownParser();
  return parser.parse(markdownText, options);
}
