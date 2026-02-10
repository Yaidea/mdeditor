<template>
  <div
    class="outline-wrapper"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 右侧触发条 -->
    <div class="outline-trigger" :class="{ 'is-active': isOpen }">
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z"/>
      </svg>
      <span class="outline-trigger-text">大纲</span>
    </div>

    <!-- 滑出面板 -->
    <Transition name="outline-slide">
      <div v-show="isOpen" class="outline-panel">
        <div class="outline-header">
          <svg viewBox="0 0 24 24" width="15" height="15">
            <path fill="currentColor" d="M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z"/>
          </svg>
          <span>文档大纲</span>
          <span class="outline-count" v-if="headings.length">{{ headings.length }}</span>
        </div>
        <div class="outline-list" v-if="headings.length > 0">
          <div
            v-for="heading in headings"
            :key="heading.id"
            class="outline-item"
            :class="[`outline-level-${heading.level}`]"
            @click="scrollToHeading(heading)"
          >
            <span class="outline-item-bar" :class="[`bar-level-${heading.level}`]"></span>
            <span class="outline-item-text">{{ heading.text }}</span>
          </div>
        </div>
        <div class="outline-empty" v-else>
          <svg viewBox="0 0 24 24" width="36" height="36">
            <path fill="currentColor" opacity="0.15" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          <span>添加标题以生成大纲</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, toRef } from 'vue'
import { EditorView } from '@codemirror/view'
import { normalizeHeadingText, useOutline } from '../composables/useOutline.js'

const props = defineProps({
  markdownContent: {
    type: String,
    default: ''
  }
})

const { headings } = useOutline(toRef(props, 'markdownContent'))
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6'

const isOpen = ref(false)
let closeTimer = null

const handleMouseEnter = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  isOpen.value = true
}

const handleMouseLeave = () => {
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    isOpen.value = false
    closeTimer = null
  }, 300)
}

onBeforeUnmount(() => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
})

/**
 * 找到元素最近的可滚动祖先容器
 */
const findScrollParent = (el) => {
  let parent = el.parentElement
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent)
    const overflowY = style.overflowY
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

/**
 * 在指定容器中查找标题并滚动定位，使用手动 scrollTo 确保在任意嵌套结构下都能正确滚动
 */
