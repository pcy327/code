import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import NoteCard from './NoteCard';
import { Plus } from 'lucide-react';

export default function NoteGrid() {
  const { notes, searchKeyword, isLoading } = useNoteState();
  const dispatch = useNoteDispatch();
  const navigate = useNavigate();

  const filteredNotes = useMemo(() => {
    if (!searchKeyword) return notes;
    const kw = searchKeyword.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(kw) ||
        n.content.toLowerCase().includes(kw) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(kw)),
    );
  }, [notes, searchKeyword]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  /* 新建笔记（如果处于标签搜索状态，自动归类到该标签） */
  const handleNewNote = () => {
    const newId = String(Date.now());
    const tags = searchKeyword ? [searchKeyword] : [];
    dispatch({
      type: ACTION.ADD_NOTE,
      payload: { id: newId, title: '未命名笔记', content: '', summary: '', tags },
    });
    navigate(`/workspace/${newId}`);
  };

  const sectionTitle = searchKeyword
    ? `📁 ${searchKeyword}`
    : '📄 全部笔记';

  if (filteredNotes.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {sectionTitle}
            <span className="ml-2 text-gray-400 font-normal">(0)</span>
          </h2>
          <button
            onClick={handleNewNote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       text-white bg-blue-500 hover:bg-blue-600
                       rounded-lg shadow-sm hover:shadow-md
                       transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            新建
          </button>
        </div>
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg font-medium">暂无笔记</p>
          <p className="text-sm mt-1">
            {searchKeyword ? '换个关键词试试？' : '点击上方按钮创建你的第一篇笔记吧'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {sectionTitle}
          <span className="ml-2 text-gray-400 font-normal">
            ({filteredNotes.length})
          </span>
        </h2>
        <button
          onClick={handleNewNote}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-white bg-blue-500 hover:bg-blue-600
                     rounded-lg shadow-sm hover:shadow-md
                     transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          新建
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredNotes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </section>
  );
}
