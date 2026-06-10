import { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { generateSummary, suggestTags, optimizeMarkdown } from '../api/ai';
import { updateNote } from '../api/notes';
import { FileText, Sparkles, Tags, AlignLeft } from 'lucide-react';

function extractHeadingsFromMarkdown(md) {
  if (!md) return [];
  const lines = md.split('\n');
  const headings = [];
  let idx = 0;
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      headings.push({ id: `h-${++idx}`, level: m[1].length, text: m[2].trim() });
    }
  }
  return headings;
}

export default function EditorPanel({ onHeadingsChange }) {
  const { currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  const debounceRef = useRef(null);
  const titleDebounceRef = useRef(null);

  const [localContent, setLocalContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [aiPanel, setAiPanel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  /* Sync when switching notes */
  useEffect(() => {
    setLocalContent(currentNote?.content || '');
    if (currentNote) {
      onHeadingsChange?.(extractHeadingsFromMarkdown(currentNote.content || ''));
    }
  }, [currentNote?.id]);

  /* Content change — debounce save */
  const handleChange = useCallback((value) => {
    const text = value || '';
    setLocalContent(text);
    onHeadingsChange?.(extractHeadingsFromMarkdown(text));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: text } });
      if (currentNote?.id) updateNote(currentNote.id, { content: text }).catch(() => {});
    }, 800);
  }, [dispatch, onHeadingsChange, currentNote?.id]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
  }, []);

  /* ---- AI ---- */
  const doAI = async (fn, panel) => {
    setAiPanel(panel); setAiLoading(true); setAiResult(null);
    try {
      const d = await fn(localContent);
      setAiResult(d.summary || d.tags || d.content || '完成');
      if (panel === 'optimize' && d.content) {
        setLocalContent(d.content);
        dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: d.content } });
        if (currentNote?.id) updateNote(currentNote.id, { content: d.content }).catch(() => {});
      }
    } catch (err) {
      setAiResult('失败：' + err.message);
    }
    setAiLoading(false);
  };

  if (!currentNote) {
    return (
      <div className="h-full flex items-center justify-center text-gray-300 bg-white">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-3 text-gray-200" />
          <p className="text-base">选择或新建一篇笔记开始编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
      {/* Title */}
      <div className="shrink-0 pt-6 pb-3 px-12">
        <input
          type="text"
          value={currentNote.title || ''}
          onChange={(e) => {
            const t = e.target.value;
            dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'title', value: t } });
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
            titleDebounceRef.current = setTimeout(() => {
              if (currentNote?.id) updateNote(currentNote.id, { title: t }).catch(() => {});
            }, 800);
          }}
          placeholder="无标题笔记"
          className="w-full text-4xl font-extrabold text-gray-900 placeholder:text-gray-200
                     bg-transparent border-none outline-none focus:ring-0 tracking-tight leading-tight"
          style={{ fontFamily: "'Georgia', 'Noto Serif SC', serif" }}
        />
      </div>

      {/* Toolbar row: preview toggle + AI buttons */}
      <div className="shrink-0 flex items-center gap-2 px-12 pb-2 border-b border-gray-100">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`text-xs px-3 py-1 rounded-md cursor-pointer transition-colors ${
            showPreview ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          {showPreview ? '隐藏预览' : '显示预览'}
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <button onClick={() => doAI(generateSummary, 'summary')} disabled={aiLoading || !localContent}
          className="text-xs px-3 py-1 rounded-md cursor-pointer text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-30">
          摘要
        </button>
        <button onClick={() => doAI(suggestTags, 'tags')} disabled={aiLoading || !localContent}
          className="text-xs px-3 py-1 rounded-md cursor-pointer text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30">
          标签
        </button>
        <button onClick={() => doAI(optimizeMarkdown, 'optimize')} disabled={aiLoading || !localContent}
          className="text-xs px-3 py-1 rounded-md cursor-pointer text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30">
          优化
        </button>

        {/* AI result */}
        {aiPanel && (
          <div className="ml-auto flex items-center gap-2">
            {aiLoading ? (
              <span className="text-xs text-gray-400">处理中...</span>
            ) : (
              <div className="text-xs max-w-xs truncate">
                {aiPanel === 'summary' && <span className="text-gray-600">{aiResult}</span>}
                {aiPanel === 'tags' && (
                  <span className="flex gap-1">
                    {(aiResult || []).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{t}</span>
                    ))}
                  </span>
                )}
                {aiPanel === 'optimize' && <span className="text-gray-600">{aiResult}</span>}
              </div>
            )}
            <button onClick={() => { setAiPanel(null); setAiResult(null); }}
              className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0" data-color-mode="light">
        <MDEditor
          value={localContent}
          onChange={handleChange}
          preview={showPreview ? 'live' : 'edit'}
          height="100%"
          visibleDragbar={false}
          commands={[]}
          extraCommands={[]}
          className="!bg-transparent !border-none !shadow-none"
        />
      </div>
    </div>
  );
}
