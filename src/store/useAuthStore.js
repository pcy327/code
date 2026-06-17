/**
 * AI-Note 认证状态管理（Zustand）
 *
 * 管理用户认证状态、登录/注册/登出操作，
 * 自动同步 token 和 user 到 localStorage。
 */

import { create } from 'zustand';
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth';

/** 从 localStorage 恢复初始状态 */
function getInitialState() {
  let user = null;
  try {
    const saved = localStorage.getItem('user');
    if (saved) user = JSON.parse(saved);
  } catch { /* ignore */ }
  return {
    user,
    token: localStorage.getItem('token'),
    loading: true,
  };
}

export const useAuthStore = create((set, get) => ({
  ...getInitialState(),

  /**
   * 初始化：验证 token 是否有效（应用启动时调用）
   * 相当于原来 AuthContext 中的 useEffect 逻辑
   */
  initialize: async () => {
    const { token } = get();
    if (token) {
      try {
        const user = await getMe();
        set({ user, loading: false });
        localStorage.setItem('user', JSON.stringify(user));
      } catch {
        set({ token: null, user: null, loading: false });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      set({ loading: false });
    }
  },

  /** 登录 */
  login: async (username, password) => {
    const data = await apiLogin(username, password);
    set({ token: data.token, user: data });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  /** 注册 */
  register: async (username, password, email) => {
    const data = await apiRegister(username, password, email);
    set({ token: data.token, user: data });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  /** 退出登录 */
  logout: () => {
    set({ token: null, user: null });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
}));
