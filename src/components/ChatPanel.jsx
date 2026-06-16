import { useState, useRef, useEffect } from 'react';
import { fetchNoteChatStream } from '../api/ai';
import { Bot, Send, Loader2, User, MessageSquare, X, ChevronDown, Trash2 } from 'lucide-react';

export default function ChatPanel({ noteContent, noteId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Load saved messages for this note
  useEffect(() => {
    if (!noteId) return;
    try {
      const saved = sessionStorage.getItem(`chat-${noteId}`);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, [noteId]);

  // Save messages
  useEffect(() => {
    if (!noteId) return;
    try {
      sessionStorage.setItem(`chat-${noteId}`, JSON.stringify(messages));
    } catch {}
  }, [messages, noteId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || streaming || !noteContent) return;
    setInput('');

    const userMsg = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);

    const aiMsg = { role: 'ai', content: '', streaming: true };
    setMessages(prev => [...prev, aiMsg]);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await fetchNoteChatStream(
        noteContent,
        q,
        (partial) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'ai') {
              updated[updated.length - 1] = { ...last, content: partial, streaming: true };
            }
            return updated;
          });
        },
        abort.signal,
      );
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'ai') {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
    } catch (e) {
      if (e.name === 'AbortError') return;
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'ai') {
          updated[updated.length - 1] = { ...last, content: '请求失败: ' + e.message, streaming: false };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    if (noteId) sessionStorage.removeItem(`chat-${noteId}`);
  };

  // Focus input after streaming ends
  useEffect(() => {
    if (!streaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [streaming]);

  const handleNewChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('确定清空当前对话历史？')) {
      handleClear();
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white border-l border-gray-200 dark:bg-slate-800 dark:border-slate-700">
      {/* Header */}
      <div className="shrink-0 p-3 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">AI 对话</span>
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer dark:text-slate-600 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                title="新对话"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
          围绕当前笔记内容提问
        </p>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 dark:text-slate-600 mb-3" />
            <p className="text-sm text-gray-300 dark:text-slate-500">对当前笔记提问</p>
            <p className="text-xs text-gray-200 dark:text-slate-600 mt-1">AI 将根据笔记内容回答</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-indigo-500" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-md'
                  : 'bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-slate-200 rounded-bl-md'
              }`}
            >
              {msg.content || (msg.streaming ? '' : '...')}
              {msg.streaming && (
                <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-sm align-middle" />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-gray-100 dark:border-slate-700">
        {!noteContent ? (
          <p className="text-xs text-gray-300 dark:text-slate-600 text-center py-2">
            请先编辑笔记内容
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题…"
                rows={1}
                disabled={streaming}
                className="w-full resize-none rounded-xl border border-gray-200 dark:border-slate-600
                           bg-white dark:bg-slate-700 px-3 py-2 text-sm
                           text-gray-800 dark:text-slate-200 placeholder:text-gray-300
                           focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400
                           disabled:opacity-50 transition-all dark:placeholder:text-slate-500"
                style={{ minHeight: '36px', maxHeight: '100px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
            </div>
            {streaming ? (
              <button
                onClick={handleStop}
                className="shrink-0 w-9 h-9 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors cursor-pointer"
                title="停止生成"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="shrink-0 w-9 h-9 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 dark:disabled:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="发送"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
