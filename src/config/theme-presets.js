/**
 * @file src/config/theme-presets.js
 * @description 主题预设合集 - 颜色主题、代码样式、排版系统、字体设置
 *
 * 本文件整合了所有主题相关的预设配置：
 * - colorThemes: 颜色主题定义
 * - codeStyles: 代码高亮样式定义
 * - themeSystems: 排版主题系统定义
 * - fontSettings: 字体设置预设
 */

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建一个"颜色主题"对象
 */
const createTheme = (config) => ({
  id: config.id,
  name: config.name,
  description: config.description,
  isDark: config.isDark || false,

  primary: config.primary,
  primaryHover: config.primaryHover,
  primaryLight: config.primaryLight,
  primaryDark: config.primaryDark,

  textPrimary: config.textPrimary || '#1f2328',
  textSecondary: config.textSecondary || '#656d76',
  textTertiary: config.textTertiary || '#8b949e',

  bgPrimary: config.bgPrimary || '#ffffff',
  bgSecondary: config.bgSecondary || '#f6f8fa',
  bgTertiary: config.bgTertiary || '#f1f3f4',

  borderLight: config.borderLight || '#d0d7de',
  borderMedium: config.borderMedium || '#8b949e',

  tableHeaderBg: config.tableHeaderBg || '#f6f8fa',
  tableBorder: config.tableBorder || '#d0d7de',
  blockquoteBorder: config.blockquoteBorder || config.primary,
  blockquoteBackground: config.blockquoteBackground || config.primaryLight,
  hrColor: config.hrColor || config.primary,
  listColors: config.listColors || [config.primary, '#10A0FF', '#FA5151', '#666'],

  inlineCodeBg: config.inlineCodeBg || 'rgba(251, 146, 60, 0.08)',
  inlineCodeText: config.inlineCodeText || '#ea580c',
  inlineCodeBorder: config.inlineCodeBorder || 'rgba(251, 146, 60, 0.15)',

  layout: {
    maxWidth: config.layout?.maxWidth || '800px',
    lineHeight: config.layout?.lineHeight || '1.6',
    ...config.layout,
  },
  typography: {
    fontFamily: config.typography?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    codeFontFamily: config.typography?.codeFontFamily || '"SF Mono", monospace',
    ...config.typography,
  },
});

/**
 * 创建一个"代码高亮样式"对象
 */
const createCodeStyle = (config) => ({
  id: config.id,
  name: config.name,
  description: config.description,

  background: config.background,
  borderRadius: config.borderRadius || '12px',
  padding: config.padding || '24px',
  margin: config.margin || '32px 0',
  border: config.border || 'none',
  boxShadow: config.boxShadow || 'none',

  color: config.color,
  fontSize: config.fontSize || '14px',
  lineHeight: config.lineHeight || '1.7',
  fontFamily: config.fontFamily || '"SF Mono", Monaco, Inconsolata, "Fira Code", Consolas, monospace',
  fontWeight: config.fontWeight || '400',

  hasTrafficLights: config.hasTrafficLights || false,
  trafficLightsStyle: config.trafficLightsStyle || '',
  hasHeader: config.hasHeader || false,
  headerStyle: config.headerStyle || '',
  headerContent: config.headerContent || '',

  syntaxHighlight: {
    comment: '#6a737d',
    keyword: '#d73a49',
    string: '#032f62',
    number: '#005cc5',
    function: '#6f42c1',
    operator: '#d73a49',
    punctuation: '#24292e',
    ...config.syntaxHighlight,
  },

  hasGlow: config.hasGlow || false,
  glowColor: config.glowColor || '',
});

/**
 * 创建一个"排版主题系统"对象
 */
