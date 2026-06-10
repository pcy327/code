import { useState, useEffect, useCallback, useRef } from 'react';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core';
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
import { updateNote } from '../api/notes';
import { FileText } from 'lucide-react';

/* ===================================================================
 * Helpers
 * =================================================================== */
function execCmd(editorRef, cmd, ...args) {
  const editor = editorRef.current;
  if (!editor) return;
  try {
    const view = editor.ctx.get(editorViewCtx);
    if (view) {
      const { state } = view;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashPos = textBefore.lastIndexOf('/');
      if (slashPos >= 0 && slashPos === textBefore.length - 1) {
        const from = $from.pos - ($from.parentOffset - slashPos);
        view.dispatch(state.tr.delete(from, from + 1));
      }
    }
    editor.action(callCommand(cmd.key, ...args));
  } catch (e) { console.error('Command failed:', e); }
}

/* ===================================================================
 * Streaming AI — parse // prompt, stream tokens into editor
 * =================================================================== */
async function streamAIResponse(editorRef, onUpdate) {
  const editor = editorRef.current;
  if (!editor) return;

  const view = editor.ctx.get(editorViewCtx);
  if (!view) return;

  const { state } = view;
  const { $from } = state.selection;

  // Find the // trigger in current line
  const lineStart = $from.start();
  const lineText = state.doc.textBetween(lineStart, $from.pos);
  const match = lineText.match(/\/\/\s*(.+)/);
  if (!match) return;

  const prompt = match[1].trim();
  if (!prompt) return;

  // Delete the // prompt line
  const triggerStart = lineStart + lineText.indexOf('//');
  const tr = state.tr.delete(triggerStart, $from.pos);
  // Insert newline placeholder for streaming content
  tr.insertText('\n');
  view.dispatch(tr);

  // Wait for state update
  await new Promise(r => setTimeout(r, 50));

  const token = localStorage.getItem('token');
  if (!token) return;

  // Build accumulated content
  let accumulated = '';
  const insertPos = view.state.selection.from;

  try {
    const response = await fetch(`/api/ai/stream?prompt=${encodeURIComponent(prompt)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (!data) continue;

          // Check what event type this belongs to
          // (we parse the preceding event: line)
          const prevLine = lines[lines.indexOf(line) - 1] || '';
          if (prevLine.startsWith('event:error')) {
            throw new Error(data);
          }
          if (prevLine.startsWith('event:done')) break;

          // It's a token
          accumulated += data;

          // Insert/update in editor
          const v = editor.ctx.get(editorViewCtx);
          if (v) {
            const s = v.state;
            // Replace from insertPos to end of inserted content
            const endPos = Math.max(insertPos, s.selection.from);
            const t = s.tr;
            t.replaceWith(insertPos, endPos, s.schema.text(accumulated));
            v.dispatch(t);
          }
        }
      }
    }

    onUpdate(accumulated);
  } catch (err) {
    console.error('AI stream failed:', err);
  }
}

/* ===================================================================
 * Slash menu
 * =================================================================== */
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
    el.addEventListener('mousedown', (e) => { e.preventDefault(); item.cmd(); menu.dataset.show = 'false'; });
    menu.appendChild(el);
  });
  return menu;
}

/* ===================================================================
 * Selection tooltip
 * =================================================================== */
function buildTooltip(editorRef) {
  const bar = document.createElement('div');
  bar.className = 'milkdown-tooltip-bar';
  [{ label: 'B', title: '粗体', cmd: () => execCmd(editorRef, toggleStrongCommand) },
   { label: 'I', title: '斜体', cmd: () => execCmd(editorRef, toggleEmphasisCommand) },
   { label: '<>', title: '行内代码', cmd: () => execCmd(editorRef, toggleInlineCodeCommand) },
  ].forEach((b) => {
    const btn = document.createElement('button');
    btn.textContent = b.label; btn.title = b.title;
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); b.cmd(); });
    bar.appendChild(btn);
  });
  return bar;
}

/* ===================================================================
 * Milkdown inner editor
 * =================================================================== */
function MilkdownEditor({ initialContent, onMarkdownChange, onTriggerAI }) {
  const [loading, get] = useInstance();
  const editorRef = useRef(null);
  const composingRef = useRef(false);

  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => { ctx.set(rootCtx, root); ctx.set(defaultValueCtx, initialContent || ''); })
      .config(nord)
      .use(commonmark).use(gfm).use(history).use(listener);

    // Slash
    const slash = slashFactory('ainote-slash');
    const slashMenu = buildSlashMenu(editorRef);
    const sp = new SlashProvider({ content: slashMenu });
    editor.use(slash).config((ctx) => { ctx.set(slash.key, { view: (v) => { sp.update(v); return { update: (v2, p) => sp.update(v2, p), destroy: () => sp.destroy() }; } }); });

    // Tooltip
    const tooltip = tooltipFactory('ainote-tooltip');
    const tp = new TooltipProvider({ content: buildTooltip(editorRef) });
    editor.use(tooltip).config((ctx) => { ctx.set(tooltip.key, { view: (v) => { tp.update(v); return { update: (v2, p) => tp.update(v2, p), destroy: () => tp.destroy() }; } }); });

    // Listener
    editor.config((ctx) => { ctx.get(listenerCtx).markdownUpdated((_, md) => { if (!composingRef.current) onMarkdownChange(md); }); });

    return editor;
  }, []);

  /* Editor ref + keyboard shortcut + IME */
  useEffect(() => {
    if (loading) return;
    const editor = get();
    editorRef.current = editor;
    let dom;
    try { dom = editor.ctx.get(editorViewCtx).dom; } catch (e) {}
    if (!dom) return;

    // IME composition
    const onCompStart = () => { composingRef.current = true; };
    const onCompEnd = () => { composingRef.current = false; setTimeout(() => onMarkdownChange(editor.action(getMarkdown())), 50); };
    dom.addEventListener('compositionstart', onCompStart);
    dom.addEventListener('compositionend', onCompEnd);

    // Ctrl+Enter → AI streaming
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onTriggerAI(editorRef);
      }
    };
    dom.addEventListener('keydown', onKeyDown);

    return () => {
      dom.removeEventListener('compositionstart', onCompStart);
      dom.removeEventListener('compositionend', onCompEnd);
      dom.removeEventListener('keydown', onKeyDown);
    };
  }, [loading]);

  /* Load content on note switch */
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    const current = editor.action(getMarkdown());
    if ((initialContent || '') !== current) editor.action(replaceAll(initialContent || ''));
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
  const [aiStatus, setAiStatus] = useState(null); // 'streaming' | null

  useEffect(() => {
    if (currentNote?.id !== currentId) {
      setCurrentId(currentNote?.id);
      setLocalContent(currentNote?.content || '');
      lastSavedRef.current = currentNote?.content || '';
    }
  }, [currentNote?.id]);

  const handleMarkdownChange = useCallback((md) => {
    setLocalContent(md);
    // Extract headings
    const headings = [];
    if (md) {
      const lines = md.split('\n'); let idx = 0;
      for (const line of lines) { const m = line.match(/^(#{1,3})\s+(.+)$/); if (m) headings.push({ id: `h-${++idx}`, level: m[1].length, text: m[2].trim() }); }
    }
    onHeadingsChange?.(headings);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: md } });
      if (currentNote?.id && md !== lastSavedRef.current) {
        updateNote(currentNote.id, { content: md }).catch(() => {});
        lastSavedRef.current = md;
      }
    }, 800);
  }, [dispatch, currentNote?.id, onHeadingsChange]);

  /* AI trigger — called on Ctrl+Enter */
  const handleTriggerAI = useCallback(async (editorRef) => {
    if (aiStatus === 'streaming') return;
    setAiStatus('streaming');
    try {
      await streamAIResponse(editorRef, (finalMd) => {
        // After streaming done, sync state
        const editor = editorRef.current;
        if (editor) {
          const full = editor.action(getMarkdown());
          setLocalContent(full);
          dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: full } });
          if (currentNote?.id) updateNote(currentNote.id, { content: full }).catch(() => {});
        }
      });
    } catch (e) { console.error(e); }
    setAiStatus(null);
  }, [aiStatus, currentNote?.id, dispatch]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
  }, []);

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
        <input type="text" value={currentNote.title || ''}
          onChange={(e) => {
            const t = e.target.value;
            dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'title', value: t } });
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
            titleDebounceRef.current = setTimeout(() => { if (currentNote?.id) updateNote(currentNote.id, { title: t }).catch(() => {}); }, 800);
          }}
          placeholder="无标题笔记"
          className="w-full text-4xl font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent border-none outline-none focus:ring-0 tracking-tight leading-tight"
          style={{ fontFamily: "'Georgia', 'Noto Serif SC', serif" }}
        />
      </div>

      {/* AI status bar */}
      {aiStatus === 'streaming' && (
        <div className="flex items-center gap-2 px-12 py-1">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-blue-500">AI 正在生成...</span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 48px 120px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <MilkdownProvider>
            <MilkdownEditor key={currentId} initialContent={localContent}
              onMarkdownChange={handleMarkdownChange} onTriggerAI={handleTriggerAI} />
          </MilkdownProvider>
        </div>
        {/* Hint */}
        <div className="text-center mt-4 text-xs text-gray-300">
          输入 <code className="bg-gray-100 px-1 rounded">// 你的问题</code> 然后 <code className="bg-gray-100 px-1 rounded">Ctrl+Enter</code> 召唤 AI
        </div>
      </div>
    </div>
  );
}
