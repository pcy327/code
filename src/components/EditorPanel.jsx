/**
 * EditorPanel 编辑器面板组件
 * 基于 Milkdown 构建的富文本 Markdown 编辑器，支持：
 * - AI 内联补全（Ghost Text）
 * - AI 问答功能（// 触发）
 * - 文本选中后 AI 处理（总结、翻译等）
 * - 图片上传（粘贴或选择文件）
 * - 实时保存（防抖）
 * - 大纲提取
 */

// React hooks
import { useState, useEffect, useCallback, useRef, memo } from 'react';

// Milkdown 编辑器核心
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';

// Milkdown 插件
import { slashFactory, SlashProvider } from '@milkdown/plugin-slash';
import { tooltipFactory, TooltipProvider } from '@milkdown/plugin-tooltip';

// 主题和工具函数
import { nord } from '@milkdown/theme-nord';
import { replaceAll, getMarkdown, callCommand } from '@milkdown/kit/utils';

// Markdown 命令
import {
  toggleStrongCommand, toggleEmphasisCommand, toggleInlineCodeCommand,
  wrapInHeadingCommand, wrapInBulletListCommand, wrapInOrderedListCommand,
  wrapInBlockquoteCommand, insertHrCommand, createCodeBlockCommand
} from '@milkdown/kit/preset/commonmark';

// ProseMirror 底层 API
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { $prose } from '@milkdown/utils';

// 样式
import '@milkdown/theme-nord/style.css';

// Markdown 渲染
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Zustand 状态管理
import { useNoteStore } from '../store/useNoteStore';

// API
import { updateNote } from '../api/notes';
import { processText } from '../api/ai';
import { uploadImage } from '../api/upload';

