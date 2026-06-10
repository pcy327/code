import { useState, useEffect, useCallback, useRef } from 'react';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { slashFactory, SlashProvider } from '@milkdown/plugin-slash';
import { tooltipFactory, TooltipProvider } from '@milkdown/plugin-tooltip';
import { nord } from '@milkdown/theme-nord';
import { replaceAll, getMarkdown, callCommand } from '@milkdown/kit/utils';
import { toggleStrongCommand, toggleEmphasisCommand, toggleInlineCodeCommand, wrapInHeadingCommand, wrapInBulletListCommand, wrapInOrderedListCommand, wrapInBlockquoteCommand, insertHrCommand, createCodeBlockCommand } from '@milkdown/kit/preset/commonmark';
import '@milkdown/theme-nord/style.css';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { generateSummary, suggestTags, optimizeMarkdown } from '../api/ai';
import { updateNote } from '../api/notes';
import { FileText } from 'lucide-react';

/* ===================================================================
 * Slash menu builder — creates DOM element with command items
 * =================================================================== */
function execCmd(editorRef, cmd, ...args) {
  const editor = editorRef.current;
  if (!editor) return;
  try {
    editor.action(callCommand(cmd.key, ...args));
  } catch (e) { console.error('Command failed:', e); }
}

function buildSlashMenu(editorRef) {
  const menu = document.createElement('div');
  menu.className = 'slash-menu';

  const items = [
    { label: '标题 1', icon: 'H1', cmd: () => execCmd(editorRef, wrapInHeadingCommand, 1) },
    { label: '标题 2', icon: 'H2', cmd: () => execCmd(editorRef, wrapInHeadingCommand, 2) },
    { label: '标题 3', icon: 'H3', cmd: () => execCmd(editorRef, wrapInHeadingCommand, 3) },
    { label: '粗体', icon: 'B', cmd: () => execCmd(editorRef, toggleStrongCommand) },
    { label: '斜体', icon: 'I', cmd: () => execCmd(editorRef, toggleEmphasisCommand) },
    { label: '行内代码', icon: '<>', cmd: () => execCmd(editorRef, toggleInlineCodeCommand) },
    { label: '代码块', icon: '```', cmd: () => execCmd(editorRef, createCodeBlockCommand) },
    { label: '引用', icon: '❝', cmd: () => execCmd(editorRef, wrapInBlockquoteCommand) },
    { label: '无序列表', icon: '•', cmd: () => execCmd(editorRef, wrapInBulletListCommand) },
    { label: '有序列表', icon: '1.', cmd: () => execCmd(editorRef, wrapInOrderedListCommand) },
    { label: '分割线', icon: '—', cmd: () => execCmd(editorRef, insertHrCommand) },
  ];

  items.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'slash-item';
    el.innerHTML = `<span class="slash-icon">${item.icon}</span><span>${item.label}</span>`;
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      item.cmd();
      menu.dataset.show = 'false';
    });
    menu.appendChild(el);
  });

  return menu;
}

/* ===================================================================
 * Tooltip builder — selection floating toolbar
 * =================================================================== */
function buildTooltip(editorRef) {
  const bar = document.createElement('div');
  bar.className = 'milkdown-tooltip-bar';

  const btns = [
    { label: 'B', title: '粗体', cmd: () => execCmd(editorRef, toggleStrongCommand) },
    { label: 'I', title: '斜体', cmd: () => execCmd(editorRef, toggleEmphasisCommand) },
    { label: '<>', title: '行内代码', cmd: () => execCmd(editorRef, toggleInlineCodeCommand) },
  ];

  btns.forEach((b) => {
    const btn = document.createElement('button');
    btn.textContent = b.label;
    btn.title = b.title;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      b.cmd();
    });
    bar.appendChild(btn);
  });

  return bar;
}

/* ===================================================================
 * Milkdown inner editor with slash + tooltip
 * =================================================================== */
function MilkdownEditor({ initialContent, onMarkdownChange }) {
  const [loading, get] = useInstance();
  const editorRef = useRef(null);

  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialContent || '');
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener);

    // --- Slash plugin ---
    const slash = slashFactory('ainote-slash');
    const slashMenu = buildSlashMenu(editorRef);
    const slashProvider = new SlashProvider({ content: slashMenu });

    const slashPluginView = (view) => {
      slashProvider.update(view);
      return { update: (v, prev) => slashProvider.update(v, prev), destroy: () => slashProvider.destroy() };
    };

    editor.use(slash).config((ctx) => {
      ctx.set(slash.key, { view: slashPluginView });
    });

    // --- Tooltip plugin ---
    const tooltip = tooltipFactory('ainote-tooltip');
    const tooltipBar = buildTooltip(editorRef);
    const tooltipProvider = new TooltipProvider({ content: tooltipBar });

    const tooltipPluginView = (view) => {
      tooltipProvider.update(view);
      return { update: (v, prev) => tooltipProvider.update(v, prev), destroy: () => tooltipProvider.destroy() };
    };

    editor.use(tooltip).config((ctx) => {
      ctx.set(tooltip.key, { view: tooltipPluginView });
    });

    // --- Listener ---
    editor.config((ctx) => {
      ctx.get(listenerCtx).markdownUpdated((_, md) => {
        onMarkdownChange(md);
      });
    });

    return editor;
  }, []);

  /* Store editor ref for command execution */
  useEffect(() => {
    if (loading) return;
    editorRef.current = get();
  }, [loading]);

  /* Load content when switching notes */
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    const current = editor.action(getMarkdown());
    const incoming = initialContent || '';
    if (incoming !== current) {
      editor.action(replaceAll(incoming));
    }
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

  useEffect(() => {
    if (currentNote?.id !== currentId) {
      setCurrentId(currentNote?.id);
      setLocalContent(currentNote?.content || '');
      lastSavedRef.current = currentNote?.content || '';
    }
  }, [currentNote?.id]);

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
      <div className="shrink-0" style={{ padding: '24px 48px 8px' }}>
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

      {/* Editor */}
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
            {aiLoading ? <p className="text-sm text-gray-500">处理中...</p>
             : aiResult.type === 'summary' ? (
              <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">AI 摘要</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{aiResult.data}</p></div>
            ) : aiResult.type === 'tags' ? (
              <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">智能标签</h4>
              <div className="flex flex-wrap gap-1.5">
                {(aiResult.data || []).map((t) => (<span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">{t}</span>))}
              </div></div>
            ) : aiResult.type === 'error' ? (
              <p className="text-sm text-red-500">{aiResult.data}</p>
            ) : <p className="text-sm text-gray-700">{aiResult.data}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
