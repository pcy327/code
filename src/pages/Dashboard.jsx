/**
 * Dashboard 仪表盘页面
 * 展示笔记列表、标签云，提供搜索和主题切换功能
 */

// React hooks 导入
import { useEffect } from 'react';
// React Router 路由导航
import { useNavigate } from 'react-router-dom';
// 笔记状态管理
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
// API 接口
import { listNotes } from '../api/notes';
import { listTags } from '../api/tags';
// 用户认证状态
import { useAuth } from '../store/AuthContext';
// 主题状态管理
import { useTheme } from '../store/ThemeContext';
// 组件导入
import TagCloud from '../components/TagCloud';
import NoteGrid from '../components/NoteGrid';
// 图标组件
import { Search, FileText, LogOut, Sun, Moon } from 'lucide-react';

/**
 * Dashboard 组件 - 首页仪表盘
 * 展示笔记列表、标签云、搜索框和用户操作区
 */
export default function Dashboard() {
  // 获取笔记状态
  const { searchKeyword, notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  // 路由导航
  const navigate = useNavigate();
  // 用户认证信息和退出功能
  const { user, logout } = useAuth();
  // 主题切换功能
  const { isDark, toggleDark } = useTheme();

  /**
   * 组件挂载时加载笔记列表和标签数据
   */
  useEffect(() => {
    // 设置加载状态
    dispatch({ type: ACTION.SET_LOADING, payload: true });

    // 加载笔记列表
    listNotes({ page: 1, size: 50 })
      .then((data) => {
        // 转换 API 返回的数据格式
        const mapped = (data.records || []).map((n) => ({
          id: String(n.id),           // 转换为字符串 ID
          title: n.title,             // 标题
          content: '',                // 内容（列表页不加载完整内容）
          summary: n.summary || '',   // 摘要
          tags: (n.tags || []).map((t) => t.name), // 标签名称数组
          updatedAt: n.updatedAt,     // 更新时间
        }));
        // 更新笔记列表状态
        dispatch({ type: ACTION.SET_NOTES, payload: mapped });
        // 如果有笔记且当前没有选中笔记，默认选中第一条
        if (mapped.length > 0 && !currentNote) {
          dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: mapped[0] });
        }
      })
      .catch((err) => console.error('Failed to load notes', err));

    // 加载标签列表
    listTags()
      .then((tags) => {
        // 获取所有标签名称
        const tagNames = (tags || []).map((t) => t.name);
        dispatch({ type: ACTION.SET_CUSTOM_TAGS, payload: tagNames });
        // 创建标签名称到 ID 的映射
        const map = {};
        (tags || []).forEach((t) => { map[t.name] = t.id; });
        dispatch({ type: ACTION.SET_TAG_MAP, payload: map });
      })
      .catch(() => {}); // 标签加载失败不影响主流程
  }, []);

  /**
   * 处理搜索输入变化
   * @param {Event} e - 输入事件
   */
  const handleSearch = (e) => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: e.target.value });
  };

  /**
   * 清除搜索关键词
   */
  const handleClearSearch = () => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: '' });
  };

  /**
   * 渲染仪表盘页面
   */
  return (<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 内容容器，最大宽度限制 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <header className="flex items-center justify-between mb-8">
          {/* Logo 和标题 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">AI-Note</h1>
              <p className="text-sm text-gray-400 -mt-0.5 dark:text-slate-500">智能 Markdown 云笔记</p>
            </div>
          </div>

          {/* 用户操作区 */}
          <div className="flex items-center gap-1">
            {/* 用户名显示 */}
            {user && (
              <span className="inline-flex items-center h-8 px-3 text-sm text-gray-500 dark:text-slate-400">
                {user.username}
              </span>
            )}

            {/* 主题切换按钮 */}
            <button
              onClick={toggleDark}
              className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
              title={isDark ? '切换亮色模式' : '切换暗色模式'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* 退出登录按钮 */}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </header>

        {/* 搜索框 */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchKeyword}
            onChange={handleSearch}
            placeholder="搜索笔记标题、内容或标签…"
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl text-base
                       shadow-sm placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400
                       transition-all duration-200
                       dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200
                       dark:placeholder:text-slate-500 dark:focus:ring-blue-500/40"
          />
          {/* 清除搜索按钮 */}
          {searchKeyword && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* 标签云组件 */}
        <TagCloud />

        {/* 笔记网格列表 */}
        <NoteGrid />
      </div>
    </div>
  );
}
