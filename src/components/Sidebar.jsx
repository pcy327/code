import { useNavigate, useParams } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { updateNote, deleteNote } from '../api/notes';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';

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
  const { notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();

  // Merge currentNote into the list so title/content updates show instantly
  const recentNotes = [...notes]
    .map((n) => n.id === currentNote?.id ? { ...n, title: currentNote.title, content: currentNote.content } : n)
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
    dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: note });
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

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={handleBack}
          className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600
                     bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回大盘
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <h3 className="px-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          最近笔记
        </h3>
        <div className="space-y-0.5 px-2">
          {recentNotes.map((note) => {
            const isActive = note.id === noteId;
            const snippet = contentSnippet(note.content || note.summary);
            return (
              <div
                key={note.id}
                className={`group/item w-full text-left relative transition-all duration-150 cursor-pointer
                  ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'} rounded-lg`}
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
                      isActive ? 'font-semibold text-blue-700' : 'font-medium text-gray-800'
                    }`}>
                      {note.title || '未命名笔记'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">
                      {snippet}
                    </p>
                  </div>
                </button>
                {/* Delete button — visible on hover */}
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded
                             opacity-0 group-hover/item:opacity-100
                             text-gray-300 hover:text-red-500 hover:bg-red-50
                             transition-all duration-150 cursor-pointer"
                  title="删除笔记"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        {recentNotes.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-8">暂无笔记</p>
        )}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleReset}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5
                     text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50
                     rounded-lg transition-colors cursor-pointer"
          title="清除所有数据并恢复默认笔记"
        >
          <RotateCcw className="w-3 h-3" />
          重置示例数据
        </button>
      </div>
    </aside>
  );
}
