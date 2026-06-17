import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useNoteStore } from '../store/useNoteStore';
import { deleteNote } from '../api/notes';
import { Trash2 } from 'lucide-react';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
];

function getTagColor(i) { return TAG_COLORS[i % TAG_COLORS.length]; }

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return d.toLocaleDateString('zh-CN');
}

export default function NoteCard({ note }) {
  const navigate = useNavigate();
  const { setCurrentNote, deleteNote: deleteNoteAction } = useNoteStore(
    useShallow((s) => ({ setCurrentNote: s.setCurrentNote, deleteNote: s.deleteNote })),
  );
  const [deleting, setDeleting] = useState(false);

  const handleClick = () => {
    setCurrentNote(note);
    navigate(`/workspace/${note.id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteNote(note.id);
      deleteNoteAction(note.id);
    } catch (err) {
      console.error('Failed to delete note', err);
      setDeleting(false);
    }
  };

  const snippet = (note.summary ||
    note.content?.replace(/[#*`~>\[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) || '') +
    (note.content?.length > 120 ? '…' : '');

  return (
    <article onClick={handleClick}
      className="group bg-white rounded-xl border border-gray-200 p-5 cursor-pointer
                 hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200
                 flex flex-col animate-fadeIn relative dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-700">
      <button onClick={handleDelete} disabled={deleting}
        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100
                   text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer
                   disabled:opacity-50 dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/30"
        title="删除笔记"><Trash2 className="w-4 h-4" /></button>
      <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors pr-8 dark:text-slate-100 dark:group-hover:text-blue-400">
        {note.title || '未命名笔记'}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3 dark:text-slate-400">{snippet}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(note.tags || []).slice(0, 3).map((tag, i) => (
            <span key={tag} className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(i)} dark:opacity-90`}>{tag}</span>
          ))}
        </div>
        <time className="shrink-0 text-xs text-gray-400 dark:text-slate-500">{formatDate(note.updatedAt)}</time>
      </div>
    </article>
  );
}
