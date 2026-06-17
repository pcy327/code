import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useNoteStore } from '../store/useNoteStore';
import { createNote } from '../api/notes';
import NoteCard from './NoteCard';
import { Plus } from 'lucide-react';

export default function NoteGrid() {
  const { notes, searchKeyword, isLoading, tagMap } = useNoteStore(
    useShallow((s) => ({
      notes: s.notes,
      searchKeyword: s.searchKeyword,
      isLoading: s.isLoading,
      tagMap: s.tagMap,
    })),
  );

  const addNote = useNoteStore((s) => s.addNote);
  const navigate = useNavigate();

  const filteredNotes = useMemo(() => {
    if (!searchKeyword) return notes;
    const kw = searchKeyword.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(kw) ||
        (n.summary || '').toLowerCase().includes(kw) ||
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

  const handleNewNote = async () => {
    try {
      const tagIds = [];
      if (searchKeyword && tagMap && tagMap[searchKeyword]) {
        tagIds.push(tagMap[searchKeyword]);
      }
      const data = await createNote({ title: '未命名笔记', content: '', tagIds });
      const newNote = {
        id: String(data.id),
        title: data.title,
        content: '',
        summary: data.summary || '',
        tags: (data.tags || []).map((t) => t.name),
        updatedAt: data.updatedAt,
      };
      addNote(newNote);
      navigate(`/workspace/${data.id}`);
    } catch (err) {
      console.error('Failed to create note', err);
    }
  };

  const sectionTitle = searchKeyword ? `📁 ${searchKeyword}` : '📄 全部笔记';

  if (filteredNotes.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">
            {sectionTitle}
            <span className="ml-2 text-gray-400 font-normal dark:text-slate-500">(0)</span>
          </h2>
          <button onClick={handleNewNote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white
                       bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm hover:shadow-md
                       transition-all duration-150 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />新建
          </button>
        </div>
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg font-medium dark:text-slate-400">暂无笔记</p>
          <p className="text-sm mt-1">{searchKeyword ? '换个关键词试试？' : '点击上方按钮创建你的第一篇笔记吧'}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">
          {sectionTitle}
          <span className="ml-2 text-gray-400 font-normal dark:text-slate-500">({filteredNotes.length})</span>
        </h2>
        <button onClick={handleNewNote}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white
                     bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm hover:shadow-md
                     transition-all duration-150 cursor-pointer">
          <Plus className="w-3.5 h-3.5" />新建
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredNotes.map((note) => <NoteCard key={note.id} note={note} />)}
      </div>
    </section>
  );
}
