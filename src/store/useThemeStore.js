/**
 * AI-Note 主题状态管理（Zustand）
 *
 * 管理暗色/亮色模式切换，自动同步到 localStorage 和 DOM class。
 */

import { create } from 'zustand';

/** 从 localStorage 或系统偏好获取初始主题 */
function getInitialDark() {
  try {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export const useThemeStore = create((set, get) => ({
  isDark: getInitialDark(),

  /** 切换暗色/亮色模式 */
  toggleDark: () => {
    const next = !get().isDark;
    set({ isDark: next });
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('darkMode', String(next));
  },
}));
