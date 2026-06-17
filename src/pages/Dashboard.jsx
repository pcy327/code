/**
 * Dashboard 仪表盘页面
 * 展示笔记列表、标签云，提供搜索和主题切换功能
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useNoteStore } from '../store/useNoteStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { listNotes } from '../api/notes';
import { listTags } from '../api/tags';
import TagCloud from '../components/TagCloud';
import NoteGrid from '../components/NoteGrid';
import { Search, FileText, LogOut, Sun, Moon } from 'lucide-react';

export default function Dashboard() {
  // ── 笔记相关：使用 useShallow 批量订阅，避免无意义重渲染 ──
  const { searchKeyword, notes, currentNote } = useNoteStore(
    useShallow((s) => ({
      searchKeyword: s.searchKeyword,
      notes: s.notes,
      currentNote: s.currentNote,
    })),
  );

  const { setNotes, setCurrentNote, setLoading, setSearchKeyword, setCustomTags, setTagMap } =
    useNoteStore(
      useShallow((s) => ({
        setNotes: s.setNotes,
        setCurrentNote: s.setCurrentNote,
        setLoading: s.setLoading,
        setSearchKeyword: s.setSearchKeyword,
        setCustomTags: s.setCustomTags,
        setTagMap: s.setTagMap,
      })),
    );

  // ── 认证 & 主题 ──
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { isDark, toggleDark } = useThemeStore(
    useShallow((s) => ({ isDark: s.isDark, toggleDark: s.toggleDark })),
  );

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);

    listNotes({ page: 1, size: 50 })
      .then((data) => {
        const mapped = (data.records || []).map((n) => ({
          id: String(n.id),
          title: n.title,
          content: '',
          summary: n.summary || '',
          tags: (n.tags || []).map((t) => t.name),
          updatedAt: n.updatedAt,
        }));
        setNotes(mapped);
        if (mapped.length > 0 && !currentNote) {
          setCurrentNote(mapped[0]);
        }
      })
      .catch((err) => console.error('Failed to load notes', err));

    listTags()
      .then((tags) => {
        const tagNames = (tags || []).map((t) => t.name);
        setCustomTags(tagNames);
        const map = {};
        (tags || []).forEach((t) => { map[t.name] = t.id; });
        setTagMap(map);
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e) => setSearchKeyword(e.target.value);
  const handleClearSearch = () => setSearchKeyword('');

  return (<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">AI-Note</h1>
              <p className="text-sm text-gray-400 -mt-0.5 dark:text-slate-500">智能 Markdown 云笔记</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {user && (
              <span className="inline-flex items-center h-8 px-3 text-sm text-gray-500 dark:text-slate-400">
                {user.username}
              </span>
            )}
            <button
              onClick={toggleDark}
              className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
              title={isDark ? '切换亮色模式' : '切换暗色模式'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </header>

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
          {searchKeyword && (
            <button onClick={handleClearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
          )}
        </div>

        <TagCloud />
        <NoteGrid />
      </div>
    </div>
  );
}
