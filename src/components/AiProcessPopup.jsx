import { Sparkles, Languages, AlignLeft, Expand, Replace, X, Loader2 } from 'lucide-react';

const ACTIONS = [
  { key: 'polish',    label: '润色',    icon: Sparkles },
  { key: 'translate', label: '翻译',    icon: Languages },
  { key: 'simplify',  label: '简化',    icon: AlignLeft },
  { key: 'expand',    label: '扩写',    icon: Expand },
];

export default function AiProcessPopup({
  visible,
  mode,       // 'actions' | 'result'
  processing, // null or action key
  result,
  pos,        // { x, y }
  onAction,
  onReplace,
  onDismiss,
}) {
  if (!visible) return null;

  const currentAction = processing || ACTIONS.find(a => result && a.key === getResultAction())?.key;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onDismiss} />

      {mode === 'actions' && (
        <div
          className="fixed z-50 flex items-center gap-1 bg-white dark:bg-slate-700
                     border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl
                     px-2 py-1.5 animate-fadeIn"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, 0)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {ACTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onAction(key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-gray-600 hover:text-indigo-600 hover:bg-indigo-50
                         dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30
                         rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === 'result' && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-700
                     border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl
                     p-3 animate-fadeIn"
          style={{
            left: pos.x,
            top: pos.y,
            width: '360px',
            maxHeight: '240px',
            transform: 'translate(-50%, 0)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              {ACTIONS.find(a => a.key === currentAction)?.label || 'AI 处理'}
            </span>
            <button onClick={onDismiss} className="p-0.5 text-gray-300 hover:text-gray-500 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap">
            {processing ? (
              <div className="flex items-center gap-2 py-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中...
              </div>
            ) : (
              result
            )}
          </div>

          {!processing && result && (
            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-slate-600">
              <button
                onClick={onDismiss}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={onReplace}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium
                           text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
              >
                <Replace className="w-3 h-3" />
                替换原文
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function getResultAction() { return ''; }
