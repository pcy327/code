import { useState, useMemo } from 'react';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { Plus, X, Search, Tag } from 'lucide-react';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

function getTagColor(index) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

export default function TagCloud() {
  const { notes, searchKeyword, customTags } = useNoteState();
  const dispatch = useNoteDispatch();
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  /* 聚合笔记标签并合并自定义标签 */
  const tags = customTags || [];
  const tagEntries = useMemo(() => {
    // 从笔记中统计各标签出现频次
    const countMap = new Map();
    notes.forEach((n) => {
      (n.tags || []).forEach((tag) => {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      });
    });

    // 构建有序标签列表：先显示的标签（自定义的排前，笔记标签排后）
    const allTagNames = new Set([...tags, ...countMap.keys()]);
    const result = [];

    // 自定义标签保持顺序
    tags.forEach((name) => {
      result.push({ name, count: countMap.get(name) || 0, isCustom: true });
      allTagNames.delete(name);
    });

    // 笔记标签按频次降序
    const rest = [...allTagNames]
      .map((name) => ({ name, count: countMap.get(name) || 0, isCustom: false }))
      .sort((a, b) => b.count - a.count);

    return [...result, ...rest];
  }, [notes, tags]);

  /* 添加标签 */
  const handleAdd = () => {
    const tag = inputValue.trim();
    if (tag) {
      dispatch({ type: ACTION.ADD_TAG, payload: tag });
      setInputValue('');
      setShowInput(false);
    }
  };

  const handleInputKey = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setShowInput(false); setInputValue(''); }
  };

  /* 点击标签搜索 */
  const handleTagClick = (tagName) => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: tagName });
  };

  /* 删除自定义标签 */
  const handleRemove = (e, tagName) => {
    e.stopPropagation();
    dispatch({ type: ACTION.REMOVE_TAG, payload: tagName });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          标签
          <span className="font-normal text-gray-300 ml-1">({tagEntries.length})</span>
        </h2>
        <button
          onClick={() => setShowInput(!showInput)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-blue-600 bg-blue-50 border border-blue-200
                     hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700
                     rounded-lg transition-all duration-150 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          自定义标签
        </button>
      </div>

      {/* 添加标签输入框 */}
      {showInput && (
        <div className="flex items-center gap-2 mb-3 animate-fadeIn">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKey}
            placeholder="输入标签名称，回车确认…"
            autoFocus
            className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                       bg-white placeholder:text-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600
                       rounded-lg shadow-sm hover:shadow-md transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            添加
          </button>
          <button
            onClick={() => { setShowInput(false); setInputValue(''); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 标签列表 */}
      {tagEntries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tagEntries.map((tag, i) => (
            <button
              key={tag.name}
              onClick={() => handleTagClick(tag.name)}
              className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         text-sm font-medium transition-all duration-200 cursor-pointer
                         ${getTagColor(i)}
                         ${searchKeyword === tag.name ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
            >
              <span>{tag.name}</span>
              <span className="text-xs opacity-50">({tag.count})</span>
              {/* 自定义标签可删除 */}
              {tag.isCustom && (
                <span
                  onClick={(e) => handleRemove(e, tag.name)}
                  className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100
                             hover:bg-black/10 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-300 italic">
          暂无标签，在笔记中添加标签或点击"自定义标签"创建
        </p>
      )}
    </section>
  );
}
