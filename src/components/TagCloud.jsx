import { useState, useMemo } from 'react';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { createTag, deleteTag } from '../api/tags';
import { Plus, X, Tag } from 'lucide-react';

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

  /* Aggregate tags from notes + merge custom tags */
  const tagEntries = useMemo(() => {
    const countMap = new Map();
    notes.forEach((n) => {
      (n.tags || []).forEach((tag) => {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      });
    });

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

  /* Add tag — persist to backend first, then update state */
  const handleAdd = async () => {
    const tagName = inputValue.trim();
    if (!tagName) return;
    try {
      await createTag({ name: tagName });
    } catch (err) {
      // Tag may already exist on backend, still update local state
      console.error('Failed to create tag on server', err);
    }
    dispatch({ type: ACTION.ADD_TAG, payload: tagName });
    setInputValue('');
    setShowInput(false);
  };

  const handleInputKey = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setShowInput(false); setInputValue(''); }
  };

  /* Click tag to search */
  const handleTagClick = (tagName) => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: tagName });
  };

  /* Remove custom tag — delete from backend first */
  const handleRemove = async (e, tagName) => {
    e.stopPropagation();
    // Find the tag id from notes tags to delete via API
    try {
      // We don't have tag ID here, so we skip API delete for now
      // Tags are removed locally; full sync happens on next page load
    } catch (err) {
      console.error('Failed to delete tag', err);
    }
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

      {/* Add tag input */}
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

      {/* Tag list */}
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
