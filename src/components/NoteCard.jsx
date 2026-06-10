import { useNavigate } from 'react-router-dom';
import { useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
];

function getTagColor(index) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

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
  const dispatch = useNoteDispatch();

  const handleClick = () => {
    dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: note });
    navigate(`/workspace/${note.id}`);
  };

  /* 简易版摘要：取 content 前 120 字符，去除 Markdown 符号 */
  const snippet = (note.summary ||
    note.content
      ?.replace(/[#*`~>\[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || '')
    + (note.content?.length > 120 ? '…' : '');

  return (
    <article
      onClick={handleClick}
      className="group bg-white rounded-xl border border-gray-200 p-5 cursor-pointer
                 hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5
                 transition-all duration-200 flex flex-col animate-fadeIn"
    >
      {/* 标题 */}
      <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {note.title || '未命名笔记'}
      </h3>

      {/* 摘要 */}
      <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3">
        {snippet}
      </p>

      {/* 底部：标签 + 时间 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(note.tags || []).slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(i)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <time className="shrink-0 text-xs text-gray-400">
          {formatDate(note.updatedAt)}
        </time>
      </div>
    </article>
  );
}