const scrollInContainer = (container, heading) => {
  const matchingEls = Array.from(container.querySelectorAll(HEADING_SELECTOR)).filter((el) => {
    const level = Number(el.tagName.slice(1))
    return level === heading.level && normalizeHeadingText(el.textContent || '') === heading.text
  })

  const targetEl = matchingEls[heading.occurrence] || matchingEls[0]
  if (!targetEl) return false

  const scrollParent = findScrollParent(targetEl)
  if (scrollParent) {
    const targetTop = targetEl.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top + scrollParent.scrollTop
    scrollParent.scrollTo({ top: targetTop, behavior: 'smooth' })
  } else {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // 高亮闪烁
  targetEl.style.transition = 'background 0.3s ease'
  targetEl.style.background = 'var(--theme-primary-15, rgba(99,102,241,0.12))'
  setTimeout(() => { targetEl.style.background = '' }, 1500)
  return true
}

/**
 * 在 Markdown 编辑器 (CodeMirror) 中按标题行号定位
 */
const scrollInMarkdownEditor = (heading) => {
  const editorRoot = document.querySelector('.cm-editor')
  if (!editorRoot) return false

  const editorView = EditorView.findFromDOM(editorRoot)
  if (!editorView) return false

  const doc = editorView.state.doc
  if (!doc.lines) return false

  const lineNumber = Math.min(Math.max(heading.lineNumber || 1, 1), doc.lines)
  const line = doc.line(lineNumber)
  const anchor = line.from

  editorView.dispatch({
    selection: { anchor },
    effects: [EditorView.scrollIntoView(anchor, { y: 'start', yMargin: 48 })]
  })
  editorView.focus()
  return true
}

const scrollToHeading = (heading) => {
  if (!heading) return

  // 优先在 WYSIWYG 编辑器中查找（.preview-rendered 是实际滚动容器）
  const wysiwygRendered = document.querySelector('.preview-rendered.wysiwyg-rendered')
  if (wysiwygRendered && scrollInContainer(wysiwygRendered, heading)) return

  // 然后在普通预览面板中查找
  const previewRendered = document.querySelector('.preview-rendered:not(.wysiwyg-rendered)')
  if (previewRendered && scrollInContainer(previewRendered, heading)) return

  // 最后回退到 Markdown 编辑器（仅编辑器视图会走到这里）
  scrollInMarkdownEditor(heading)
}
</script>

<style>
/* ===== 大纲面板 ===== */

/* 整体容器 - 不使用 scoped，确保选择器生效 */
.outline-wrapper {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 800;
  pointer-events: none;
}

/* 右侧触发条 */
.outline-trigger {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 5px;
  background: var(--theme-bg-primary, #fff);
  border: 1px solid var(--theme-border-light, #e5e7eb);
  border-right: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
  color: var(--theme-text-tertiary, #9ca3af);
  opacity: 0.6;
  pointer-events: auto;
}

.outline-trigger:hover,
.outline-trigger.is-active {
  opacity: 1;
  color: var(--theme-primary, #6366f1);
  background: var(--theme-bg-primary, #fff);
  box-shadow: -3px 0 12px rgba(0, 0, 0, 0.08);
  padding: 10px 6px;
}

.outline-trigger svg {
  flex-shrink: 0;
}

.outline-trigger-text {
  writing-mode: vertical-rl;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 3px;
  line-height: 1;
}

/* 滑出面板 */
.outline-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 256px;
  background: var(--theme-bg-primary, #fff);
  border-left: 1px solid var(--theme-border-light, #e5e7eb);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

/* 面板头部 */
.outline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--theme-text-primary, #1f2937);
  border-bottom: 1px solid var(--theme-border-light, #e5e7eb);
  background: var(--theme-bg-secondary, #f9fafb);
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.outline-header svg {
  color: var(--theme-primary, #6366f1);
  flex-shrink: 0;
  opacity: 0.8;
}

.outline-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: var(--theme-text-tertiary, #9ca3af);
  background: var(--theme-bg-tertiary, #f3f4f6);
  padding: 1px 7px;
  border-radius: 10px;
  line-height: 1.5;
}

/* 大纲列表 */
.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

/* 大纲项 */
.outline-item {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.12s ease;
  color: var(--theme-text-secondary, #4b5563);
  font-size: 13px;
  line-height: 1.5;
  position: relative;
}

.outline-item:hover {
  background: var(--theme-primary-15, rgba(99, 102, 241, 0.06));
  color: var(--theme-primary, #6366f1);
}

/* 左侧竖线指示器 */
.outline-item-bar {
  width: 2px;
  height: 14px;
  border-radius: 1px;
  background: var(--theme-border-light, #e5e7eb);
  margin-right: 10px;
  flex-shrink: 0;
  transition: all 0.12s ease;
}

.outline-item:hover .outline-item-bar {
  background: var(--theme-primary, #6366f1);
  height: 16px;
}

.bar-level-1 {
  background: var(--theme-primary, #6366f1);
  width: 3px;
  height: 16px;
}

.bar-level-2 {
  background: var(--theme-primary-60, rgba(99, 102, 241, 0.6));
}

/* 层级缩进 */
.outline-level-1 {
  padding-left: 14px;
  font-weight: 600;
  font-size: 13px;
  color: var(--theme-text-primary, #1f2937);
}

.outline-level-2 {
  padding-left: 26px;
  font-weight: 500;
  font-size: 13px;
}

.outline-level-3 {
  padding-left: 38px;
  font-size: 12px;
}

.outline-level-4 {
  padding-left: 50px;
  font-size: 12px;
  color: var(--theme-text-tertiary, #9ca3af);
}

.outline-level-5 {
  padding-left: 62px;
  font-size: 12px;
  color: var(--theme-text-tertiary, #9ca3af);
}

.outline-level-6 {
  padding-left: 74px;
  font-size: 12px;
  color: var(--theme-text-tertiary, #9ca3af);
}

.outline-item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* 空状态 */
.outline-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--theme-text-tertiary, #9ca3af);
  font-size: 12px;
  padding: 20px;
}

/* 滑入动画 */
.outline-slide-enter-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.2s ease;
}
.outline-slide-leave-active {
  transition: transform 0.2s cubic-bezier(0.4, 0, 1, 1),
              opacity 0.15s ease;
}

.outline-slide-enter-from,
.outline-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 滚动条 */
.outline-list::-webkit-scrollbar {
  width: 3px;
}

.outline-list::-webkit-scrollbar-track {
  background: transparent;
}

.outline-list::-webkit-scrollbar-thumb {
  background: var(--theme-border-light, #e5e7eb);
  border-radius: 2px;
}

.outline-list::-webkit-scrollbar-thumb:hover {
  background: var(--theme-primary, #6366f1);
}

/* 响应式：移动端隐藏 */
@media (max-width: 768px) {
  .outline-wrapper {
    display: none;
  }
}
</style>
