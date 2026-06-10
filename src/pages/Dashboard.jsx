import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { listNotes } from '../api/notes';
import { listTags } from '../api/tags';
import { useAuth } from '../store/AuthContext';
import TagCloud from '../components/TagCloud';
import NoteGrid from '../components/NoteGrid';
import { Search, FileText, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { searchKeyword, notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  /* Load notes and tags from API on mount */
  useEffect(() => {
    dispatch({ type: ACTION.SET_LOADING, payload: true });
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
        dispatch({ type: ACTION.SET_NOTES, payload: mapped });
        if (mapped.length > 0 && !currentNote) {
          dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: mapped[0] });
        }
      })
      .catch((err) => console.error('Failed to load notes', err));

    listTags()
      .then((tags) => {
        const tagNames = (tags || []).map((t) => t.name);
        dispatch({ type: ACTION.SET_CUSTOM_TAGS, payload: tagNames });
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: e.target.value });
  };

  const handleClearSearch = () => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-gray-500">{user.username}</span>}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </header>

        {/* Search */}
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
        </div>

        {/* Tag Cloud */}
        <TagCloud />

        {/* Note Grid */}
        <NoteGrid />
      </div>
    </div>
  );
}
