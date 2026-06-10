import { useState, useEffect, useCallback, useRef } from 'react';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { nord } from '@milkdown/theme-nord';
import { replaceAll, getMarkdown } from '@milkdown/kit/utils';
import '@milkdown/theme-nord/style.css';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { generateSummary, suggestTags, optimizeMarkdown } from '../api/ai';
import { updateNote } from '../api/notes';
import { FileText } from 'lucide-react';

/* ===================================================================
 * Milkdown inner editor
 * =================================================================== */
function MilkdownEditor({ initialContent, onMarkdownChange }) {
  const [loading, get] = useInstance();
  const loadedRef = useRef(false);

  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialContent || '');
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .config((ctx) => {
        ctx.get(listenerCtx).markdownUpdated((_, md) => {
          onMarkdownChange(md);
        });
      });
  }, []);

  /* Load content when initialContent changes (note switch) */
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    const current = editor.action(getMarkdown());
    const incoming = initialContent || '';
    if (incoming !== current) {
      editor.action(replaceAll(incoming));
    }
    loadedRef.current = true;
  }, [initialContent, loading]);

  return <Milkdown />;
}

/* ===================================================================
 * EditorPanel — parent
 * =================================================================== */
export default function EditorPanel({ onHeadingsChange }) {
  const { currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  const debounceRef = useRef(null);
  const titleDebounceRef = useRef(null);
  const lastSavedRef = useRef('');

  const [localContent, setLocalContent] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  /* When switching notes, reset content */
  useEffect(() => {
    if (currentNote?.id !== currentId) {
      setCurrentId(currentNote?.id);
      setLocalContent(currentNote?.content || '');
      lastSavedRef.current = currentNote?.content || '';
    }
  }, [currentNote?.id]);

  /* Content change from Milkdown */
  const handleMarkdownChange = useCallback((md) => {
    setLocalContent(md);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: md } });
      if (currentNote?.id && md !== lastSavedRef.current) {
        updateNote(currentNote.id, { content: md }).catch(() => {});
        lastSavedRef.current = md;
      }
    }, 800);
  }, [dispatch, currentNote?.id]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
  }, []);

  /* AI actions */
  const handleAI = async (fn, type) => {
    setAiLoading(true); setAiResult(null);
    try {
      const d = await fn(localContent);
      if (type === 'optimize' && d.content) {
        setLocalContent(d.content);
        dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: d.content } });
        if (currentNote?.id) updateNote(currentNote.id, { content: d.content }).catch(() => {});
        lastSavedRef.current = d.content;
      }
      setAiResult({ type, data: d.summary || d.tags || d.content || '完成' });
    } catch (err) { setAiResult({ type: 'error', data: err.message }); }
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
      <div className="shrink-0 pt-6 pb-2" style={{ padding: '24px 48px 8px' }}>
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

      {/* WYSIWYG Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 48px 120px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <MilkdownProvider>
            <MilkdownEditor
              key={currentId}
              initialContent={localContent}
              onMarkdownChange={handleMarkdownChange}
            />
          </MilkdownProvider>
        </div>
      </div>

      {/* AI floating bar */}
      <div className="ai-bar">
        <button onClick={() => handleAI(generateSummary, 'summary')} disabled={aiLoading || !localContent}
          className="ai-bar-btn">📝 摘要</button>
        <button onClick={() => handleAI(suggestTags, 'tags')} disabled={aiLoading || !localContent}
          className="ai-bar-btn">🏷 标签</button>
        <button onClick={() => handleAI(optimizeMarkdown, 'optimize')} disabled={aiLoading || !localContent}
          className="ai-bar-btn">✨ 优化</button>
        {aiResult && (
          <div className="ai-popover">
            <button onClick={() => setAiResult(null)} className="ai-popover-close">✕</button>
            {aiLoading ? (
              <p className="text-sm text-gray-500">处理中...</p>
            ) : aiResult.type === 'summary' ? (
              <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">AI 摘要</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{aiResult.data}</p></div>
            ) : aiResult.type === 'tags' ? (
              <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">智能标签</h4>
              <div className="flex flex-wrap gap-1.5">
                {(aiResult.data || []).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">{t}</span>
                ))}
              </div></div>
            ) : aiResult.type === 'error' ? (
              <p className="text-sm text-red-500">{aiResult.data}</p>
            ) : (
              <p className="text-sm text-gray-700">{aiResult.data}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
