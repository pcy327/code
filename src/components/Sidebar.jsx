import { useNavigate, useParams } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { ArrowLeft, RotateCcw } from 'lucide-react';

/**
 * 从 Markdown 内容中提取纯文本摘要（首行）
 */
function contentSnippet(content, maxLen = 60) {
  if (!content) return '暂无内容';
  // 移除 Markdown 标记
  const plain = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[`*~_>\[\]()]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  // 取第一行
  const firstLine = plain.split('\n').filter(Boolean)[0] || '暂无内容';
  return firstLine.length > maxLen
    ? firstLine.slice(0, maxLen) + '…'
    : firstLine;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const { notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();

  /* 最近 5 篇笔记（按 updatedAt 降序） */
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  const handleBack = () => {
    if (currentNote) {
      dispatch({ type: ACTION.SAVE_CURRENT_NOTE });
    }
    navigate('/');
  };

  const handleSwitchNote = (note) => {
    if (currentNote) {
      dispatch({ type: ACTION.SAVE_CURRENT_NOTE });
    }
    dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: note });
    navigate(`/workspace/${note.id}`);
  };

  const handleReset = () => {
    dispatch({ type: ACTION.RESET_DEFAULTS });
    navigate('/');
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-gray-200">
      {/* 返回按钮 */}
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

      {/* 最近笔记列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        <h3 className="px-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          最近笔记
        </h3>

        <div className="space-y-0.5 px-2">
          {recentNotes.map((note) => {
            const isActive = note.id === noteId;
            const snippet = contentSnippet(note.content);

            return (
              <button
                key={note.id}
                onClick={() => handleSwitchNote(note)}
                className={`w-full text-left relative transition-all duration-150 cursor-pointer
                  ${isActive
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                  } rounded-lg`}
              >
                {/* 左侧激活指示条 */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full" />
                )}
                <div className="pl-3 pr-3 py-2.5">
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
            );
          })}
        </div>

        {recentNotes.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-8">暂无笔记</p>
        )}
      </div>

      {/* 底部：重置按钮（开发用） */}
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
