import { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor, {
  bold,
  italic,
  strikethrough,
  hr,
  group,
  title1,
  title2,
  title3,
  link,
  quote,
  code,
  codeBlock,
  unorderedListCommand,
  orderedListCommand,
} from '@uiw/react-md-editor';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { FileText, Sparkles, Tags, AlignLeft } from 'lucide-react';

/* ===================================================================
 * 工具函数
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

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function generateSummary(text) {
  const plain = text.replace(/\s+/g, ' ').trim();
  if (!plain) return '暂无内容';
  return plain.slice(0, 150) + (plain.length > 150 ? '…' : '');
}

function generateTags(text) {
  const kw = [
    ['react','React'],['javascript','JavaScript'],['typescript','TypeScript'],
    ['css','CSS'],['html','HTML'],['vue','Vue'],['python','Python'],
    ['java','Java'],['api','API'],['ai','AI'],['markdown','Markdown'],
    ['性能','性能优化'],['架构','架构'],['设计','设计模式'],['测试','测试'],['部署','部署'],
  ];
  const lower = text.toLowerCase();
  return [...new Set(kw.filter(([w]) => lower.includes(w)).map(([,t]) => t))].slice(0, 5);
}

function optimizeMarkdown(md) {
  if (!md) return md;
  let o = md;
  o = o.replace(/^(#{1,6}\s.+)$(?!\n)/gm, '$1\n');
  o = o.replace(/^(\d+\.\s.+)$(?!\n)/gm, '$1\n');
  o = o.replace(/([^\n])\n```/g, '$1\n\n```');
  o = o.replace(/```\n([^\n])/g, '```\n\n$1');
  o = o.replace(/\n{3,}/g, '\n\n');
  return o.trimEnd() + '\n';
}

/* 精简版工具栏命令 */
const basicCommands = [
  bold, italic, strikethrough, hr,
  group([title1, title2, title3], {
    name: 'heading',
    groupName: 'heading',
    buttonProps: { 'aria-label': '标题', title: '标题' },
  }),
  link, quote, code, codeBlock,
  unorderedListCommand, orderedListCommand,
];

/* ===================================================================
 * EditorPanel
 * =================================================================== */
export default function EditorPanel({ onHeadingsChange }) {
  const { currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  const debounceRef = useRef(null);

  /* 本地内容状态：避免每次击键触发全局 re-render */
  const [localContent, setLocalContent] = useState('');

  /* AI 面板状态 */
  const [aiPanel, setAiPanel] = useState(null);    // 'summary' | 'tags' | 'optimize' | null
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  /* ---- 切换笔记时同步本地内容 ---- */
  useEffect(() => {
    setLocalContent(currentNote?.content || '');
    if (currentNote) {
      onHeadingsChange?.(extractHeadingsFromMarkdown(currentNote.content || ''));
    }
  }, [currentNote?.id]);

  /* ---- 编辑器内容变更 ---- */
  const handleChange = useCallback((value) => {
    const text = value || '';
    // 本地状态即时更新（只影响本组件，不触发全局 re-render）
    setLocalContent(text);
    // 标题提取实时刷新（纯函数，极轻量）
    onHeadingsChange?.(extractHeadingsFromMarkdown(text));
    // 防抖保存到全局 store（不影响打字流畅度）
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({
        type: ACTION.UPDATE_CURRENT_NOTE_FIELD,
        payload: { field: 'content', value: text },
      });
    }, 800);
  }, [dispatch, onHeadingsChange]);

  /* ---- 清理 ---- */
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  /* ---- AI 动作 ---- */
  const handleAISummary = async () => {
    setAiPanel('summary'); setAiLoading(true); setAiResult(null);
    await delay(600);
    setAiResult(generateSummary(localContent)); setAiLoading(false);
  };
  const handleAITags = async () => {
    setAiPanel('tags'); setAiLoading(true); setAiResult(null);
    await delay(500);
    setAiResult(generateTags(localContent)); setAiLoading(false);
  };
  const handleAIOptimize = async () => {
    setAiPanel('optimize'); setAiLoading(true); setAiResult(null);
    await delay(1000);
    setLocalContent((prev) => {
      const o = optimizeMarkdown(prev);
      // 同时更新 store
      dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: o } });
      return o;
    });
    setAiResult('✅ 排版优化完成！'); setAiLoading(false);
  };

  /* ---- 空状态 ---- */
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
      {/* ===== 标题区 ===== */}
      <div className="shrink-0 px-8 pt-6 pb-2">
        <input
          type="text"
          value={currentNote.title || ''}
          onChange={(e) =>
            dispatch({
              type: ACTION.UPDATE_CURRENT_NOTE_FIELD,
              payload: { field: 'title', value: e.target.value },
            })
          }
          placeholder="无标题笔记"
          className="w-full text-3xl font-bold text-gray-900 placeholder:text-gray-300
                     bg-transparent border-none outline-none focus:ring-0 tracking-tight"
        />
      </div>


      {/* ===== 编辑器主体 ===== */}
      <div className="flex-1 min-h-0">
        <div className="h-full min-h-0 relative" data-color-mode="light">
          <MDEditor
            value={localContent}
            onChange={handleChange}
            preview="live"
            height="100%"
            highlightEnable={false}
            commands={basicCommands}
            extraCommands={[]}
            className="!bg-transparent !border-none !shadow-none"
          />
          {/* AI 操作按钮——定位在工具栏右侧 */}
          <div className="ai-toolbar-actions">
            <button
              onClick={handleAISummary}
              disabled={aiLoading || !localContent}
              className="ai-toolbar-btn ai-btn-purple"
            ><AlignLeft className="w-3.5 h-3.5" /> 摘要</button>
            <button
              onClick={handleAITags}
              disabled={aiLoading || !localContent}
              className="ai-toolbar-btn ai-btn-emerald"
            ><Tags className="w-3.5 h-3.5" /> 标签</button>
            <button
              onClick={handleAIOptimize}
              disabled={aiLoading || !localContent}
              className="ai-toolbar-btn ai-btn-amber"
            ><Sparkles className="w-3.5 h-3.5" /> 优化</button>

            {/* AI 结果弹出 */}
            {aiPanel && (
              <div className="ai-popover">
                <button onClick={() => { setAiPanel(null); setAiResult(null); }} className="ai-popover-close">✕</button>
                {aiLoading ? (
                  <div className="flex items-center justify-center gap-2 py-3">
                    <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">处理中…</span>
                  </div>
                ) : (
                  <>
                    {aiPanel === 'summary' && (
                      <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">📝 AI 摘要</h4><p className="text-sm text-gray-700 leading-relaxed">{aiResult}</p></div>
                    )}
                    {aiPanel === 'tags' && (
                      <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">🏷 智能标签</h4><div className="flex flex-wrap gap-1.5">{(aiResult || []).map(t => <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">{t}</span>)}</div></div>
                    )}
                    {aiPanel === 'optimize' && (
                      <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">✨ 一键优化</h4><p className="text-sm text-gray-700">{aiResult}</p></div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
