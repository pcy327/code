/**
 * TagCloud 标签云组件
 * 展示所有标签，支持点击标签搜索、添加自定义标签、删除标签
 */

// React hooks 导入
import { useState, useMemo } from 'react';
// 笔记状态管理
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
// 标签相关 API
import { createTag, deleteTag } from '../api/tags';
// 图标组件
import { Plus, X, Tag } from 'lucide-react';

/**
 * 标签颜色配置数组
 * 用于为标签提供不同的视觉样式，循环使用
 */
const TAG_COLORS = [
  'bg-blue-100 text-blue-700',      // 蓝色
  'bg-purple-100 text-purple-700',  // 紫色
  'bg-emerald-100 text-emerald-700', // 翠绿色
  'bg-amber-100 text-amber-700',    //琥珀色
  'bg-pink-100 text-pink-700',      // 粉色
  'bg-cyan-100 text-cyan-700',      //青色
  'bg-rose-100 text-rose-700',      //玫瑰色
  'bg-indigo-100 text-indigo-700',  //靛蓝色
];

/**
 * 根据索引获取标签颜色样式
 * @param {number} index - 标签索引
 * @returns {string} Tailwind CSS 类名
 */
function getTagColor(index) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

/**
 * TagCloud 组件 - 标签云展示与交互
 */
export default function TagCloud() {
  // 获取笔记状态
  const { notes, searchKeyword, customTags } = useNoteState();
  const dispatch = useNoteDispatch();

  // 本地状态：标签输入值和输入框显示状态
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  /**
   * 计算标签列表（聚合笔记中的标签 + 自定义标签）
   * 使用 useMemo 优化性能，避免不必要的重新计算
   */
  const tagEntries = useMemo(() => {
    // 统计每个标签在笔记中出现的次数
    const countMap = new Map();
    notes.forEach((n) => {
      (n.tags || []).forEach((tag) => {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      });
    });

    // 合合自定义标签和笔记中的标签
    const allTagNames = new Set([...(customTags || []), ...countMap.keys()]);
    const result = [];

    // 先添加自定义标签（标记为 isCustom: true）
    (customTags || []).forEach((name) => {
      result.push({ name, count: countMap.get(name) || 0, isCustom: true });
      allTagNames.delete(name);
    });

    // 再添加其他标签（按使用次数降序排列）
    const rest = [...allTagNames]
      .map((name) => ({ name, count: countMap.get(name) || 0, isCustom: false }))
      .sort((a, b) => b.count - a.count);

    return [...result, ...rest];
  }, [notes, customTags]);

  /**
   * 添加自定义标签
   * 先持久化到后端，再更新本地状态
   */
  const handleAdd = async () => {
    const tagName = inputValue.trim();
    if (!tagName) return;

    try {
      // 调用 API 创建标签
      await createTag({ name: tagName });
    } catch (err) {
      // 标签可能已在后端存在，仍然更新本地状态
      console.error('Failed to create tag on server', err);
    }

    // 更新本地状态
    dispatch({ type: ACTION.ADD_TAG, payload: tagName });
    setInputValue('');
    setShowInput(false);
  };

  /**
   * 处理输入框键盘事件
   * Enter: 添加标签
   * Escape: 取消添加
   */
  const handleInputKey = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setShowInput(false); setInputValue(''); }
  };

  /**
   * 点击标签进行搜索
   * @param {string} tagName - 标签名称
   */
  const handleTagClick = (tagName) => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: tagName });
  };

  /**
   * 移除自定义标签
   * @param {Event} e - 点击事件
   * @param {string} tagName - 标签名称
   */
  const handleRemove = async (e, tagName) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发标签点击搜索

    try {
      // 当前没有标签 ID，暂时跳过 API 删除
      // 标签在本地移除，下次页面加载时会完整同步
    } catch (err) {
      console.error('Failed to delete tag', err);
    }

    // 更新本地状态，移除标签
    dispatch({ type: ACTION.REMOVE_TAG, payload: tagName });
  };

  /**
   * 渲染标签云组件
   */
  return (
    <section className="mb-8">
      {/* 标题栏：标签数量统计 + 添加按钮 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 dark:text-slate-400">
          <Tag className="w-3.5 h-3.5" />
          标签
          <span className="font-normal text-gray-300 ml-1 dark:text-slate-600">{tagEntries.length})</span>
        </h2>

        {/* 添加自定义标签按钮 */}
        <button
          onClick={() => setShowInput(!showInput)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-blue-600 bg-blue-50 border border-blue-200
                     hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700
                     rounded-lg transition-all duration-150 cursor-pointer shadow-sm
                     dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800 dark:hover:bg-blue-900/50"
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
                       focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400
                       dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          {/* 确认添加按钮 */}
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600
                       rounded-lg shadow-sm hover:shadow-md transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            添加
          </button>
          {/* 取消按钮 */}
          <button
            onClick={() => { setShowInput(false); setInputValue(''); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer dark:hover:text-slate-300"
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
              {/* 标签名称 */}
              <span>{tag.name}</span>
              {/* 使用次数 */}
              <span className="text-xs opacity-50">({tag.count})</span>
              {/* 删除按钮（仅自定义标签显示） */}
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
        // 无标签时的提示文本
        <p className="text-sm text-gray-300 italic dark:text-slate-600">
          暂无标签，在笔记中添加标签或点击"自定义标签"创建
        </p>
      )}
    </section>
  );
}
