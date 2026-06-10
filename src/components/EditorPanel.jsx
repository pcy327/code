import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { Editor, rootCtx } from '@milkdown/kit/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll, getMarkdown } from '@milkdown/kit/utils';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { generateSummary, suggestTags, optimizeMarkdown } from '../api/ai';
import { updateNote } from '../api/notes';
import { FileText, Sparkles, Tags, AlignLeft } from 'lucide-react';

/* ===================================================================
 * Milkdown inner editor — handles content sync
 * =================================================================== */
function MilkdownInner({ content, onContentChange }) {
  const [loading, getInstance] = useInstance();
  const contentRef = useRef(content);
  contentRef.current = content;

  // Init editor only once
  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .config((ctx) => {
        ctx.get(listenerCtx).markdownUpdated((_, md) => {
          onContentChange(md);
        });
      });
  }, []);

  // Set initial content when editor is ready
  useEffect(() => {
    if (loading) return;
    const editor = getInstance();
    if (!editor) return;
    if (contentRef.current) {
      editor.action(replaceAll(contentRef.current));
    }
  }, [loading]);

  // Switch content when note changes (editor already loaded)
  useEffect(() => {
    if (loading) return;
    const editor = getInstance();
    if (!editor) return;
    const currentMd = editor.action(getMarkdown());
    if (content && content !== currentMd) {
      editor.action(replaceAll(content));
    }
  }, [content]);

  return <Milkdown />;
}

/* ===================================================================
 * EditorPanel
 * =================================================================== */
export default function EditorPanel({ onHeadingsChange }) {
  const { currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  const debounceRef = useRef(null);
  const titleDebounceRef = useRef(null);
  const lastSavedContentRef = useRef('');

  const [localContent, setLocalContent] = useState('');
  const [aiPanel, setAiPanel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  /* Sync when note changes */
  useEffect(() => {
    const c = currentNote?.content || '';
    setLocalContent(c);
    lastSavedContentRef.current = c;
  }, [currentNote?.id]);

  /* Content change from Milkdown — debounce save */
  const handleContentChange = useCallback((md) => {
    setLocalContent(md);
    // Extract headings
    onHeadingsChange?.(extractHeadingsFromMarkdown(md));
    // Debounce save to store + API
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({
        type: ACTION.UPDATE_CURRENT_NOTE_FIELD,
        payload: { field: 'content', value: md },
      });
      if (currentNote?.id && md !== lastSavedContentRef.current) {
        updateNote(currentNote.id, { content: md }).catch(() => {});
        lastSavedContentRef.current = md;
      }
    }, 800);
  }, [dispatch, onHeadingsChange, currentNote?.id]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
  }, []);

  /* ---- AI actions ---- */
  const handleAISummary = async () => {
    setAiPanel('summary'); setAiLoading(true); setAiResult(null);
    try {
      const data = await generateSummary(localContent);
      setAiResult(data.summary);
    } catch (err) {
      setAiResult('AI 摘要生成失败：' + err.message);
    }
    setAiLoading(false);
  };

  const handleAITags = async () => {
    setAiPanel('tags'); setAiLoading(true); setAiResult(null);
    try {
      const data = await suggestTags(localContent);
      setAiResult(data.tags || []);
    } catch (err) {
      setAiResult(['生成失败，请重试']);
    }
    setAiLoading(false);
  };

  const handleAIOptimize = async () => {
    setAiPanel('optimize'); setAiLoading(true); setAiResult(null);
    try {
      const data = await optimizeMarkdown(localContent);
      setLocalContent(data.content);
      dispatch({
        type: ACTION.UPDATE_CURRENT_NOTE_FIELD,
        payload: { field: 'content', value: data.content },
      });
      if (currentNote?.id) {
        updateNote(currentNote.id, { content: data.content }).catch(() => {});
      }
      setAiResult('排版优化完成！');
    } catch (err) {
      setAiResult('AI 优化失败：' + err.message);
    }
    setAiLoading(false);
  };

  /* ---- Empty state ---- */
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
    <div className="flex-1 flex flex-col bg-white">
      {/* Title */}
      <div className="shrink-0 pt-6 pb-2" style={{ paddingLeft: '48px', paddingRight: '48px' }}>
        <input
          type="text"
          value={currentNote.title || ''}
          onChange={(e) => {
            const newTitle = e.target.value;
            dispatch({
              type: ACTION.UPDATE_CURRENT_NOTE_FIELD,
              payload: { field: 'title', value: newTitle },
            });
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
            titleDebounceRef.current = setTimeout(() => {
              if (currentNote?.id) {
                updateNote(currentNote.id, { title: newTitle }).catch(() => {});
              }
            }, 800);
          }}
          placeholder="无标题笔记"
          className="w-full text-4xl font-extrabold text-gray-900 placeholder:text-gray-200
                     bg-transparent border-none outline-none focus:ring-0 tracking-tight
                     leading-tight"
          style={{ fontFamily: "'Georgia', 'Noto Serif SC', serif" }}
        />
      </div>

      {/* WYSIWYG Editor body */}
      <div className="flex-1 min-h-0 overflow-y-auto relative" style={{ paddingLeft: '48px', paddingRight: '48px' }}>
        <MilkdownProvider>
          <MilkdownInner
            content={localContent}
            onContentChange={handleContentChange}
          />
        </MilkdownProvider>

        {/* AI floating bar */}
        <div className="ai-bar">
          <button onClick={handleAISummary} disabled={aiLoading || !localContent}
            className="ai-bar-btn">
            <AlignLeft className="w-3.5 h-3.5" /> 摘要
          </button>
          <button onClick={handleAITags} disabled={aiLoading || !localContent}
            className="ai-bar-btn">
            <Tags className="w-3.5 h-3.5" /> 标签
          </button>
          <button onClick={handleAIOptimize} disabled={aiLoading || !localContent}
            className="ai-bar-btn">
            <Sparkles className="w-3.5 h-3.5" /> 优化
          </button>

          {/* AI result popover */}
          {aiPanel && (
            <div className="ai-popover">
              <button onClick={() => { setAiPanel(null); setAiResult(null); }}
                className="ai-popover-close">✕</button>
              {aiLoading ? (
                <div className="flex items-center justify-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">处理中…</span>
                </div>
              ) : (
                <>
                  {aiPanel === 'summary' && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">AI 摘要</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{aiResult}</p>
                    </div>
                  )}
                  {aiPanel === 'tags' && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">智能标签</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(aiResult || []).map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiPanel === 'optimize' && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">一键优化</h4>
                      <p className="text-sm text-gray-700">{aiResult}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
 * Utility
 * =================================================================== */
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
