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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { updateNote } from '../api/notes';
import { FileText, Bot, X, Copy, Check } from 'lucide-react';

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
 * AI Stream — fetches SSE, accumulates tokens, returns full text
 * =================================================================== */

async function fetchAIStream(prompt, onToken) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not logged in');

  const resp = await fetch(`/api/ai/stream?prompt=${encodeURIComponent(prompt)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('data:')) continue;

      // Extract raw data — NO trim, NO fixMarkdown
      const data = line.startsWith('data: ')
        ? line.slice(6)   // "data: " → 6 chars
        : line.slice(5);  // "data:"  → 5 chars

      const prevLine = i > 0 ? lines[i - 1] : '';
      if (prevLine.startsWith('event:error')) throw new Error(data);
      if (prevLine.startsWith('event:done')) {
        onToken(accumulated);
        return accumulated;
      }

      // Restore newlines: consecutive data: lines = multi-line content
      if (prevLine.startsWith('data:')) {
        accumulated += '\n';
      }
      accumulated += data;
      onToken(accumulated);
    }
  }
  return accumulated;
}

/* ===================================================================
 * AI Bubble component — styled card with Markdown rendering
 * =================================================================== */
function AiBubble({ content, streaming, onClose, onInsert }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ai-bubble">
      <div className="ai-bubble-header">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-600">AI 回答</span>
          {streaming && (
            <span className="flex items-center gap-1 text-xs text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              生成中...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="ai-bubble-icon-btn" title="复制">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onInsert} className="ai-bubble-icon-btn" title="插入到笔记">
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="ai-bubble-icon-btn" title="关闭">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="ai-bubble-body">
        {content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>{children}</code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <p className="text-gray-300 italic">等待 AI 回复...</p>
        )}
      </div>
    </div>
  );
}

/* ===================================================================
 * Slash menu
 * =================================================================== */
function buildSlashMenu(editorRef) {
  const menu = document.createElement('div');
  menu.className = 'slash-menu';
  [
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
  ].forEach((item) => {
    const el = document.createElement('div');
    el.className = 'slash-item';
    el.innerHTML = `<span class="slash-icon">${item.icon}</span><span>${item.label}</span>`;
    el.addEventListener('mousedown', (e) => { e.preventDefault(); item.cmd(); menu.dataset.show = 'false'; });
    menu.appendChild(el);
  });
  return menu;
}

function buildTooltip(editorRef) {
  const bar = document.createElement('div');
  bar.className = 'milkdown-tooltip-bar';
  [
    { label: 'B', title: '粗体', cmd: () => execCmd(editorRef, toggleStrongCommand) },
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
      .config(nord).use(commonmark).use(gfm).use(history).use(listener);

    const slash = slashFactory('ainote-slash');
    const sp = new SlashProvider({ content: buildSlashMenu(editorRef) });
    editor.use(slash).config((ctx) => { ctx.set(slash.key, { view: (v) => { sp.update(v); return { update: (v2, p) => sp.update(v2, p), destroy: () => sp.destroy() }; } }); });

    const tooltip = tooltipFactory('ainote-tooltip');
    const tp = new TooltipProvider({ content: buildTooltip(editorRef) });
    editor.use(tooltip).config((ctx) => { ctx.set(tooltip.key, { view: (v) => { tp.update(v); return { update: (v2, p) => tp.update(v2, p), destroy: () => tp.destroy() }; } }); });

    editor.config((ctx) => { ctx.get(listenerCtx).markdownUpdated((_, md) => { if (!composingRef.current) onMarkdownChange(md); }); });
    return editor;
  }, []);

  useEffect(() => {
    if (loading) return;
    const editor = get();
    editorRef.current = editor;
    let dom;
    try { dom = editor.ctx.get(editorViewCtx).dom; } catch (e) { }
    if (!dom) return;
    const onCS = () => { composingRef.current = true; };
    const onCE = () => { composingRef.current = false; setTimeout(() => onMarkdownChange(editor.action(getMarkdown())), 50); };
    dom.addEventListener('compositionstart', onCS);
    dom.addEventListener('compositionend', onCE);

    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onTriggerAI(editorRef); }
    };
    dom.addEventListener('keydown', onKey);

    return () => {
      dom.removeEventListener('compositionstart', onCS);
      dom.removeEventListener('compositionend', onCE);
      dom.removeEventListener('keydown', onKey);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    const cur = editor.action(getMarkdown());
    if ((initialContent || '') !== cur) editor.action(replaceAll(initialContent || ''));
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
  const [aiState, setAiState] = useState(null); // { content, streaming }

  useEffect(() => {
    if (currentNote?.id !== currentId) {
      setCurrentId(currentNote?.id);
      setLocalContent(currentNote?.content || '');
      lastSavedRef.current = currentNote?.content || '';
      setAiState(null);
    }
  }, [currentNote?.id]);

  const syncContent = useCallback((md) => {
    setLocalContent(md);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: md } });
      if (currentNote?.id && md !== lastSavedRef.current) {
        updateNote(currentNote.id, { content: md }).catch(() => { });
        lastSavedRef.current = md;
      }
    }, 800);
  }, [dispatch, currentNote?.id]);

  const handleMarkdownChange = useCallback((md) => {
    setLocalContent(md);
    const headings = [];
    if (md) {
      const lines = md.split('\n'); let idx = 0;
      for (const line of lines) { const m = line.match(/^(#{1,3})\s+(.+)$/); if (m) headings.push({ id: `h-${++idx}`, level: m[1].length, text: m[2].trim() }); }
    }
    onHeadingsChange?.(headings);
    syncContent(md);
  }, [syncContent, onHeadingsChange]);

  /* AI trigger */
  const handleTriggerAI = useCallback(async (editorRef) => {
    const editor = editorRef.current;
    if (!editor) return;

    const view = editor.ctx.get(editorViewCtx);
    if (!view) return;
    const { state } = view;
    const { $from } = state.selection;
    const lineStart = $from.start();
    const lineText = state.doc.textBetween(lineStart, $from.pos);
    const match = lineText.match(/\/\/\s*(.+)/);
    if (!match) return;
    const prompt = match[1].trim();
    if (!prompt) return;

    // Delete only the // prefix, keep the user's question
    const triggerStart = lineStart + lineText.indexOf('//');
    const slashEnd = triggerStart + 2; // "//" is 2 chars
    // Also remove a trailing space after // if present
    const spaceAfter = state.doc.textBetween(slashEnd, slashEnd + 1) === ' ' ? 1 : 0;
    view.dispatch(state.tr.delete(triggerStart, slashEnd + spaceAfter));

    setAiState({ content: '', streaming: true });

    try {
      const fullText = await fetchAIStream(prompt, (partial) => {
        setAiState({ content: partial, streaming: true });
      });
      setAiState({ content: fullText, streaming: false });
    } catch (err) {
      setAiState({ content: 'AI 请求失败: ' + err.message, streaming: false });
    }
  }, []);

  /* Insert AI response as styled blockquote bubble */
  const handleInsertAI = useCallback(() => {
    if (!aiState?.content) return;
    // Wrap in blockquote for visual bubble effect
    const lines = aiState.content.split('\n');
    const bubble = '> **🤖 AI 回答**\n>\n' + lines.map(l => l ? '> ' + l : '>').join('\n');
    const newContent = localContent + '\n\n' + bubble;
    setAiState(null);
    syncContent(newContent);
  }, [aiState, localContent, syncContent]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
  }, []);

  if (!currentNote) {
    return (
      <div className="h-full flex items-center justify-center text-gray-300 bg-white">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-3 text-gray-200" />
          <p className="text-base">Select or create a note to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
      {/* Title */}
      <div className="shrink-0" style={{ padding: '24px 24px 8px' }}>
        <input type="text" value={currentNote.title || ''}
          onChange={(e) => {
            const t = e.target.value;
            dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'title', value: t } });
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
            titleDebounceRef.current = setTimeout(() => { if (currentNote?.id) updateNote(currentNote.id, { title: t }).catch(() => { }); }, 800);
          }}
          placeholder="Untitled"
          className="w-full text-4xl font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent border-none outline-none focus:ring-0 tracking-tight leading-tight"
          style={{ fontFamily: "'Georgia', 'Noto Serif SC', serif" }}
        />
      </div>

      {/* Editor + AI bubble */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 24px 120px' }}>
        <div style={{ width: '80%', margin: '0 auto' }}>
          <MilkdownProvider>
            <MilkdownEditor key={currentId} initialContent={localContent}
              onMarkdownChange={handleMarkdownChange} onTriggerAI={handleTriggerAI} />
          </MilkdownProvider>
        </div>

        {/* AI bubble card */}
        {aiState && (
          <div style={{ width: '80%', margin: '24px auto 0' }}>
            <AiBubble
              content={aiState.content}
              streaming={aiState.streaming}
              onClose={() => setAiState(null)}
              onInsert={handleInsertAI}
            />
          </div>
        )}

        {/* Hint */}
        <div className="text-center mt-4 text-xs text-gray-300">
          Type <code className="bg-gray-100 px-1 rounded">// your question</code> and press <code className="bg-gray-100 px-1 rounded">Ctrl+Enter</code> to ask AI
        </div>
      </div>
    </div>
  );
}