const createThemeSystem = (config) => ({
  id: config.id,
  name: config.name,
  description: config.description,
  supportedColors: config.supportedColors || [],

  layout: {
    maxWidth: '100%',
    padding: '16px',
    lineHeight: '1.75',
    paragraphSpacing: '16px',
    ...config.layout,
  },

  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    codeFontFamily: '"SF Mono", Monaco, monospace',
    fontSize: {
      base: '16px',
      h1: '28px',
      h2: '24px',
      h3: '20px',
      ...config.typography?.fontSize,
    },
    fontWeight: {
      normal: '400',
      bold: '600',
      ...config.typography?.fontWeight,
    },
    ...config.typography,
  },

  styles: {
    codeBlock: {
      background: '#f6f8fa',
      borderRadius: '6px',
      padding: '16px',
      ...config.styles?.codeBlock,
    },
    blockquote: {
      borderLeft: '4px solid',
      paddingLeft: '16px',
      margin: '16px 0',
      ...config.styles?.blockquote,
    },
    ...config.styles,
  },

  copy: config.copy || null,
});

// ============================================================================
// 颜色主题
// ============================================================================

export const colorThemes = {
  chijin: createTheme({
    id: 'chijin',
    name: '洋红',
    description: '色橘红，鲜艳明亮如玫瑰般绚烂夺目',
    primary: '#FF0097',
    primaryHover: '#E60087',
    primaryLight: 'rgba(255, 0, 151, 0.08)',
    primaryDark: '#CC0077',
    inlineCodeBg: 'rgba(255, 0, 151, 0.08)',
    inlineCodeText: '#CC0077',
    inlineCodeBorder: 'rgba(255, 0, 151, 0.15)',
  }),

  dianlan: createTheme({
    id: 'dianlan',
    name: '紫棠',
    description: '黑红色，深沉神秘如紫檀般高贵典雅',
    primary: '#56004F',
    primaryHover: '#4A0043',
    primaryLight: 'rgba(86, 0, 79, 0.08)',
    primaryDark: '#3E0037',
    inlineCodeBg: 'rgba(86, 0, 79, 0.08)',
    inlineCodeText: '#3E0037',
    inlineCodeBorder: 'rgba(86, 0, 79, 0.15)',
  }),

  ehuang: createTheme({
    id: 'ehuang',
    name: '杏黄',
    description: '成熟杏子的黄色，温润典雅如秋日暖阳般温馨',
    primary: '#FFA631',
    primaryHover: '#E6952C',
    primaryLight: 'rgba(255, 166, 49, 0.08)',
    primaryDark: '#CC8427',
    inlineCodeBg: 'rgba(255, 166, 49, 0.08)',
    inlineCodeText: '#CC8427',
    inlineCodeBorder: 'rgba(255, 166, 49, 0.15)',
  }),

  conglv: createTheme({
    id: 'conglv',
    name: '葱绿',
    description: '葱叶的绿色，清新自然如春草般生机盎然',
    primary: '#0AA344',
    primaryHover: '#09923C',
    primaryLight: 'rgba(10, 163, 68, 0.08)',
    primaryDark: '#088234',
    inlineCodeBg: 'rgba(10, 163, 68, 0.08)',
    inlineCodeText: '#088234',
    inlineCodeBorder: 'rgba(10, 163, 68, 0.15)',
  }),

  shiliuhong: createTheme({
    id: 'shiliuhong',
    name: '石榴红',
    description: '石榴花的颜色，热情醒目如火焰般绚烂',
    primary: '#F20C00',
    primaryHover: '#DA0B00',
    primaryLight: 'rgba(242, 12, 0, 0.08)',
    primaryDark: '#C20A00',
    inlineCodeBg: 'rgba(242, 12, 0, 0.08)',
    inlineCodeText: '#C20A00',
    inlineCodeBorder: 'rgba(242, 12, 0, 0.15)',
  }),

  meihei: createTheme({
    id: 'meihei',
    name: '煤黑',
    description: '煤炭的黑色，深沉稳重如墨玉般典雅',
    primary: '#312C20',
    primaryHover: '#2A251B',
    primaryLight: 'rgba(49, 44, 32, 0.08)',
    primaryDark: '#231E16',
    inlineCodeBg: 'rgba(49, 44, 32, 0.08)',
    inlineCodeText: '#231E16',
    inlineCodeBorder: 'rgba(49, 44, 32, 0.15)',
  }),

  ganziqing: createTheme({
    id: 'ganziqing',
    name: '绀青绀紫',
    description: '纯度较低的深紫色，神秘优雅如紫檀般高贵',
    primary: '#003371',
    primaryHover: '#002D64',
    primaryLight: 'rgba(0, 51, 113, 0.08)',
    primaryDark: '#002757',
    inlineCodeBg: 'rgba(0, 51, 113, 0.08)',
    inlineCodeText: '#002757',
    inlineCodeBorder: 'rgba(0, 51, 113, 0.15)',
  }),

  xuanse: createTheme({
    id: 'xuanse',
    name: '玄色',
    description: '赤黑色，黑中带红的颜色，深邃神秘如古韵般幽远',
    primary: '#622A1D',
    primaryHover: '#552419',
    primaryLight: 'rgba(98, 42, 29, 0.08)',
    primaryDark: '#481E15',
    inlineCodeBg: 'rgba(98, 42, 29, 0.08)',
    inlineCodeText: '#481E15',
    inlineCodeBorder: 'rgba(98, 42, 29, 0.15)',
  }),
};

