import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { updateNote, deleteNote, listNotes } from '../api/notes';
import { listTags } from '../api/tags';
import { ArrowLeft, RotateCcw, Trash2, Trash } from 'lucide-react';

function contentSnippet(content, maxLen = 60) {
  if (!content) return '暂无内容';
  const plain = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[`*~_>\[\]()]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const firstLine = plain.split('\n').filter(Boolean)[0] || '暂无内容';
  return firstLine.length > maxLen ? firstLine.slice(0, maxLen) + '…' : firstLine;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const { notes, currentNote, tagMap } = useNoteState();
  const dispatch = useNoteDispatch();

  /* Lazy-load notes & tags when empty (covers direct refresh on Workspace) */
  useEffect(() => {
    if (notes.length === 0) {
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
        })
        .catch((err) => console.error('Failed to load notes', err));
    }
  }, []);

  useEffect(() => {
    if (Object.keys(tagMap).length === 0) {
      listTags()
        .then((tags) => {
          const tagNames = (tags || []).map((t) => t.name);
          dispatch({ type: ACTION.SET_CUSTOM_TAGS, payload: tagNames });
          const map = {};
          (tags || []).forEach((t) => { map[t.name] = t.id; });
          dispatch({ type: ACTION.SET_TAG_MAP, payload: map });
        })
        .catch(() => {});
    }
  }, []);

  // Merge currentNote into the list so title/content updates show instantly
  let recentNotes = [...notes]
    .map((n) => n.id === currentNote?.id ? { ...n, title: currentNote.title, content: currentNote.content } : n);

  // Include currentNote even when notes array is empty (e.g. direct refresh on Workspace)
  if (currentNote && !recentNotes.find((n) => n.id === currentNote.id)) {
    recentNotes = [currentNote, ...recentNotes];
  }

  recentNotes = recentNotes
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  const handleBack = async () => {
    if (currentNote) {
      try {
        await updateNote(currentNote.id, {
          title: currentNote.title,
          content: currentNote.content,
          summary: currentNote.summary,
          tagIds: [],
        });
      } catch (err) {
        console.error('Failed to save note', err);
      }
      dispatch({ type: ACTION.SAVE_CURRENT_NOTE });
    }
    navigate('/');
  };

  const handleSwitchNote = async (note) => {
    if (currentNote) {
      try {
        await updateNote(currentNote.id, {
          title: currentNote.title,
          content: currentNote.content,
          summary: currentNote.summary,
          tagIds: [],
        });
      } catch (err) {
        console.error('Failed to save note', err);
      }
      dispatch({ type: ACTION.SAVE_CURRENT_NOTE });
    }
    navigate(`/workspace/${note.id}`);
  };

  const handleDelete = async (e, noteId) => {
    e.stopPropagation();
    try {
      await deleteNote(noteId);
      dispatch({ type: ACTION.DELETE_NOTE, payload: noteId });
      // If deleting the currently open note, navigate back
      if (noteId === currentNote?.id) {
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const handleReset = () => {
    dispatch({ type: ACTION.RESET_DEFAULTS });
    navigate('/');
  };

  const handleTrash = () => {
    navigate('/trash');
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-gray-200 dark:bg-slate-800 dark:border-slate-700">
      <div className="p-3 border-b border-gray-100 dark:border-slate-700">
        <button
          onClick={handleBack}
          className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600
                     bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer
                     dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
          返回大盘
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <h3 className="px-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-slate-500">
          最近笔记
        </h3>
        <div className="space-y-0.5 px-2">
          {recentNotes.map((note) => {
            const isActive = note.id === noteId;
            const snippet = contentSnippet(note.content || note.summary);
            return (
              <div
                key={note.id}
                className={`group/item w-full text-left relative transition-all duration-150 cursor-pointer rounded-lg ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <button
                  onClick={() => handleSwitchNote(note)}
                  className="w-full text-left block"
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full" />
                  )}
                  <div className="pl-3 pr-8 py-2.5">
                    <p className={`text-sm leading-snug line-clamp-1 ${
                      isActive
                        ? 'font-semibold text-blue-700 dark:text-blue-400'
                        : 'font-medium text-gray-800 dark:text-slate-200'
                    }`}>
                      {note.title || '未命名笔记'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 leading-relaxed dark:text-slate-500">
                      {snippet}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded
                             opacity-0 group-hover/item:opacity-100
                             text-gray-300 hover:text-red-500 hover:bg-red-50
                             transition-all duration-150 cursor-pointer
                             dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                  title="删除笔记"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        {recentNotes.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-8 dark:text-slate-600">暂无笔记</p>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 dark:border-slate-700 space-y-1">
        <button
          onClick={handleTrash}
          className="w-full inline-flex items-center gap-1.5 px-3 py-1.5
                     text-xs font-medium text-orange-500 hover:text-orange-700 hover:bg-orange-50
                     rounded-lg transition-colors cursor-pointer
                     dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/30"
          title="回收站"
        >
          <Trash className="w-3 h-3" />
          回收站
        </button>
        <button
          onClick={handleReset}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5
                     text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50
                     rounded-lg transition-colors cursor-pointer
                     dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
          title="清除所有数据并恢复默认笔记"
        >
          <RotateCcw className="w-3 h-3" />
          重置示例数据
        </button>
      </div>
    </aside>
  );
}
