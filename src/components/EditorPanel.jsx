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
import { commonmark } from '@milkdown/kit/preset/commonmark';  // 基础 Markdown 支持
import { gfm } from '@milkdown/kit/preset/gfm';                // GitHub Flavored Markdown
import { history } from '@milkdown/kit/plugin/history';        // 撤销/重做
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'; // 事件监听

// Milkdown 插件
import { slashFactory, SlashProvider } from '@milkdown/plugin-slash';   // 斜杠菜单
import { tooltipFactory, TooltipProvider } from '@milkdown/plugin-tooltip'; // 悬浮工具栏

// 主题和工具函数
import { nord } from '@milkdown/theme-nord';              // Nord 主题
import { replaceAll, getMarkdown, callCommand } from '@milkdown/kit/utils';

// Markdown 命令
import { 
  toggleStrongCommand, toggleEmphasisCommand, toggleInlineCodeCommand,
  wrapInHeadingCommand, wrapInBulletListCommand, wrapInOrderedListCommand,
  wrapInBlockquoteCommand, insertHrCommand, createCodeBlockCommand 
} from '@milkdown/kit/preset/commonmark';

// ProseMirror 底层 API（用于自定义插件）
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { $prose } from '@milkdown/utils';

// 样式
import '@milkdown/theme-nord/style.css';

// Markdown 渲染（用于 AI 回答展示）
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 状态管理
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';

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
      // 处理斜杠命令后的清理：如果光标前是 "/"，删除它
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashPos = textBefore.lastIndexOf('/');
      if (slashPos >= 0 && slashPos === textBefore.length - 1) {
        const from = $from.pos - ($from.parentOffset - slashPos);
        view.dispatch(state.tr.delete(from, from + 1));
      }
    }
    // 执行命令
    editor.action(callCommand(cmd.key, ...args));
  } catch (e) { 
    console.error('Command failed:', e); 
  }
}

/* ===================================================================
 * AI Stream - SSE 流式响应处理
 * 处理 AI 问答的 Server-Sent Events，逐 token 接收并累积完整文本
 * =================================================================== */

/**
 * 从 AI 服务获取流式响应
 * @param {string} prompt - 用户输入的提示词
 * @param {Function} onToken - 每次收到新 token 时的回调函数
 * @returns {string} 完整的 AI 响应文本
 */
