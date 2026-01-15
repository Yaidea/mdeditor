/**
 * @file src/core/markdown/index.js
 * @description Markdown处理引擎统一导出
 *
 * 集中管理整个Markdown处理系统
 * 导出合并后的顶层模块：parser.js, inline-formatter.js, code-formatter.js, social-adapters.js
 */

// 解析器（统一入口）
export { parseMarkdown, MarkdownParser } from './parser.js';

// 行内格式化器
export * from './inline-formatter.js';

// 代码高亮格式化器
export * from './code-formatter.js';

// 社交平台适配器
export * from './social-adapters.js'; 