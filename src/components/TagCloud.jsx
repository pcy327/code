/**
 * TagCloud 标签云组件
 * 展示所有标签，支持点击标签搜索、添加自定义标签、删除标签
 */

import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNoteStore } from '../store/useNoteStore';
import { createTag } from '../api/tags';
import { Plus, X, Tag } from 'lucide-react';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
];

function getTagColor(i) { return TAG_COLORS[i % TAG_COLORS.length]; }

export default function TagCloud() {
  // ── useShallow 批量订阅 state ──
  const { notes, searchKeyword, customTags } = useNoteStore(
    useShallow((s) => ({ notes: s.notes, searchKeyword: s.searchKeyword, customTags: s.customTags })),
  );
  const { setSearchKeyword, addTag: addTagAction, removeTag: removeTagAction } = useNoteStore(
    useShallow((s) => ({ setSearchKeyword: s.setSearchKeyword, addTag: s.addTag, removeTag: s.removeTag })),
  );

  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  const tagEntries = useMemo(() => {
    const countMap = new Map();
    notes.forEach((n) => (n.tags || []).forEach((tag) => countMap.set(tag, (countMap.get(tag) || 0) + 1)));

    const allTagNames = new Set([...(customTags || []), ...countMap.keys()]);
    const result = [];

    (customTags || []).forEach((name) => {
      result.push({ name, count: countMap.get(name) || 0, isCustom: true });
      allTagNames.delete(name);
    });

    const rest = [...allTagNames]
      .map((name) => ({ name, count: countMap.get(name) || 0, isCustom: false }))
      .sort((a, b) => b.count - a.count);

    return [...result, ...rest];
  }, [notes, customTags]);

  const handleAdd = async () => {
    const tagName = inputValue.trim();
    if (!tagName) return;
    try { await createTag({ name: tagName }); } catch (err) { console.error('Failed to create tag on server', err); }
    addTagAction(tagName);
    setInputValue('');
    setShowInput(false);
  };

  const handleInputKey = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setShowInput(false); setInputValue(''); }
  };

  const handleTagClick = (tagName) => setSearchKeyword(tagName);
  const handleRemove = (e, tagName) => { e.stopPropagation(); removeTagAction(tagName); };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 dark:text-slate-400">
          <Tag className="w-3.5 h-3.5" />
          标签
          <span className="font-normal text-gray-300 ml-1 dark:text-slate-600">{tagEntries.length})</span>
        </h2>
        <button onClick={() => setShowInput(!showInput)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50
                     border border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700
                     rounded-lg transition-all duration-150 cursor-pointer shadow-sm
                     dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800 dark:hover:bg-blue-900/50">
          <Plus className="w-3.5 h-3.5" />自定义标签
        </button>
      </div>

      {showInput && (
        <div className="flex items-center gap-2 mb-3 animate-fadeIn">
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKey} placeholder="输入标签名称，回车确认…" autoFocus
            className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                       bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400
                       dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-500" />
          <button onClick={handleAdd} disabled={!inputValue.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm
                       hover:shadow-md transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">添加</button>
          <button onClick={() => { setShowInput(false); setInputValue(''); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {tagEntries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tagEntries.map((tag, i) => (
            <button key={tag.name} onClick={() => handleTagClick(tag.name)}
              className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${getTagColor(i)} ${searchKeyword === tag.name ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
              <span>{tag.name}</span>
              <span className="text-xs opacity-50">({tag.count})</span>
              {tag.isCustom && (
                <span onClick={(e) => handleRemove(e, tag.name)}
                  className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity">
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-300 italic dark:text-slate-600">暂无标签，在笔记中添加标签或点击"自定义标签"创建</p>
      )}
    </section>
  );
}