async function fetchAIStream(prompt, onToken) {
  // 获取用户认证 token
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not logged in');

  // 发起 SSE 请求
  const resp = await fetch(`/api/ai/stream?prompt=${encodeURIComponent(prompt)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  // 创建流式读取器
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';           // 缓冲区，用于拼接不完整的行
  let accumulated = '';      // 累积的完整响应文本
  let currentEvent = '';     // 当前事件类型（跨 chunk 保持）

  // 循环读取流式数据
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // 解码二进制数据并添加到缓冲区
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // 最后一行可能不完整，保留在缓冲区
    buffer = lines.pop() || '';

    // 逐行解析 SSE 格式
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. 跟踪 event 类型（跨 chunk 保持，防止丢失）
      if (line.startsWith('event:')) {
        currentEvent = line.substring(6);
        continue;
      }

      // 2. 跳过非 data: 行
      if (!line.startsWith('data:')) continue;

      // 3. 提取数据部分（去除 "data:" 前缀）
      const data = line.substring(5);

      // 4. 根据事件类型处理
      if (currentEvent === 'error') throw new Error(data);  // 错误事件
      if (currentEvent === 'done') {                        // 完成事件
        onToken(accumulated);
        return accumulated;
      }

      // 5. 处理多行数据：连续的 data: 行之间需要恢复换行符
      const prevLine = i > 0 ? lines[i - 1] : '';
      if (prevLine.startsWith('data:')) {
        accumulated += '\n';
      }
      accumulated += data;
      // 触发回调，传递当前累积的文本
      onToken(accumulated);
    }
  }
  return accumulated;
}

/* ===================================================================
 * Ghost Text - AI 内联补全插件
 * 基于 ProseMirror 实现的 AI 自动补全功能，按 Tab 键接受补全
 * =================================================================== */

// Ghost Text 插件的唯一标识
const GHOST_KEY = new PluginKey('ai-ghost');

// 模块级别的引用（安全：同一时间只有一个编辑器实例）
let _scheduleRef = null;

/**
 * 创建 Ghost Text 插件
 * 将原始 ProseMirror Plugin 包装为 Milkdown 插件
 * @param {Object} scheduleRef - 调度函数的引用
 * @returns {MilkdownPlugin} Milkdown 插件
 */
function createGhostPlugin(scheduleRef) {
  _scheduleRef = scheduleRef;
  
  // $prose 将原始 ProseMirror Plugin 包装为 Milkdown 插件
  return $prose(() => new Plugin({
    key: GHOST_KEY,
    
    // 插件状态管理
    state: {
      // 初始化：空的装饰集合
      init() { return DecorationSet.empty; },
      
      // 状态更新逻辑
      apply(tr, prev) {
        // 如果有明确的 meta 数据，直接使用
        const meta = tr.getMeta(GHOST_KEY);
        if (meta !== undefined) return meta;
        
        // 文档变化或光标移动时清除 ghost text（接受操作除外）
        if ((tr.docChanged || tr.selectionSet) && !tr.getMeta('ghostAccept')) {
          return DecorationSet.empty;
        }
        
        // 否则映射到新文档位置
        return prev.map(tr.mapping, tr.doc);
      },
    },
    
    // 视图层钩子
    view() {
      return {
        // 当视图更新时触发
        update(view, prevState) {
          // 文档变化时调用调度函数（触发新的补全请求）
          if (view.state.doc !== prevState.doc && _scheduleRef?.current) {
            _scheduleRef.current(view);
          }
        },
      };
    },
    
    // 渲染属性和事件处理
    props: {
      // 返回当前状态的装饰
      decorations(state) { return GHOST_KEY.getState(state); },
      
      // 键盘事件处理
      handleKeyDown(view, e) {
        // Tab 键接受补全
        if (e.key === 'Tab') {
          const decos = GHOST_KEY.getState(view.state);
          const found = decos?.find?.();
          
          if (found && found.length > 0) {
            e.preventDefault();
            const s = found[0].spec;
            
            // 插入 ghost text 到文档中
            if (s.ghostText && s.ghostPos != null) {
              view.dispatch(
                view.state.tr
                  .insertText(s.ghostText, s.ghostPos)
                  .setMeta('ghostAccept', true)      // 标记为接受操作
                  .setMeta(GHOST_KEY, DecorationSet.empty), // 清除 ghost
              );
              // 触发接受回调
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

/**
 * 设置 Ghost Text（显示 AI 补全建议）
 * @param {EditorView} view - ProseMirror 视图
 * @param {number} pos - 插入位置
 * @param {string} text - 补全文本
 * @param {Function} onAccept - 接受后的回调
 */
function setGhost(view, pos, text, onAccept) {
  // 创建装饰部件
  const widget = Decoration.widget(pos, () => {
    const span = document.createElement('span');
    span.className = 'ai-ghost-text';  // 应用 ghost text 样式
    span.textContent = text;
    return span;
  }, { ghostText: text, ghostPos: pos, onAccept });
  
  // 分发事务更新状态
  view.dispatch(view.state.tr.setMeta(GHOST_KEY, DecorationSet.create(view.state.doc, [widget])));
}

/**
 * 清除 Ghost Text
 * @param {EditorView} view - ProseMirror 视图
 */
function clearGhost(view) {
  view.dispatch(view.state.tr.setMeta(GHOST_KEY, DecorationSet.empty));
}

/**
 * 补全流 SSE - AI 内联补全的流式响应处理
 * 与 AI 问答类似，但支持 AbortController 取消操作
 * @param {string} context - 当前光标前的上下文文本
 * @param {AbortSignal} signal - 取消信号
 * @param {Function} onToken - 每次收到新 token 时的回调
 * @returns {string} 完整的补全文本
 */
async function fetchCompletionStream(context, signal, onToken) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not logged in');

  // 发起补全请求
  const resp = await fetch(`/api/ai/complete?context=${encodeURIComponent(context)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal,  // 支持取消
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
      // 连续 data: 行之间添加换行
      if (i > 0 && lines[i - 1].startsWith('data:')) accumulated += '\n';
      accumulated += data;
      onToken(accumulated);
    }
  }
  return accumulated;
}

/* ===================================================================
 * AI Bubble 组件 - 显示 AI 回答的卡片组件
 * 支持 Markdown 渲染、代码高亮、复制和插入功能
 * =================================================================== */

