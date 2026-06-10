/* ============================================================
 * AI-Note — 统一状态大账本 (useReducer)
 *
 * 注意：当前为纯前端演示，使用 localStorage 模拟持久化。
 * 后续对接后端 API 时只需替换 action 内部的读写逻辑，
 * reducer 的纯函数骨架保持不变。
 * ============================================================ */

const STORAGE_KEY = 'ai-notes-data';

/* ---------- localStorage 辅助 ---------- */
function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/* ---------- 自定义标签辅助 ---------- */
export function loadCustomTags() {
  try {
    const raw = localStorage.getItem('ai-notes-tags');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveCustomTags(tags) {
  localStorage.setItem('ai-notes-tags', JSON.stringify(tags));
}

/* ---------- 初始化默认笔记 ---------- */
const DEFAULT_NOTES = [
  {
    id: '1',
    title: '欢迎使用 AI-Note',
    content: `# 欢迎使用 ✨ AI-Note

这是你的第一篇笔记。**AI-Note** 是一款智能 Markdown 云笔记系统，它融合了：

- **实时 Markdown 预览** — 右侧所见即所得
- **AI 智能摘要** — 自动提取文章要点
- **智能标签推荐** — 基于内容生成分类标签
- **一键优化排版** — AI 帮你美化 Markdown 格式

## 快速上手

1. 在左侧编辑区输入 Markdown 文本
2. 右侧预览区实时渲染效果
3. 点击 "✨ AI一键优化排版" 体验智能排版

\`\`\`javascript
// 试试代码高亮
function hello() {
  console.log("Hello AI-Note!");
}
\`\`\`

> **提示**：长文本编辑时，预览使用 \`useDeferredValue\` 降级优先级，确保打字绝对流畅。

---

*Happy Note Taking! 🚀*`,
    summary: 'AI-Note 是一款智能 Markdown 云笔记系统，支持实时预览、AI 摘要、智能标签和自动排版优化。本文介绍了系统的主要功能和快速上手指南。',
    tags: ['AI', 'Markdown', '入门指南'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'React 18 性能优化：useDeferredValue',
    content: `# React 18 useDeferredValue 深度解析

## 背景

在实时 Markdown 编辑器中，用户输入和 Markdown 编译渲染是两个竞争 UI 线程的任务。如果每次按键都触发完整的 Markdown 编译 + 语法高亮，UI 会明显卡顿。

## 解决方案

React 18 引入的 \`useDeferredValue\` 可以解决这个问题：

| 特性 | 实时值 | 延迟值 |
|------|--------|--------|
| 更新优先级 | 高 | 低 |
| 使用场景 | textarea 绑定 | 预览渲染 |
| 是否阻塞输入 | 否 | 可中断 |

## 代码示例

\`\`\`jsx
import { useDeferredValue } from 'react';

function Editor({ content, onChange }) {
  const deferredContent = useDeferredValue(content);
  const isStale = content !== deferredContent;

  return (
    <div>
      <textarea value={content} onChange={onChange} />
      <MarkdownPreview content={deferredContent} isStale={isStale} />
    </div>
  );
}
\`\`\`

## 原理

React 在后台以更低优先级渲染延迟值，高优先级任务（如键盘输入）可以中断低优先级渲染，确保界面始终流畅响应。`,
    summary: '本文深入解析 React 18 的 useDeferredValue Hook，展示如何通过延迟渲染解决 Markdown 编辑器中的性能瓶颈，确保打字输入始终保持 60 FPS。',
    tags: ['React', '性能优化', 'Hooks'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'useReducer 状态管理最佳实践',
    content: `# useReducer 状态管理最佳实践

## 为什么选择 useReducer？

相比于 \`useState\` 的分散管理，\`useReducer\` 将相关状态集中在一个大账本中，通过 **dispatch** 触发所有变更。

## 架构设计

\`\`\`
┌─────────────┐    dispatch(action)    ┌──────────┐
│   Component  │ ──────────────────►  │  Reducer  │
│  (Consumer)  │                      │ (纯函数)  │
│             │ ◄────────────────── │          │
└─────────────┘    新的 state         └──────────┘
\`\`\`

## Action 类型规范

\`\`\`javascript
const initialState = {
  notes: [],
  currentNote: null,
  isAiLoading: false,
  isLoading: false,
  searchKeyword: '',
};

function noteReducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT_NOTE':
      return { ...state, currentNote: action.payload };
    // ... 更多 case
  }
}
\`\`\`

## 与 Context 配合

Reducer + Context = 轻量级 Redux。无需引入外部库，即可实现全局状态共享。

> **要点**：所有状态变更必须经过 dispatch，确保状态变更可追踪、可回溯。`,
    summary: '介绍 useReducer + Context 模式作为轻量级状态管理方案，包含架构设计、Action 类型规范和与 Redux 的对比分析。',
    tags: ['React', '状态管理', '架构'],
    updatedAt: new Date().toISOString(),
  },
];

/* ---------- 保证 localStorage 中有初始数据 ---------- */
(function initStorage() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    saveNotes(DEFAULT_NOTES);
    return;
  }
  try {
    const parsed = JSON.parse(existing);
    // 如果数据全是空笔记（标题=未命名笔记 且 内容为空），重置为默认
    const emptyCount = parsed.filter(
      (n) => !n.content || n.content.trim() === '' || n.title === '未命名笔记',
    ).length;
    if (parsed.length === 0 || emptyCount > parsed.length / 2) {
      saveNotes(DEFAULT_NOTES);
    }
  } catch {
    saveNotes(DEFAULT_NOTES);
  }
})();

/* ==============================================================
 * Initial State
 * ============================================================== */
export const initialState = {
  notes: loadNotes(),
  currentNote: null,
  isAiLoading: false,
  isLoading: false,
  searchKeyword: '',
  customTags: loadCustomTags(),
};

/* ==============================================================
 * Action Types
 * ============================================================== */
export const ACTION = {
  SET_NOTES: 'SET_NOTES',
  SET_CURRENT_NOTE: 'SET_CURRENT_NOTE',
  UPDATE_CURRENT_NOTE_FIELD: 'UPDATE_CURRENT_NOTE_FIELD',
  SET_AI_LOADING: 'SET_AI_LOADING',
  SET_LOADING: 'SET_LOADING',
  SET_SEARCH_KEYWORD: 'SET_SEARCH_KEYWORD',
  ADD_NOTE: 'ADD_NOTE',
  DELETE_NOTE: 'DELETE_NOTE',
  SAVE_CURRENT_NOTE: 'SAVE_CURRENT_NOTE',
  RESET_DEFAULTS: 'RESET_DEFAULTS',
  ADD_TAG: 'ADD_TAG',
  REMOVE_TAG: 'REMOVE_TAG',
};

/* ==============================================================
 * Reducer (纯函数)
 * ============================================================== */
export function noteReducer(state, action) {
  switch (action.type) {
    /* ---------- 批量设置笔记列表 ---------- */
    case ACTION.SET_NOTES:
      return { ...state, notes: action.payload, isLoading: false };

    /* ---------- 切换当前编辑的笔记 ---------- */
    case ACTION.SET_CURRENT_NOTE:
      return { ...state, currentNote: action.payload };

    /* ---------- 更新当前笔记的某个字段 (title/content 等) ---------- */
    case ACTION.UPDATE_CURRENT_NOTE_FIELD:
      return {
        ...state,
        currentNote: {
          ...state.currentNote,
          [action.payload.field]: action.payload.value,
          // 内容/标题变更时刷新 updatedAt
          ...(action.payload.field === 'content' || action.payload.field === 'title'
            ? { updatedAt: new Date().toISOString() }
            : {}),
        },
      };

    /* ---------- AI Loading ---------- */
    case ACTION.SET_AI_LOADING:
      return { ...state, isAiLoading: action.payload };

    /* ---------- 列表 Loading ---------- */
    case ACTION.SET_LOADING:
      return { ...state, isLoading: action.payload };

    /* ---------- 搜索关键词 ---------- */
    case ACTION.SET_SEARCH_KEYWORD:
      return { ...state, searchKeyword: action.payload };

    /* ---------- 新增笔记 ---------- */
    case ACTION.ADD_NOTE: {
      // 如果外部传入了完整笔记对象，直接使用；否则内部生成
      const newNote = action.payload?.id
        ? { ...action.payload, updatedAt: new Date().toISOString() }
        : {
            id: String(Date.now()),
            title: '未命名笔记',
            content: '',
            summary: '',
            tags: [],
            updatedAt: new Date().toISOString(),
          };
      const notes = [newNote, ...state.notes];
      saveNotes(notes);
      return { ...state, notes, currentNote: newNote };
    }

    /* ---------- 删除笔记 ---------- */
    case ACTION.DELETE_NOTE: {
      const notes = state.notes.filter((n) => n.id !== action.payload);
      saveNotes(notes);
      return {
        ...state,
        notes,
        currentNote:
          state.currentNote?.id === action.payload ? null : state.currentNote,
      };
    }

    /* ---------- 保存当前笔记到列表（同步到数组，不改时间戳） ---------- */
    case ACTION.SAVE_CURRENT_NOTE: {
      if (!state.currentNote) return state;
      const notes = state.notes.map((n) =>
        n.id === state.currentNote.id ? state.currentNote : n,
      );
      saveNotes(notes);
      return { ...state, notes };
    }

    /* ---------- 重置为默认笔记 ---------- */
    case ACTION.RESET_DEFAULTS: {
      saveNotes(DEFAULT_NOTES);
      return {
        ...state,
        notes: DEFAULT_NOTES,
        currentNote: DEFAULT_NOTES[0],
        searchKeyword: '',
      };
    }

    /* ---------- 添加自定义标签 ---------- */
    case ACTION.ADD_TAG: {
      const tag = action.payload?.trim();
      if (!tag || state.customTags.includes(tag)) return state;
      const customTags = [...state.customTags, tag];
      saveCustomTags(customTags);
      return { ...state, customTags };
    }

    /* ---------- 删除标签 ---------- */
    case ACTION.REMOVE_TAG: {
      const customTags = state.customTags.filter((t) => t !== action.payload);
      saveCustomTags(customTags);
      return { ...state, customTags };
    }

    default:
      return state;
  }
}
