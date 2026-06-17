/**
 * AI-Note 笔记状态管理（Zustand + Immer）
 *
 * 统一管理笔记列表、当前笔记、标签、搜索等全局状态。
 * 使用 immer 中间件实现可变式更新语法，简化嵌套对象操作。
 *
 * 数据持久化由后端 API 处理，store 仅管理前端状态。
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/** 初始状态 */
const initialState = {
  notes: [],           // 笔记列表
  currentNote: null,   // 当前选中的笔记
  isAiLoading: false,  // AI 功能加载状态
  isLoading: false,    // 通用加载状态
  searchKeyword: '',   // 搜索关键词
  customTags: [],      // 自定义标签列表
  tagMap: {},          // 标签名称 → 标签 ID 映射
};

/**
 * 使用 immer 中间件包裹 store：
 * set((state) => { ... }) 中 state 是 immer draft，
 * 可以直接使用 mutable 赋值（state.x = y），
 * 不必手动创建新对象。
 */
export const useNoteStore = create(
  immer((set) => ({
    ...initialState,

    /* ---- Action Methods ---- */

    /** 设置笔记列表（同时关闭加载状态） */
    setNotes: (notes) =>
      set((state) => {
        state.notes = notes;
        state.isLoading = false;
      }),

    /** 设置当前选中的笔记 */
    setCurrentNote: (note) =>
      set((state) => {
        state.currentNote = note;
      }),

    /** 更新当前笔记的某个字段 */
    updateCurrentNoteField: (field, value) =>
      set((state) => {
        if (!state.currentNote) return;
        state.currentNote[field] = value;
        if (field === 'content' || field === 'title') {
          state.currentNote.updatedAt = new Date().toISOString();
        }
      }),

    /** 设置 AI 加载状态 */
    setAiLoading: (loading) =>
      set((state) => {
        state.isAiLoading = loading;
      }),

    /** 设置通用加载状态 */
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    /** 设置搜索关键词 */
    setSearchKeyword: (keyword) =>
      set((state) => {
        state.searchKeyword = keyword;
      }),

    /** 添加新笔记 */
    addNote: (payload) =>
      set((state) => {
        const newNote = payload?.id
          ? { ...payload, updatedAt: new Date().toISOString() }
          : {
              id: String(Date.now()),
              title: '未命名笔记',
              content: '',
              summary: '',
              tags: [],
              updatedAt: new Date().toISOString(),
            };
        state.notes.unshift(newNote);
        state.currentNote = newNote;
      }),

    /** 删除笔记 */
    deleteNote: (id) =>
      set((state) => {
        state.notes = state.notes.filter((n) => n.id !== id);
        if (state.currentNote?.id === id) state.currentNote = null;
      }),

    /** 将当前笔记保存到列表中 */
    saveCurrentNote: () =>
      set((state) => {
        if (!state.currentNote) return;
        const idx = state.notes.findIndex((n) => n.id === state.currentNote.id);
        if (idx !== -1) {
          state.notes[idx] = {
            ...state.currentNote,
            updatedAt: state.notes[idx].updatedAt,
          };
        }
      }),

    /** 重置为默认状态（退出登录时使用） */
    resetDefaults: () =>
      set((state) => {
        state.notes = [];
        state.currentNote = null;
        state.searchKeyword = '';
      }),

    /** 添加标签（去重） */
    addTag: (tag) =>
      set((state) => {
        const trimmed = tag?.trim?.() ?? tag;
        if (!trimmed || state.customTags.includes(trimmed)) return;
        state.customTags.push(trimmed);
      }),

    /** 移除标签 */
    removeTag: (tag) =>
      set((state) => {
        state.customTags = state.customTags.filter((t) => t !== tag);
      }),

    /** 设置自定义标签列表 */
    setCustomTags: (tags) =>
      set((state) => {
        state.customTags = tags;
      }),

    /** 设置标签映射 */
    setTagMap: (map) =>
      set((state) => {
        state.tagMap = map;
      }),
  })),
);