// 图标
import { FileText, Bot, X, Copy, Check, Share2, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';

// 组件
import ShareModal from './ShareModal';
import AiProcessPopup from './AiProcessPopup';

/* ===================================================================
 * 辅助函数：执行编辑器命令
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
  } catch (e) {
    console.error('Command failed:', e);
  }
}

/* ===================================================================
 * AI Stream - SSE 流式响应处理
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
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('event:')) {
        currentEvent = line.substring(6);
        continue;
      }

      if (!line.startsWith('data:')) continue;

      const data = line.substring(5);

      if (currentEvent === 'error') throw new Error(data);
      if (currentEvent === 'done') {
        onToken(accumulated);
        return accumulated;
      }

      const prevLine = i > 0 ? lines[i - 1] : '';
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
 * Ghost Text - AI 内联补全插件
 * =================================================================== */

const GHOST_KEY = new PluginKey('ai-ghost');
let _scheduleRef = null;

function createGhostPlugin(scheduleRef) {
  _scheduleRef = scheduleRef;

  return $prose(() => new Plugin({
    key: GHOST_KEY,

    state: {
      init() { return DecorationSet.empty; },

      apply(tr, prev) {
        const meta = tr.getMeta(GHOST_KEY);
        if (meta !== undefined) return meta;

        if ((tr.docChanged || tr.selectionSet) && !tr.getMeta('ghostAccept')) {
          return DecorationSet.empty;
        }

        return prev.map(tr.mapping, tr.doc);
      },
    },

    view() {
      return {
        update(view, prevState) {
          if (view.state.doc !== prevState.doc && _scheduleRef?.current) {
            _scheduleRef.current(view);
          }
        },
      };
    },

    props: {
      decorations(state) { return GHOST_KEY.getState(state); },

      handleKeyDown(view, e) {
        if (e.key === 'Tab') {
          const decos = GHOST_KEY.getState(view.state);
          const found = decos?.find?.();

          if (found && found.length > 0) {
            e.preventDefault();
            const s = found[0].spec;

            if (s.ghostText && s.ghostPos != null) {
              view.dispatch(
                view.state.tr
                  .insertText(s.ghostText, s.ghostPos)
                  .setMeta('ghostAccept', true)
                  .setMeta(GHOST_KEY, DecorationSet.empty),
              );
              s.onAccept?.();
            }
            return true;
          }
        }
        return false;
      },
    },
  }));
}

function setGhost(view, pos, text, onAccept) {
  const widget = Decoration.widget(pos, () => {
    const span = document.createElement('span');
    span.className = 'ai-ghost-text';
    span.textContent = text;
    return span;
  }, { ghostText: text, ghostPos: pos, onAccept });

  view.dispatch(view.state.tr.setMeta(GHOST_KEY, DecorationSet.create(view.state.doc, [widget])));
}

function clearGhost(view) {
  view.dispatch(view.state.tr.setMeta(GHOST_KEY, DecorationSet.empty));
}

async function fetchCompletionStream(context, signal, onToken) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not logged in');

  const resp = await fetch(`/api/ai/complete?context=${encodeURIComponent(context)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal,
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('event:')) {
        currentEvent = line.substring(6);
        continue;
      }
      if (!line.startsWith('data:')) continue;
      const data = line.substring(5);
      if (currentEvent === 'done') return accumulated;
      if (currentEvent === 'error') throw new Error(data);
      if (i > 0 && lines[i - 1].startsWith('data:')) accumulated += '\n';
      accumulated += data;
      onToken(accumulated);
    }
  }
  return accumulated;
}

/* ===================================================================
 * AI Bubble 组件
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
 * 斜杠菜单
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
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      item.cmd();
      menu.dataset.show = 'false';
    });
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
 * MilkdownEditor - 内部编辑器组件
 * =================================================================== */

const MilkdownEditor = memo(function MilkdownEditor({ initialContent, onMarkdownChange, onTriggerAI, onEditorReady, onImagePaste }) {
  const [loading, get] = useInstance();

  const editorRef = useRef(null);
  const composingRef = useRef(false);
  const scheduleRef = useRef(null);
  const ghostRef = useRef({ timer: null, controller: null });

  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => { ctx.set(rootCtx, root); })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(createGhostPlugin(scheduleRef));

    const slash = slashFactory('ainote-slash');
    const sp = new SlashProvider({ content: buildSlashMenu(editorRef) });
    editor.use(slash).config((ctx) => {
      ctx.set(slash.key, {
        view: (v) => {
          sp.update(v);
          return {
            update: (v2, p) => sp.update(v2, p),
            destroy: () => sp.destroy()
          };
        }
      });
    });

    const tooltip = tooltipFactory('ainote-tooltip');
    const tp = new TooltipProvider({ content: buildTooltip(editorRef) });
    editor.use(tooltip).config((ctx) => {
      ctx.set(tooltip.key, {
        view: (v) => {
          tp.update(v);
          return {
            update: (v2, p) => tp.update(v2, p),
            destroy: () => tp.destroy()
          };
        }
      });
    });

    editor.config((ctx) => {
      ctx.set(defaultValueCtx, initialContent || '');
      ctx.get(listenerCtx).markdownUpdated((_, md) => {
        if (!composingRef.current) onMarkdownChange(md);
      });
    });
    return editor;
  }, []);

  useEffect(() => {
    if (loading) return;

    const editor = get();
    editorRef.current = editor;
    onEditorReady?.(editorRef);

    let dom;
    try { dom = editor.ctx.get(editorViewCtx).dom; } catch (e) { }
    if (!dom) return;

    dom.setAttribute('spellcheck', 'false');

    scheduleRef.current = (view) => {
      if (ghostRef.current.timer) clearTimeout(ghostRef.current.timer);
      clearGhost(view);
      if (ghostRef.current.controller) ghostRef.current.controller.abort();

      ghostRef.current.timer = setTimeout(async () => {
        const ed = get();
        if (!ed) return;

        let v;
        try { v = ed.ctx.get(editorViewCtx); } catch (e) { return; }

        const pos = v.state.selection.from;
        const start = Math.max(0, pos - 1000);
        const context = v.state.doc.textBetween(start, pos);

        if (context.trim().length < 10) return;

        const ctrl = new AbortController();
        ghostRef.current.controller = ctrl;

        try {
          await fetchCompletionStream(context, ctrl.signal, (partial) => {
            if (ctrl.signal.aborted) return;
            const ed2 = get();
            if (!ed2) return;
            try {
              const v2 = ed2.ctx.get(editorViewCtx);
              if (v2 && v2.state.selection.from === pos) {
                setGhost(v2, pos, partial);
              }
            } catch (e) { }
          });
        } catch (e) { }
      }, 500);
    };

    const onCS = () => { composingRef.current = true; };
    const onCE = () => {
      composingRef.current = false;
      setTimeout(() => onMarkdownChange(editor.action(getMarkdown())), 50);
    };

    dom.addEventListener('compositionstart', onCS);
    dom.addEventListener('compositionend', onCE);

    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onTriggerAI(editorRef);
      }
    };
    dom.addEventListener('keydown', onKey);

    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) onImagePaste?.(file, get);
          break;
        }
      }
    };
    dom.addEventListener('paste', onPaste);

    return () => {
      scheduleRef.current = null;
      if (ghostRef.current.timer) clearTimeout(ghostRef.current.timer);
      if (ghostRef.current.controller) ghostRef.current.controller.abort();
      dom.removeEventListener('compositionstart', onCS);
      dom.removeEventListener('compositionend', onCE);
      dom.removeEventListener('keydown', onKey);
      dom.removeEventListener('paste', onPaste);
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
});

/* ===================================================================
 * EditorPanel - 主编辑器面板组件
 * =================================================================== */

export default function EditorPanel({ onHeadingsChange }) {
  const currentNote = useNoteStore((s) => s.currentNote);
  const updateCurrentNoteField = useNoteStore((s) => s.updateCurrentNoteField);

  const debounceRef = useRef(null);
  const titleDebounceRef = useRef(null);
  const lastSavedRef = useRef('');
  const activeNoteIdRef = useRef(null);
  const editorParentRef = useRef(null);

  const [localContent, setLocalContent] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [aiState, setAiState] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);

  const [aiProcess, setAiProcess] = useState({
    visible: false,
    mode: 'actions',
    processing: null,
    result: '',
    pos: { x: 0, y: 0 },
    selectedText: '',
    range: null,
  });

  const getEditorView = useCallback(() => {
    const ed = editorParentRef.current?.current;
    if (!ed) return null;
    try { return ed.ctx.get(editorViewCtx); } catch (e) { return null; }
  }, []);

  const showAiProcessFromSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

    const el = document.querySelector('.milkdown .ProseMirror');
    if (!el || !el.contains(sel.anchorNode)) return;

    const text = sel.toString().trim();
    if (text.length < 2) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setAiProcess({
      visible: true,
      mode: 'actions',
      processing: null,
      result: '',
      pos: { x: rect.left + rect.width / 2, y: rect.bottom + 4 },
      selectedText: text,
      range: null,
    });
  }, []);

  useEffect(() => {
    let timer;
    const onMouseUp = (e) => {
      if (e.target?.closest?.('.z-50')) return;
      clearTimeout(timer);
      timer = setTimeout(showAiProcessFromSelection, 80);
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [showAiProcessFromSelection]);

  const handleAiProcessAction = useCallback(async (actionKey) => {
    setAiProcess(p => ({ ...p, mode: 'result', processing: actionKey, result: '' }));
    try {
      const res = await processText(aiProcess.selectedText, actionKey);
      setAiProcess(p => ({ ...p, processing: null, result: res }));
    } catch (e) {
      setAiProcess(p => ({ ...p, processing: null, result: '处理失败：' + e.message }));
    }
  }, [aiProcess.selectedText]);

  const handleAiProcessReplace = useCallback(() => {
    const view = getEditorView();
    if (!view || !aiProcess.result) return;
    const { from, to } = view.state.selection;
    if (from === to) return;
    view.dispatch(view.state.tr.insertText(aiProcess.result, from, to));
    view.focus();
    setAiProcess(p => ({ ...p, visible: false, mode: 'actions' }));
  }, [aiProcess.result, getEditorView]);

  const handleAiProcessDismiss = useCallback(() => {
    setAiProcess(p => ({ ...p, visible: false, mode: 'actions', processing: null, result: '' }));
  }, []);

  /* === 图片上传 === */

  const insertImageIntoEditor = useCallback((url) => {
    const view = getEditorView();
    if (!view) return;
    const { state, dispatch } = view;
    try {
      const img = state.schema.nodes.image.create({ src: url, alt: '' });
      dispatch(state.tr.replaceSelectionWith(img).scrollIntoView());
    } catch {
      const { from, to } = state.selection;
      dispatch(state.tr.insertText(`![](${url})`, from, to));
    }
    view.focus();
  }, [getEditorView]);

  const handleImagePaste = useCallback(async (file, getEditor) => {
    const filename = file.name || '截图';
    setUploadProgress({ progress: 0, filename });
    try {
      const result = await uploadImage(file, (pct) => {
        setUploadProgress({ progress: pct, filename });
      });
      insertImageIntoEditor(result.url);
    } catch (e) {
      alert('图片上传失败: ' + e.message);
    } finally {
      setUploadProgress(null);
    }
  }, [insertImageIntoEditor]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImagePaste(file, null);
    e.target.value = '';
  }, [handleImagePaste]);

  useEffect(() => {
    if (currentNote?.id !== currentId || (currentNote?.content && currentNote.content !== lastSavedRef.current)) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);

      setCurrentId(currentNote?.id);
      setLocalContent(currentNote?.content || '');
      lastSavedRef.current = currentNote?.content || '';
      activeNoteIdRef.current = currentNote?.id;
      setAiState(null);
    }
  }, [currentNote?.id, currentNote?.content]);

  const syncContent = useCallback((md) => {
    setLocalContent(md);
    const noteIdAtCall = currentNote?.id;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (activeNoteIdRef.current !== noteIdAtCall) return;

      updateCurrentNoteField('content', md);

      if (noteIdAtCall && md !== lastSavedRef.current) {
        updateNote(noteIdAtCall, { content: md }).catch(() => { });
        lastSavedRef.current = md;
      }
    }, 800);
  }, [updateCurrentNoteField, currentNote?.id]);

  const handleMarkdownChange = useCallback((md) => {
    setLocalContent(md);

    const headings = [];
    if (md) {
      const lines = md.split('\n');
      let idx = 0;
      for (const line of lines) {
        const m = line.match(/^(#{1,3})\s+(.+)$/);
        if (m) headings.push({ id: `h-${++idx}`, level: m[1].length, text: m[2].trim() });
      }
    }

    onHeadingsChange?.(headings);
    syncContent(md);
  }, [syncContent, onHeadingsChange]);

  /* === AI 问答触发 === */

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

    const triggerStart = lineStart + lineText.indexOf('//');
    const slashEnd = triggerStart + 2;
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

  const handleInsertAI = useCallback(() => {
    if (!aiState?.content) return;
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
      <div className="h-full flex items-center justify-center text-gray-300 bg-white dark:bg-slate-800">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-3 text-gray-200 dark:text-slate-600" />
          <p className="text-base dark:text-slate-500">Select or create a note to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden dark:bg-slate-800">
      <div className="shrink-0" style={{ padding: '24px 24px 8px' }}>
        <input
          type="text"
          value={currentNote.title || ''}
          onChange={(e) => {
            const t = e.target.value;
            const noteIdAtCall = currentNote?.id;
            updateCurrentNoteField('title', t);
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
            titleDebounceRef.current = setTimeout(() => {
              if (activeNoteIdRef.current !== noteIdAtCall) return;
              if (noteIdAtCall) updateNote(noteIdAtCall, { title: t }).catch(() => { });
            }, 800);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.target.blur();
              setTimeout(() => {
                document.querySelector('.milkdown .ProseMirror')?.focus();
              }, 50);
            }
          }}
          placeholder="Untitled"
          className="w-full text-4xl font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent border-none outline-none focus:ring-0 tracking-tight leading-tight dark:text-slate-100 dark:placeholder:text-slate-600"
          style={{ fontFamily: "'Georgia', 'Noto Serif SC', serif" }}
        />
      </div>

      <div className="shrink-0 flex items-center gap-1 px-6 pb-3 border-b border-gray-100 relative dark:border-slate-700">
        <button onClick={showAiProcessFromSelection}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                     text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer
                     dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/30">
          <Sparkles className="w-3.5 h-3.5" />
          AI 处理
        </button>
        <span className="text-gray-200 dark:text-slate-600">|</span>

        <button onClick={() => setShowShare(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                     text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer
                     dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700">
          <Share2 className="w-3.5 h-3.5" />
          分享
        </button>
        <span className="text-gray-200 dark:text-slate-600">|</span>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadProgress !== null}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                     text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed
                     dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
          title="上传图片"
        >
          {uploadProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          {uploadProgress ? `${uploadProgress.progress}%` : '图片'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 24px 120px' }}>
        <div style={{ width: '80%', margin: '0 auto' }}>
          <MilkdownProvider key={currentId}>
            <MilkdownEditor
              initialContent={localContent}
              onMarkdownChange={handleMarkdownChange}
              onTriggerAI={handleTriggerAI}
              onEditorReady={(ref) => { editorParentRef.current = ref; }}
              onImagePaste={handleImagePaste}
            />
          </MilkdownProvider>
        </div>

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

        <div className="text-center mt-4 text-xs text-gray-300 dark:text-slate-600">
          Type <code className="bg-gray-100 px-1 rounded dark:bg-slate-700 dark:text-slate-300">// your question</code> and press <code className="bg-gray-100 px-1 rounded dark:bg-slate-700 dark:text-slate-300">Ctrl+Enter</code> to ask AI
        </div>
      </div>

      {showShare && (
        <ShareModal
          noteId={currentNote?.id}
          onClose={() => setShowShare(false)}
        />
      )}

      <AiProcessPopup
        visible={aiProcess.visible}
        mode={aiProcess.mode}
        processing={aiProcess.processing}
        result={aiProcess.result}
        pos={aiProcess.pos}
        onAction={handleAiProcessAction}
        onReplace={handleAiProcessReplace}
        onDismiss={handleAiProcessDismiss}
      />
    </div>
  );
}