export const defaultColorTheme = colorThemes.meihei;

export const getColorTheme = (themeId) => {
  return colorThemes[themeId] || defaultColorTheme;
};

export const getColorThemeList = () => {
  return Object.values(colorThemes).map(theme => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    primary: theme.primary,
  }));
};

export const colorThemePresets = {
  all: Object.keys(colorThemes),
  traditional: ['chijin', 'dianlan', 'ehuang', 'conglv', 'shiliuhong', 'meihei', 'ganziqing', 'xuanse'],
  warm: ['chijin', 'ehuang', 'shiliuhong'],
  cool: ['dianlan', 'ganziqing', 'conglv'],
  dark: ['meihei', 'xuanse', 'dianlan', 'ganziqing'],
};

export const CUSTOM_THEME_STORAGE_KEY = 'markdown-editor-custom-themes';

// ============================================================================
// 颜色主题生成器
// ============================================================================

export class ColorThemeGenerator {
  static hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  static hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  static getLuminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  static getContrastRatio(color1, color2) {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  static adjustColorForContrast(color, background = '#ffffff', targetRatio = 4.5) {
    const hsl = this.hexToHsl(color);
    let adjustedColor = color;
    let currentRatio = this.getContrastRatio(color, background);

    if (currentRatio >= targetRatio) {
      return color;
    }

    let step = currentRatio < targetRatio ? -5 : 5;
    let newL = hsl.l;

    for (let i = 0; i < 20; i++) {
      newL += step;
      newL = Math.max(0, Math.min(100, newL));

      adjustedColor = this.hslToHex(hsl.h, hsl.s, newL);
      currentRatio = this.getContrastRatio(adjustedColor, background);

      if (currentRatio >= targetRatio) {
        break;
      }

      if (newL <= 0 || newL >= 100) {
        break;
      }
    }

    return adjustedColor;
  }

  static generateThemeColors(primaryColor) {
    const adjustedPrimary = this.adjustColorForContrast(primaryColor, '#ffffff', 4.5);
    const adjustedHsl = this.hexToHsl(adjustedPrimary);

    const hoverL = Math.max(adjustedHsl.l - 8, 0);
    const primaryHover = this.hslToHex(adjustedHsl.h, adjustedHsl.s, hoverL);

    const darkL = Math.max(adjustedHsl.l - 15, 0);
    const primaryDark = this.hslToHex(adjustedHsl.h, adjustedHsl.s, darkL);

    const r = parseInt(adjustedPrimary.slice(1, 3), 16);
    const g = parseInt(adjustedPrimary.slice(3, 5), 16);
    const b = parseInt(adjustedPrimary.slice(5, 7), 16);

    return {
      primary: adjustedPrimary,
      primaryHover,
      primaryLight: `rgba(${r}, ${g}, ${b}, 0.08)`,
      primaryDark,
      textPrimary: '#1f2328',
      textSecondary: '#656d76',
      textTertiary: '#8b949e',
      bgPrimary: '#ffffff',
      bgSecondary: '#f6f8fa',
      bgTertiary: '#f1f3f4',
      borderLight: '#d0d7de',
      borderMedium: '#8b949e',
      inlineCodeBg: `rgba(${r}, ${g}, ${b}, 0.08)`,
      inlineCodeText: primaryDark,
      inlineCodeBorder: `rgba(${r}, ${g}, ${b}, 0.15)`,
      tableHeaderBg: '#f6f8fa',
      tableBorder: '#d0d7de',
      blockquoteBorder: adjustedPrimary,
      blockquoteBackground: `rgba(${r}, ${g}, ${b}, 0.05)`,
      hrColor: adjustedPrimary,
      listColors: [adjustedPrimary, '#10A0FF', '#FA5151', '#666']
    };
  }

  static createCustomTheme(primaryColor, name = '自定义主题', description = '用户自定义的颜色主题') {
    const colors = this.generateThemeColors(primaryColor);
    const customId = `custom-${Date.now()}`;

    return createTheme({
      id: customId,
      name,
      description,
      ...colors
    });
  }
}

// ============================================================================
// 代码样式
// ============================================================================

export const codeStyles = {
  mac: createCodeStyle({
    id: 'mac',
    name: 'Mac 风格',
    description: '经典的 macOS 终端风格，深色背景配红绿灯',
    background: '#1e1e1e',
    color: '#e6edf3',
    borderRadius: '12px',
    padding: '16px',
    hasHeader: true,
    headerStyle: `background: #1e1e1e; border-bottom: none; padding: 8px 20px; border-radius: 11px 11px 0 0; font-size: 12px; color: #e6edf3; display: flex; align-items: center; width: 100%; box-sizing: border-box; margin: 0; line-height: 1.1 !important; min-height: auto !important; height: auto !important; position: relative;`,
    headerContent: 'mac-dynamic',
    syntaxHighlight: {
      keyword: '#ff7b72',
      string: '#a5d6ff',
      comment: '#8b949e',
      number: '#79c0ff',
      function: '#d2a8ff',
      operator: '#ff7b72',
      punctuation: '#e6edf3',
    }
  }),

  github: createCodeStyle({
    id: 'github',
    name: 'GitHub 风格',
    description: '清爽的 GitHub 代码块风格，浅色背景',
    background: '#f6f8fa',
    color: '#24292f',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    padding: '16px',
    hasHeader: true,
    headerStyle: `background: #f1f3f4; border-bottom: 1px solid #d0d7de; padding: 8px 16px; border-radius: 7px 7px 0 0; font-size: 12px; color: #656d76; display: block; width: 100%; box-sizing: border-box; margin: 0; line-height: 1.2 !important; min-height: auto !important; height: auto !important;`,
    headerContent: '📄 代码',
    syntaxHighlight: {
      keyword: '#d73a49',
      string: '#032f62',
      comment: '#6a737d',
      number: '#005cc5',
      function: '#6f42c1',
    }
  }),

  vscode: createCodeStyle({
    id: 'vscode',
    name: 'VS Code 风格',
    description: '现代的 VS Code 编辑器风格，深蓝背景',
    background: 'linear-gradient(135deg, #1e1e1e 0%, #252526 100%)',
    color: '#d4d4d4',
    borderRadius: '10px',
    padding: '20px',
    border: '1px solid #3c3c3c',
    hasHeader: true,
    headerStyle: `background: linear-gradient(135deg, #2d2d30 0%, #3c3c3c 100%); border-bottom: 1px solid #3c3c3c; padding: 10px 20px; border-radius: 9px 9px 0 0; font-size: 13px; color: #cccccc; display: block; width: 100%; box-sizing: border-box; margin: 0; line-height: 1.2 !important; min-height: auto !important; height: auto !important;`,
    headerContent: '⚡ 代码片段',
    syntaxHighlight: {
      keyword: '#569cd6',
      string: '#ce9178',
      comment: '#6a9955',
      number: '#b5cea8',
      function: '#dcdcaa',
      operator: '#569cd6',
      punctuation: '#d4d4d4',
    }
  }),

  terminal: createCodeStyle({
    id: 'terminal',
    name: '终端风格',
    description: '复古的终端风格，黑色背景配绿色文字',
    background: '#000000',
    color: '#00ff00',
    borderRadius: '6px',
    padding: '20px',
    border: '2px solid #333333',
    fontFamily: `'Courier New', 'Monaco', monospace`,
    hasHeader: true,
    headerStyle: `background: #1a1a1a; border-bottom: 1px solid #333333; padding: 8px 20px; border-radius: 4px 4px 0 0; font-size: 12px; color: #00ff00; font-family: 'Courier New', monospace; display: block; width: 100%; box-sizing: border-box; margin: 0; line-height: 1.2 !important; min-height: auto !important; height: auto !important;`,
    headerContent: '$ terminal',
    syntaxHighlight: {
      keyword: '#00ffff',
      string: '#ffff00',
      comment: '#888888',
      number: '#ff00ff',
      function: '#00ff88',
      operator: '#00ffff',
      punctuation: '#00ff00',
    }
  }),
};

export const defaultCodeStyle = codeStyles.mac;

export const getCodeStyle = (styleId) => {
  return codeStyles[styleId] || defaultCodeStyle;
};

export const getCodeStyleList = () => {
  return Object.values(codeStyles).map(style => ({
    id: style.id,
    name: style.name,
    description: style.description,
  }));
};

export const codeStylePresets = {
  all: Object.keys(codeStyles),
  dark: ['mac', 'vscode', 'terminal'],
  light: ['github'],
  classic: ['mac', 'github'],
};

// ============================================================================
// 排版主题系统
// ============================================================================

export const themeSystems = {
  default: createThemeSystem({
    id: 'default',
    name: '默认主题',
    description: '现代化Markdown编辑器统一主题，简洁优雅',
    supportedColors: ['chijin', 'dianlan', 'ehuang', 'conglv', 'shiliuhong', 'meihei', 'ganziqing', 'xuanse'],
    layout: {
      padding: '16px',
      lineHeight: '1.75',
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif',
      fontSize: {
        base: '16px',
        h1: '28px',
        h2: '24px',
        h3: '20px',
      },
    },
  }),

  breeze: createThemeSystem({
    id: 'breeze',
    name: '清风排版',
    description: '面向移动端图文平台的清爽排版：舒适行高、自然间距与温和装饰',
    supportedColors: ['meihei', 'chijin', 'ehuang', 'conglv', 'shiliuhong', 'ganziqing'],
    layout: {
      maxWidth: '720px',
      padding: '24px',
      lineHeight: '1.8',
      paragraphSpacing: '1.2em'
    },
    typography: {
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
      fontSize: {
        base: '17px',
        h1: '30px',
        h2: '24px',
        h3: '20px'
      },
      fontWeight: {
        normal: '400',
        bold: '700'
      }
    },
    copy: {
      headings: {
        h1: { pill: true, marginTop: '2.2em', marginBottom: '1.6em' },
        h2: { deco: { widthPx: 6, heightEm: 1.2, radiusPx: 3 }, fontScale: 1.5, lineHeight: '1.35em', marginTop: '1.8em', marginBottom: '1.1em' },
        h3: { deco: { widthPx: 4, heightEm: 1.1, radiusPx: 2 }, fontScale: 1.22, marginTop: '1.2em', marginBottom: '0.8em' },
        h4: { deco: { widthPx: 3, heightEm: 1.05, radiusPx: 2 }, fontScale: 1.08, marginTop: '1em', marginBottom: '0.6em' }
      },
      link: { underline: false },
      innerCard: { borderRadius: 12, padding: '24px 20px' },
      table: { headerShade: 0.06, borderAlpha: 0.18 }
    }
  }),
};

export const defaultThemeSystem = themeSystems.default;

export const getThemeSystem = (systemId) => {
  return themeSystems[systemId] || defaultThemeSystem;
};

export const getThemeSystemList = () => {
  return Object.values(themeSystems).map(system => ({
    id: system.id,
    name: system.name,
    description: system.description,
    supportedColors: system.supportedColors || [],
  }));
};

export const themeSystemPresets = {
  all: ['default', 'breeze'],
  default: ['default', 'breeze'],
};

// ============================================================================
// 字体设置
// ============================================================================

export const fontFamilyOptions = [
  {
    id: 'microsoft-yahei',
    name: '微软雅黑',
    description: '微信公众号推荐字体，兼容性最佳',
    value: '"Microsoft YaHei", "微软雅黑", Arial, sans-serif',
    category: 'recommended'
  },
  {
    id: 'pingfang-sc',
    name: '苹方',
    description: 'Apple 设备优选，微信支持',
    value: '"PingFang SC", "苹方-简", "Microsoft YaHei", "微软雅黑", Arial, sans-serif',
    category: 'recommended'
  },
  {
    id: 'hiragino-sans',
    name: '冬青黑体',
    description: 'Mac 系统经典字体，微信支持',
    value: '"Hiragino Sans GB", "冬青黑体简体中文", "Microsoft YaHei", "微软雅黑", Arial, sans-serif',
    category: 'recommended'
  },
  {
    id: 'arial',
    name: 'Arial',
    description: '通用西文字体，全平台支持',
    value: 'Arial, sans-serif',
    category: 'basic'
  },
  {
    id: 'system-safe',
    name: '系统安全字体',
    description: '微信公众号安全字体组合',
    value: '"Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif',
    category: 'basic'
  }
];

export const fontSizeOptions = {
  min: 12,
  max: 24,
  default: 16,
  step: 1,
  presets: [
    { value: 12, label: '小号 (12px)' },
    { value: 14, label: '较小 (14px)' },
    { value: 16, label: '标准 (16px)' },
    { value: 18, label: '较大 (18px)' },
    { value: 20, label: '大号 (20px)' },
    { value: 22, label: '特大 (22px)' },
    { value: 24, label: '超大 (24px)' }
  ]
};

export const fontFamilyGroups = {
  recommended: {
    name: '推荐字体',
    description: '微信公众号兼容性最佳的字体',
    options: fontFamilyOptions.filter(font => font.category === 'recommended')
  },
  basic: {
    name: '基础字体',
    description: '通用安全字体选择',
    options: fontFamilyOptions.filter(font => font.category === 'basic')
  }
};

export const defaultFontSettings = {
  fontFamily: 'microsoft-yahei',
  fontSize: 16,
  letterSpacing: 0,
  lineHeight: 1.6
};

export function getFontFamily(fontId) {
  return fontFamilyOptions.find(font => font.id === fontId) || null;
}

export function getFontFamilyList() {
  return fontFamilyOptions.map(font => ({
    id: font.id,
    name: font.name,
    description: font.description,
    category: font.category
  }));
}

export function isValidFontSize(fontSize) {
  return typeof fontSize === 'number' &&
         fontSize >= fontSizeOptions.min &&
         fontSize <= fontSizeOptions.max;
}

export function getValidFontSize(fontSize) {
  if (!isValidFontSize(fontSize)) {
    return fontSizeOptions.default;
  }
  return Math.round(fontSize);
}

export function generateFontCSSVariables(fontSettings) {
  const fontFamily = getFontFamily(fontSettings.fontFamily);
  const fontSize = getValidFontSize(fontSettings.fontSize);
  const letterSpacing = typeof fontSettings.letterSpacing === 'number' ? fontSettings.letterSpacing : 0;
  const lineHeight = typeof fontSettings.lineHeight === 'number' ? fontSettings.lineHeight : (fontSize <= 14 ? 1.7 : fontSize <= 18 ? 1.6 : 1.5);

  return {
    '--markdown-font-family': fontFamily ? fontFamily.value : fontFamilyOptions[0].value,
    '--markdown-font-size': `${fontSize}px`,
    '--markdown-line-height': String(lineHeight),
    '--markdown-letter-spacing': `${letterSpacing}px`
  };
}

export const fontSettingsUtils = {
  getFontFamily,
  getFontFamilyList,
  isValidFontSize,
  getValidFontSize,
  generateFontCSSVariables,

  getPreviewStyle(fontId, fontSize) {
    const fontFamily = getFontFamily(fontId);
    return {
      fontFamily: fontFamily ? fontFamily.value : 'inherit',
      fontSize: `${getValidFontSize(fontSize)}px`,
      lineHeight: fontSize <= 14 ? '1.7' : fontSize <= 18 ? '1.6' : '1.5',
      letterSpacing: '0px'
    };
  },

  isFontAvailable(fontId) {
    return fontFamilyOptions.some(font => font.id === fontId);
  }
};

// ============================================================================
// 导出工厂函数（供外部创建自定义主题）
// ============================================================================

export { createTheme, createCodeStyle, createThemeSystem };
