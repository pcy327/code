import { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { generateSummary, suggestTags, optimizeMarkdown } from '../api/ai';
import { updateNote } from '../api/notes';
import { FileText } from 'lucide-react';

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
  const handleAISummary = async () => {
    setAiLoading(true); setAiResult(null);
    try {
      const d = await generateSummary(localContent);
      setAiResult({ type: 'summary', content: d.summary });
    } catch (err) { setAiResult({ type: 'error', content: err.message }); }
    setAiLoading(false);
  };
  const handleAITags = async () => {
    setAiLoading(true); setAiResult(null);
    try {
      const d = await suggestTags(localContent);
      setAiResult({ type: 'tags', content: d.tags || [] });
    } catch (err) { setAiResult({ type: 'error', content: err.message }); }
    setAiLoading(false);
  };
  const handleAIOptimize = async () => {
    setAiLoading(true); setAiResult(null);
    try {
      const d = await optimizeMarkdown(localContent);
      setLocalContent(d.content);
      dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: d.content } });
      if (currentNote?.id) updateNote(currentNote.id, { content: d.content }).catch(() => {});
      setAiResult({ type: 'text', content: '排版优化完成！' });
    } catch (err) { setAiResult({ type: 'error', content: err.message }); }
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
      <div className="shrink-0 pt-6 pb-2 px-12">
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

      {/* Editor with toolbar */}
      <div className="flex-1 min-h-0 relative" data-color-mode="light">
        <MDEditor
          value={localContent}
          onChange={handleChange}
          preview="live"
          height="100%"
          visibleDragbar={false}
          commands={commands.getCommands()}
          extraCommands={[]}
          className="!bg-transparent !border-none !shadow-none"
        />

        {/* AI buttons — top-right of toolbar */}
        <div className="ai-toolbar-actions">
          <button onClick={handleAISummary} disabled={aiLoading || !localContent}
            className="ai-toolbar-btn ai-btn-purple">
            <FileText className="w-3.5 h-3.5" /> 摘要
          </button>
          <button onClick={handleAITags} disabled={aiLoading || !localContent}
            className="ai-toolbar-btn ai-btn-emerald">
            <FileText className="w-3.5 h-3.5" /> 标签
          </button>
          <button onClick={handleAIOptimize} disabled={aiLoading || !localContent}
            className="ai-toolbar-btn ai-btn-amber">
            ✨ 优化
          </button>

          {/* AI result popover */}
          {aiResult && (
            <div className="ai-popover">
              <button onClick={() => setAiResult(null)} className="ai-popover-close">✕</button>
              {aiLoading ? (
                <div className="flex items-center justify-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">处理中…</span>
                </div>
              ) : aiResult.type === 'summary' ? (
                <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">📝 AI 摘要</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{aiResult.content}</p></div>
              ) : aiResult.type === 'tags' ? (
                <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">🏷 智能标签</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(aiResult.content || []).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">{t}</span>
                  ))}
                </div></div>
              ) : (
                <p className="text-sm text-gray-700">{aiResult.content}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