/**
 * AI 回答展示气泡组件
 * @param {string} content - AI 回答内容
 * @param {boolean} streaming - 是否正在流式生成
 * @param {Function} onClose - 关闭回调
 * @param {Function} onInsert - 插入到笔记的回调
 */
function AiBubble({ content, streaming, onClose, onInsert }) {
  const [copied, setCopied] = useState(false);

  /**
   * 复制到剪贴板
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ai-bubble">
      {/* 头部：标题和操作按钮 */}
      <div className="ai-bubble-header">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-600">AI 回答</span>
          {/* 流式生成指示器 */}
          {streaming && (
            <span className="flex items-center gap-1 text-xs text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              生成中...
            </span>
          )}
        </div>
        {/* 操作按钮组 */}
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
      
      {/* 内容区域 */}
      <div className="ai-bubble-body">
        {content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 自定义代码块渲染（支持语法高亮）
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
 * 斜杠菜单 - 用户输入 "/" 时显示的命令菜单
 * =================================================================== */

/**
 * 构建斜杠菜单 DOM 元素
 * @param {Object} editorRef - 编辑器引用
 * @returns {HTMLElement} 菜单 DOM 元素
 */
function buildSlashMenu(editorRef) {
  const menu = document.createElement('div');
  menu.className = 'slash-menu';
  
  // 菜单项配置
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
    // 点击执行命令并隐藏菜单
    el.addEventListener('mousedown', (e) => { 
      e.preventDefault(); 
      item.cmd(); 
      menu.dataset.show = 'false'; 
    });
    menu.appendChild(el);
  });
  return menu;
}

/**
 * 构建悬浮工具栏 DOM 元素
 * 选中文本时显示的快速格式化工具栏
 * @param {Object} editorRef - 编辑器引用
 * @returns {HTMLElement} 工具栏 DOM 元素
 */
