import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import TagCloud from '../components/TagCloud';
import NoteGrid from '../components/NoteGrid';
import { Search, Sparkles, FileText } from 'lucide-react';

export default function Dashboard() {
  const { searchKeyword, notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  const navigate = useNavigate();

  /* 初始加载时，如果还没有选中笔记但列表不为空，选中第一篇 */
  useEffect(() => {
    if (!currentNote && notes.length > 0) {
      dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: notes[0] });
    }
  }, []);

  const handleSearch = (e) => {
    dispatch({
      type: ACTION.SET_SEARCH_KEYWORD,
      payload: e.target.value,
    });
  };

  const handleClearSearch = () => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ---------- 头部 ---------- */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI-Note</h1>
              <p className="text-sm text-gray-400 -mt-0.5">智能 Markdown 云笔记</p>
            </div>
          </div>
        </header>

        {/* ---------- 大搜索框 ---------- */}
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
                       transition-all duration-200"
          />
          {searchKeyword && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          )}
          {/* 搜索提示 */}
          <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-300">
            <Sparkles className="w-3 h-3" />
            <span>AI 增强搜索</span>
          </div>
        </div>

        {/* ---------- 标签云 ---------- */}
        <TagCloud />

        {/* ---------- 笔记网格 ---------- */}
        <NoteGrid />
      </div>
    </div>
  );
}
