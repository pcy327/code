import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTrashNotes, restoreNote, permanentlyDeleteNote } from '../api/notes';
import {
  ArrowLeft, Trash2, RotateCcw, AlertTriangle, FileText,
  CheckSquare, Square, ChevronDown, X,
} from 'lucide-react';

export default function TrashPage() {
  const navigate = useNavigate();
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchConfirm, setBatchConfirm] = useState(null); // 'restore' | 'delete' | null

  const loadTrash = useCallback(() => {
    setLoading(true);
    listTrashNotes()
      .then(setTrashedNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTrash(); }, [loadTrash]);

  // ---- Selection helpers ----
  const allSelected = trashedNotes.length > 0 && selectedIds.size === trashedNotes.length;
  const selectedCount = selectedIds.size;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trashedNotes.map(n => n.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ---- Operations ----
  const handleRestore = async (id) => {
    try {
      await restoreNote(id);
      loadTrash();
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      alert('恢复失败: ' + e.message);
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      await permanentlyDeleteNote(id);
      setBatchConfirm(null);
      loadTrash();
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      alert('删除失败: ' + e.message);
    }
  };

  const handleBatchRestore = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => restoreNote(id)));
      clearSelection();
      loadTrash();
    } catch (e) {
      alert('批量恢复失败: ' + e.message);
    }
    setBatchConfirm(null);
  };

  const handleBatchDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => permanentlyDeleteNote(id)));
      clearSelection();
      loadTrash();
    } catch (e) {
      alert('批量删除失败: ' + e.message);
    }
    setBatchConfirm(null);
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const calcRemainingDays = (deletedAt) => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">回收站</h1>
              <p className="text-sm text-gray-400 -mt-0.5 dark:text-slate-500">
                已删除的笔记将在 30 天后自动清除
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                       text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer
                       dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            返回大盘
          </button>
        </header>

        {/* Batch action bar */}
        {selectedCount > 0 && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl animate-fadeIn">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              已选 {selectedCount} 项
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setBatchConfirm('restore')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                           text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors cursor-pointer
                           dark:text-green-300 dark:bg-green-900/40 dark:hover:bg-green-900/60"
              >
                <RotateCcw className="w-3 h-3" />
                批量恢复
              </button>
              <button
                onClick={() => setBatchConfirm('delete')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                           text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer
                           dark:text-red-300 dark:bg-red-900/40 dark:hover:bg-red-900/60"
              >
                <Trash2 className="w-3 h-3" />
                批量删除
              </button>
              <button
                onClick={clearSelection}
                className="p-1.5 text-orange-400 hover:text-orange-600 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer dark:text-orange-500 dark:hover:bg-orange-900/40"
                title="取消选择"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Batch confirmation dialog */}
        {batchConfirm && (
          <div className="mb-4 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg">
            <p className="text-sm text-gray-700 dark:text-slate-200">
              {batchConfirm === 'restore'
                ? `确定恢复选中的 ${selectedCount} 条笔记？`
                : `确定永久删除选中的 ${selectedCount} 条笔记？此操作不可撤销。`}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={batchConfirm === 'restore' ? handleBatchRestore : handleBatchDelete}
                className={`px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-colors cursor-pointer ${
                  batchConfirm === 'restore'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                确认
              </button>
              <button
                onClick={() => setBatchConfirm(null)}
                className="px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : trashedNotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-gray-400 dark:text-slate-500 text-base">回收站是空的</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select-all row */}
            <div className="flex items-center gap-3 px-4 py-2">
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer dark:text-slate-500 dark:hover:text-slate-300"
              >
                {allSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4" />}
                {allSelected ? '取消全选' : `全选（${trashedNotes.length} 项）`}
              </button>
            </div>

            {trashedNotes.map((note) => {
              const remaining = calcRemainingDays(note.deletedAt);
              const selected = selectedIds.has(note.id);
              return (
                <div
                  key={note.id}
                  className={`group flex items-center gap-3 p-4 bg-white dark:bg-slate-800
                             border rounded-xl transition-all duration-150 cursor-pointer
                             ${
                               selected
                                 ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800'
                                 : 'border-gray-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800'
                             }`}
                  onClick={() => toggleSelect(note.id)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(note.id); }}
                    className="shrink-0 text-gray-300 hover:text-orange-500 transition-colors cursor-pointer dark:text-slate-600 dark:hover:text-orange-400"
                  >
                    {selected ? (
                      <CheckSquare className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 line-clamp-1">
                      {note.title || '未命名笔记'}
                    </h3>
                    {note.summary && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                        {note.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-300 dark:text-slate-600">
                        删除于 {formatTime(note.deletedAt)}
                      </span>
                      {remaining <= 7 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {remaining} 天后永久删除
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-slate-600">
                          剩余 {remaining} 天
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRestore(note.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50
                                 transition-colors cursor-pointer
                                 dark:text-slate-500 dark:hover:text-green-400 dark:hover:bg-green-900/30"
                      title="恢复笔记"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(note.id)}
                      className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50
                                 transition-colors cursor-pointer
                                 dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                      title="永久删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