function buildTooltip(editorRef) {
  const bar = document.createElement('div');
  bar.className = 'milkdown-tooltip-bar';
  
  // 工具栏按钮配置
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
 * 封装 Milkdown 编辑器核心逻辑，包含 AI 补全、事件监听等
 * =================================================================== */

/**
 * Milkdown 编辑器内部组件（已 memo 优化）
 * @param {string} initialContent - 初始内容
 * @param {Function} onMarkdownChange - Markdown 变化回调
 * @param {Function} onTriggerAI - 触发 AI 问答回调
 * @param {Function} onEditorReady - 编辑器就绪回调
 * @param {Function} onImagePaste - 图片粘贴回调
 */
const MilkdownEditor = memo(function MilkdownEditor({ initialContent, onMarkdownChange, onTriggerAI, onEditorReady, onImagePaste }) {
  // 获取编辑器实例（useInstance 返回 [loading状态, 获取实例函数]）
  const [loading, get] = useInstance();
  
  // 编辑器引用
  const editorRef = useRef(null);
  // 输入法输入状态（用于处理中文输入时的状态追踪）
  const composingRef = useRef(false);
  // AI 补全调度函数引用（供 GhostPlugin 调用）
  const scheduleRef = useRef(null);
  // Ghost text 相关引用（定时器和取消控制器）
  const ghostRef = useRef({ timer: null, controller: null });

  // 初始化 Milkdown 编辑器
  useEditor((root) => {
    // 1. 第一步：设置根节点并加载所有插件
    const editor = Editor.make()
      .config((ctx) => { ctx.set(rootCtx, root); })  // 设置根 DOM 节点
      .config(nord)                                  // 应用 Nord 主题
      .use(commonmark)                               // 基础 Markdown 支持
      .use(gfm)                                      // GitHub Flavored Markdown 扩展
      .use(history)                                  // 撤销/重做插件
      .use(listener)                                 // 事件监听插件
      .use(createGhostPlugin(scheduleRef));          // AI 内联补全插件

    // 配置斜杠菜单（输入 "/" 时显示）
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

    // 配置悬浮工具栏（选中文本时显示）
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

    // 2. 第二步：在所有插件注册后设置内容和监听器
    editor.config((ctx) => {
      ctx.set(defaultValueCtx, initialContent || '');  // 设置初始内容
      // Markdown 更新监听（排除输入法输入中）
      ctx.get(listenerCtx).markdownUpdated((_, md) => { 
        if (!composingRef.current) onMarkdownChange(md); 
      });
    });
    return editor;
  }, []);

  // 编辑器加载完成后的初始化
  useEffect(() => {
    if (loading) return;
    
    const editor = get();
    editorRef.current = editor;
    onEditorReady?.(editorRef);  // 通知父组件编辑器就绪
    
    // 获取编辑器 DOM 元素
    let dom;
    try { dom = editor.ctx.get(editorViewCtx).dom; } catch (e) { }
    if (!dom) return;
    
    // 禁用浏览器原生拼写检查
    dom.setAttribute('spellcheck', 'false');

    // === AI 内联补全逻辑（Ghost Text）===
    scheduleRef.current = (view) => {
      // 清除之前的定时器和未完成的请求
      if (ghostRef.current.timer) clearTimeout(ghostRef.current.timer);
      clearGhost(view);
      if (ghostRef.current.controller) ghostRef.current.controller.abort();

      // 延迟 500ms 后发起补全请求（防抖处理）
      ghostRef.current.timer = setTimeout(async () => {
        const ed = get();
        if (!ed) return;
        
        let v;
        try { v = ed.ctx.get(editorViewCtx); } catch (e) { return; }

        // 获取光标前 1000 字符作为上下文
        const pos = v.state.selection.from;
        const start = Math.max(0, pos - 1000);
        const context = v.state.doc.textBetween(start, pos);

        // 上下文太短（少于 10 字符）则不触发补全
        if (context.trim().length < 10) return;

        // 创建取消控制器（用于中断请求）
        const ctrl = new AbortController();
        ghostRef.current.controller = ctrl;

        try {
          // 发起 AI 补全请求
          await fetchCompletionStream(context, ctrl.signal, (partial) => {
            if (ctrl.signal.aborted) return;  // 请求已取消
            const ed2 = get();
            if (!ed2) return;
            try {
              const v2 = ed2.ctx.get(editorViewCtx);
              // 只有光标位置不变时才更新 ghost text
              if (v2 && v2.state.selection.from === pos) {
                setGhost(v2, pos, partial);
              }
            } catch (e) { /* 忽略错误 */ }
          });
        } catch (e) {
          // 取消或网络错误，静默处理
        }
      }, 500);
    };

    // === 输入法输入状态处理 ===
    const onCS = () => { composingRef.current = true; };      // 开始输入
    const onCE = () => { 
      composingRef.current = false; 
      // 输入法结束后延迟 50ms 更新内容（确保输入完成）
      setTimeout(() => onMarkdownChange(editor.action(getMarkdown())), 50); 
    };  // 结束输入
    
    dom.addEventListener('compositionstart', onCS);
    dom.addEventListener('compositionend', onCE);

    // === 键盘快捷键处理 ===
    const onKey = (e) => {
      // Ctrl/Cmd + Enter 触发 AI 问答
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { 
        e.preventDefault(); 
        onTriggerAI(editorRef); 
      }
    };
    dom.addEventListener('keydown', onKey);

    // === 图片粘贴处理 ===
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();  // 阻止默认粘贴行为
          const file = item.getAsFile();
          if (file) onImagePaste?.(file, get);  // 传递给父组件处理
          break;
        }
      }
    };
    dom.addEventListener('paste', onPaste);

    // 清理函数（组件卸载时执行）
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

  // 同步外部内容变化到编辑器（切换笔记时触发）
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    const cur = editor.action(getMarkdown());
    // 只有当内容不一致时才更新（避免不必要的重渲染）
    if ((initialContent || '') !== cur) editor.action(replaceAll(initialContent || ''));
  }, [initialContent, loading]);

  return <Milkdown />;
});

/* ===================================================================
 * EditorPanel - 主编辑器面板组件
 * 外层容器，管理笔记状态、AI 功能、图片上传等
 * =================================================================== */

/**
 * 编辑器面板主组件
 * @param {Function} onHeadingsChange - 大纲变化回调（用于右侧目录导航）
 */
