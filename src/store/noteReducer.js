/**
 * AI-Note 笔记状态管理 Reducer
 *
 * 采用 useReducer 模式管理全局笔记状态
 * 数据持久化由后端 API 处理，不使用 localStorage
 * Reducer 保持纯函数特性，副作用在组件中通过 api/ 模块处理
 */

/* ==============================================================
 * 初始状态定义
 * ============================================================== */
export const initialState = {
  notes: [],           // 笔记列表，由 Dashboard 从 API 加载
  currentNote: null,   // 当前选中的笔记对象
  isAiLoading: false,  // AI 功能加载状态（如 AI 对话、摘要生成等）
  isLoading: false,    // 通用加载状态
  searchKeyword: '',   // 搜索关键词
  customTags: [],      // 自定义标签列表
  tagMap: {},          // 标签名称 → 标签 ID 的映射，用于快速查找
};

/* ==============================================================
 * Action 类型常量
 * ============================================================== */
export const ACTION = {
  SET_NOTES: 'SET_NOTES',                           // 设置笔记列表
  SET_CURRENT_NOTE: 'SET_CURRENT_NOTE',             // 设置当前选中的笔记
  UPDATE_CURRENT_NOTE_FIELD: 'UPDATE_CURRENT_NOTE_FIELD', // 更新当前笔记的某个字段
  SET_AI_LOADING: 'SET_AI_LOADING',                 // 设置 AI 加载状态
  SET_LOADING: 'SET_LOADING',                       // 设置通用加载状态
  SET_SEARCH_KEYWORD: 'SET_SEARCH_KEYWORD',         // 设置搜索关键词
  ADD_NOTE: 'ADD_NOTE',                             // 添加新笔记
  DELETE_NOTE: 'DELETE_NOTE',                       // 删除笔记
  SAVE_CURRENT_NOTE: 'SAVE_CURRENT_NOTE',           // 保存当前笔记到列表
  RESET_DEFAULTS: 'RESET_DEFAULTS',                 // 重置为默认状态
  ADD_TAG: 'ADD_TAG',                               // 添加标签
  REMOVE_TAG: 'REMOVE_TAG',                         // 移除标签
  SET_CUSTOM_TAGS: 'SET_CUSTOM_TAGS',               // 设置自定义标签列表
  SET_TAG_MAP: 'SET_TAG_MAP',                       // 设置标签映射
};

/**
 * 笔记状态 Reducer（纯函数，无副作用）
 * @param {Object} state - 当前状态
 * @param {Object} action - 动作对象，包含 type 和 payload
 * @returns {Object} 新状态
 */
export function noteReducer(state, action) {
  switch (action.type) {
    // 设置笔记列表，同时关闭加载状态
    case ACTION.SET_NOTES:
      return { ...state, notes: action.payload, isLoading: false };

    // 设置当前选中的笔记
    case ACTION.SET_CURRENT_NOTE:
      return { ...state, currentNote: action.payload };

    // 更新当前笔记的某个字段
    // 如果更新的是 content 或 title，同时更新 updatedAt 时间戳
    case ACTION.UPDATE_CURRENT_NOTE_FIELD:
      return {
        ...state,
        currentNote: {
          ...state.currentNote,
          [action.payload.field]: action.payload.value,
          // 更新内容或标题时，自动更新修改时间
          ...(action.payload.field === 'content' || action.payload.field === 'title'
            ? { updatedAt: new Date().toISOString() }
            : {}),
        },
      };

    // 设置 AI 功能加载状态
    case ACTION.SET_AI_LOADING:
      return { ...state, isAiLoading: action.payload };

    // 设置通用加载状态
    case ACTION.SET_LOADING:
      return { ...state, isLoading: action.payload };

    // 设置搜索关键词
    case ACTION.SET_SEARCH_KEYWORD:
      return { ...state, searchKeyword: action.payload };

    // 添加新笔记
    // 如果 payload 包含 id，使用 payload 数据
    // 否则创建一个默认的空白笔记
    case ACTION.ADD_NOTE: {
      const newNote = action.payload?.id
        ? { ...action.payload, updatedAt: new Date().toISOString() }
        : {
            id: String(Date.now()),      // 使用时间戳作为临时 ID
            title: '未命名笔记',
            content: '',
            summary: '',
            tags: [],
            updatedAt: new Date().toISOString(),
          };
      // 将新笔记添加到列表开头，并设为当前笔记
      return { ...state, notes: [newNote, ...state.notes], currentNote: newNote };
    }

    // 删除笔记
    // 如果删除的是当前笔记，将 currentNote 设为 null
    case ACTION.DELETE_NOTE: {
      const notes = state.notes.filter((n) => n.id !== action.payload);
      return {
        ...state,
        notes,
        // 如果删除的是当前选中的笔记，清空 currentNote
        currentNote: state.currentNote?.id === action.payload ? null : state.currentNote,
      };
    }

    // 保存当前笔记到列表中（同步更新）
    case ACTION.SAVE_CURRENT_NOTE: {
      if (!state.currentNote) return state;
      // 在笔记列表中找到当前笔记并更新
      const notes = state.notes.map((n) =>
        n.id === state.currentNote.id
          ? { ...state.currentNote, updatedAt: n.updatedAt }
          : n,
      );
      return { ...state, notes };
    }

    // 重置为默认状态（退出登录时使用）
    case ACTION.RESET_DEFAULTS:
      return { ...state, notes: [], currentNote: null, searchKeyword: '' };

    // 添加标签（去重）
    case ACTION.ADD_TAG: {
      const tag = action.payload?.trim?.() || action.payload;
      // 如果标签为空或已存在，不做任何操作
      if (!tag || state.customTags.includes(tag)) return state;
      return { ...state, customTags: [...state.customTags, tag] };
    }

    // 移除标签
    case ACTION.REMOVE_TAG:
      return {
        ...state,
        customTags: state.customTags.filter((t) => t !== action.payload),
      };

    // 设置自定义标签列表
    case ACTION.SET_CUSTOM_TAGS:
      return { ...state, customTags: action.payload };

    // 设置标签名称到 ID 的映射
    case ACTION.SET_TAG_MAP:
      return { ...state, tagMap: action.payload };

    // 未知 action 类型，返回原状态
    default:
      return state;
  }
}