export default function EditorPanel({ onHeadingsChange }) {
  // 获取当前笔记状态和 dispatch
  const { currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  
  // 防抖相关引用
  const debounceRef = useRef(null);           // 内容保存防抖
  const titleDebounceRef = useRef(null);      // 标题保存防抖
  const lastSavedRef = useRef('');            // 上次保存的内容（用于判断是否需要保存）
  const activeNoteIdRef = useRef(null);       // 当前活跃笔记 ID（防抖回调中检查）
  const editorParentRef = useRef(null);       // Milkdown 编辑器引用（供 AI 处理弹窗使用）

  // 本地状态
  const [localContent, setLocalContent] = useState('');  // 编辑器当前内容
  const [currentId, setCurrentId] = useState(null);      // 当前笔记 ID
  const [aiState, setAiState] = useState(null);          // AI 问答状态 { content, streaming }
  const [showShare, setShowShare] = useState(false);     // 是否显示分享弹窗
  const [uploadProgress, setUploadProgress] = useState(null); // 图片上传进度
  const fileInputRef = useRef(null);         // 文件选择 input 引用

  // AI 文本处理弹窗状态
  const [aiProcess, setAiProcess] = useState({
    visible: false,       // 是否显示
    mode: 'actions',      // 'actions'（选择操作）| 'result'（显示结果）
    processing: null,     // 当前处理中的操作 key
    result: '',           // 处理结果
    pos: { x: 0, y: 0 }, // 弹窗位置
    selectedText: '',     // 选中的文本
    range: null,          // 选区范围
  });

  /**
   * 获取当前 ProseMirror 视图（供外部调用）
   */
  const getEditorView = useCallback(() => {
    const ed = editorParentRef.current?.current;
    if (!ed) return null;
    try { return ed.ctx.get(editorViewCtx); } catch (e) { return null; }
  }, []);

  /**
   * 选中文本时显示 AI 处理弹窗
   */
  const showAiProcessFromSelection = useCallback(() => {
    const sel = window.getSelection();
    // 无选区或选区为空
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

    // 检查选区是否在编辑器内
    const el = document.querySelector('.milkdown .ProseMirror');
    if (!el || !el.contains(sel.anchorNode)) return;

    const text = sel.toString().trim();
    if (text.length < 2) return;  // 文本太短不处理

    // 获取选区位置（用于定位弹窗）
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setAiProcess({
      visible: true,
      mode: 'actions',
      processing: null,
      result: '',
      pos: { x: rect.left + rect.width / 2, y: rect.bottom + 4 },  // 定位到选区下方居中
      selectedText: text,
      range: null,
    });
  }, []);

  // 通过 document 的 mouseup 事件自动检测文本选择
  useEffect(() => {
    let timer;
    const onMouseUp = (e) => {
      // 不在 AI 弹窗内部触发
      if (e.target?.closest?.('.z-50')) return;
      clearTimeout(timer);
      // 延迟 80ms 触发（等待选区稳定）
      timer = setTimeout(showAiProcessFromSelection, 80);
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => { 
      clearTimeout(timer); 
      document.removeEventListener('mouseup', onMouseUp); 
    };
  }, [showAiProcessFromSelection]);

  /**
   * 执行 AI 文本处理操作
   * @param {string} actionKey - 操作类型（如 'summary', 'translate', 'expand'）
   */
  const handleAiProcessAction = useCallback(async (actionKey) => {
    // 更新状态为处理中
    setAiProcess(p => ({ ...p, mode: 'result', processing: actionKey, result: '' }));
    try {
      // 调用 AI 处理 API
      const res = await processText(aiProcess.selectedText, actionKey);
      setAiProcess(p => ({ ...p, processing: null, result: res }));
    } catch (e) {
      setAiProcess(p => ({ ...p, processing: null, result: '处理失败：' + e.message }));
    }
  }, [aiProcess.selectedText]);

  /**
   * 将 AI 处理结果替换到编辑器中
   */
  const handleAiProcessReplace = useCallback(() => {
    const view = getEditorView();
    if (!view || !aiProcess.result) return;
    const { from, to } = view.state.selection;
    if (from === to) return;  // 没有选区
    // 替换选区内容
    view.dispatch(view.state.tr.insertText(aiProcess.result, from, to));
    view.focus();
    setAiProcess(p => ({ ...p, visible: false, mode: 'actions' }));
  }, [aiProcess.result, getEditorView]);

  /**
   * 关闭 AI 处理弹窗
   */
  const handleAiProcessDismiss = useCallback(() => {
    setAiProcess(p => ({ ...p, visible: false, mode: 'actions', processing: null, result: '' }));
  }, []);

  /* === 图片上传 === */

  /**
   * 将图片插入到编辑器
   * @param {string} url - 图片 URL
   */
  const insertImageIntoEditor = useCallback((url) => {
    const view = getEditorView();
    if (!view) return;
    const { state, dispatch } = view;
    try {
      // 尝试作为 ProseMirror 图片节点插入（渲染为内联图片）
      const img = state.schema.nodes.image.create({ src: url, alt: '' });
      dispatch(state.tr.replaceSelectionWith(img).scrollIntoView());
    } catch {
      // 降级方案：插入 Markdown 格式的图片链接
      const { from, to } = state.selection;
      dispatch(state.tr.insertText(`![](${url})`, from, to));
    }
    view.focus();
  }, [getEditorView]);

  /**
   * 处理图片粘贴
   * @param {File} file - 图片文件
   * @param {Function} getEditor - 编辑器获取函数
   */
  const handleImagePaste = useCallback(async (file, getEditor) => {
    const filename = file.name || '截图';
    setUploadProgress({ progress: 0, filename });
    try {
      // 上传图片（带进度回调）
      const result = await uploadImage(file, (pct) => {
        setUploadProgress({ progress: pct, filename });
      });
      // 插入到编辑器
      insertImageIntoEditor(result.url);
    } catch (e) {
      alert('图片上传失败: ' + e.message);
    } finally {
      setUploadProgress(null);
    }
  }, [insertImageIntoEditor]);

  /**
   * 处理文件选择（点击上传按钮后选择文件）
   */
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImagePaste(file, null);
    e.target.value = '';  // 重置 input，允许重新选择相同文件
  }, [handleImagePaste]);

  /**
   * 笔记内容同步 Effect
   * 当笔记 ID 变化或内容从 API 加载时触发
   */
  useEffect(() => {
    // 笔记 ID 变化 或 相同 ID 但内容从 API 重新加载
    if (currentNote?.id !== currentId || (currentNote?.content && currentNote.content !== lastSavedRef.current)) {
      // 切换笔记时清除待执行的防抖，防止旧内容覆盖新笔记
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);

      // 更新本地状态
      setCurrentId(currentNote?.id);
      setLocalContent(currentNote?.content || '');
      lastSavedRef.current = currentNote?.content || '';
      activeNoteIdRef.current = currentNote?.id;
      setAiState(null);  // 清除 AI 状态
    }
  }, [currentNote?.id, currentNote?.content]);

  /**
   * 同步内容到状态和后端（防抖）
   * @param {string} md - Markdown 内容
   */
  const syncContent = useCallback((md) => {
    setLocalContent(md);
    const noteIdAtCall = currentNote?.id;
    
    // 清除之前的防抖定时器
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // 800ms 防抖后保存
    debounceRef.current = setTimeout(() => {
      // 如果此时已经切换到其他笔记，丢弃本次保存
      if (activeNoteIdRef.current !== noteIdAtCall) return;
      
      // 更新本地状态
      dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: md } });
      
      // 保存到后端
      if (noteIdAtCall && md !== lastSavedRef.current) {
        updateNote(noteIdAtCall, { content: md }).catch(() => { });
        lastSavedRef.current = md;
      }
    }, 800);
  }, [dispatch, currentNote?.id]);

  /**
   * Markdown 内容变化处理
   * @param {string} md - 新的 Markdown 内容
   */
  const handleMarkdownChange = useCallback((md) => {
    setLocalContent(md);
    
    // 提取大纲（h1-h3）
    const headings = [];
    if (md) {
      const lines = md.split('\n'); 
      let idx = 0;
      for (const line of lines) { 
        const m = line.match(/^(#{1,3})\s+(.+)$/); 
        if (m) headings.push({ id: `h-${++idx}`, level: m[1].length, text: m[2].trim() }); 
      }
    }
    
    // 更新大纲（用于右侧目录导航）
    onHeadingsChange?.(headings);
    
    // 同步内容（防抖保存）
    syncContent(md);
  }, [syncContent, onHeadingsChange]);

  /* === AI 问答触发 === */

  /**
   * 处理 AI 问答触发（输入 // 后按 Ctrl+Enter）
   */
  const handleTriggerAI = useCallback(async (editorRef) => {
    const editor = editorRef.current;
    if (!editor) return;

    const view = editor.ctx.get(editorViewCtx);
    if (!view) return;
    const { state } = view;
    const { $from } = state.selection;
    
    // 获取当前行内容
    const lineStart = $from.start();
    const lineText = state.doc.textBetween(lineStart, $from.pos);
    
    // 匹配 // 开头的命令
    const match = lineText.match(/\/\/\s*(.+)/);
    if (!match) return;
    const prompt = match[1].trim();
    if (!prompt) return;

    // 删除 // 前缀（保留用户的问题）
    const triggerStart = lineStart + lineText.indexOf('//');
    const slashEnd = triggerStart + 2;  // "//" 是 2 个字符
    // 如果 // 后有空格也删除
    const spaceAfter = state.doc.textBetween(slashEnd, slashEnd + 1) === ' ' ? 1 : 0;
    view.dispatch(state.tr.delete(triggerStart, slashEnd + spaceAfter));

    // 开始 AI 请求
    setAiState({ content: '', streaming: true });

    try {
      // 发起流式请求
      const fullText = await fetchAIStream(prompt, (partial) => {
        setAiState({ content: partial, streaming: true });
      });
      setAiState({ content: fullText, streaming: false });
    } catch (err) {
      setAiState({ content: 'AI 请求失败: ' + err.message, streaming: false });
    }
  }, []);

  /**
   * 将 AI 回答插入到笔记中
   * 包装为带样式的引用块格式
   */
  const handleInsertAI = useCallback(() => {
    if (!aiState?.content) return;
    // 包装为引用块格式（视觉气泡效果）
    const lines = aiState.content.split('\n');
    const bubble = '> **🤖 AI 回答**\n>\n' + lines.map(l => l ? '> ' + l : '>').join('\n');
    const newContent = localContent + '\n\n' + bubble;
    setAiState(null);
    syncContent(newContent);
  }, [aiState, localContent, syncContent]);

  /**
   * 组件卸载时清理防抖定时器
   */
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
  }, []);

  // 没有选中笔记时显示占位提示
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
      {/* 标题输入框 */}
      <div className="shrink-0" style={{ padding: '24px 24px 8px' }}>
        <input 
          type="text" 
          value={currentNote.title || ''}
          onChange={(e) => {
            const t = e.target.value;
            const noteIdAtCall = currentNote?.id;
            // 更新本地状态
            dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'title', value: t } });
            // 防抖保存到后端
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
            titleDebounceRef.current = setTimeout(() => {
              if (activeNoteIdRef.current !== noteIdAtCall) return;
              if (noteIdAtCall) updateNote(noteIdAtCall, { title: t }).catch(() => { });
            }, 800);
          }}
          onKeyDown={(e) => {
            // Enter 键跳转到编辑器
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

      {/* 工具栏 */}
      <div className="shrink-0 flex items-center gap-1 px-6 pb-3 border-b border-gray-100 relative dark:border-slate-700">
        {/* AI 处理按钮 */}
        <button onClick={showAiProcessFromSelection}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                     text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer
                     dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/30">
          <Sparkles className="w-3.5 h-3.5" />
          AI 处理
        </button>
        <span className="text-gray-200 dark:text-slate-600">|</span>
        
        {/* 分享按钮 */}
        <button onClick={() => setShowShare(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                     text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer
                     dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700">
          <Share2 className="w-3.5 h-3.5" />
          分享
        </button>
        <span className="text-gray-200 dark:text-slate-600">|</span>
        
        {/* 图片上传按钮 */}
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
        {/* 隐藏的文件选择 input */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* 编辑器区域 + AI 回答气泡 */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 24px 120px' }}>
        {/* 编辑器容器（居中 80% 宽度） */}
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

        {/* AI 回答气泡卡片 */}
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

        {/* 使用提示 */}
        <div className="text-center mt-4 text-xs text-gray-300 dark:text-slate-600">
          Type <code className="bg-gray-100 px-1 rounded dark:bg-slate-700 dark:text-slate-300">// your question</code> and press <code className="bg-gray-100 px-1 rounded dark:bg-slate-700 dark:text-slate-300">Ctrl+Enter</code> to ask AI
        </div>
      </div>

      {/* 分享弹窗 */}
      {showShare && (
        <ShareModal
          noteId={currentNote?.id}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* AI 文本处理弹窗 */}
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
