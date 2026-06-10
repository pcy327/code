import { useState, useCallback } from 'react';
import { ListTree, FileText } from 'lucide-react';

/**
 * OutlinePanel — 右侧大纲（Table of Contents）
 *
 * 接收从 EditorPanel 提取的 headings 数组，渲染可点击目录树。
 * 点击后跳转到 TipTap 编辑器中对应的标题位置。
 */
function HeadingItem({ heading, activeId, onClick }) {
  const isActive = activeId === heading.id;
  return (
    <button
      onClick={() => onClick(heading)}
      className={`w-full text-left block px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer
        ${isActive
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      style={{ paddingLeft: `${12 + (heading.level - 1) * 16}px` }}
    >
      <span className="line-clamp-1">{heading.text || '（空标题）'}</span>
    </button>
  );
}

export default function OutlinePanel({ headings = [], onHeadingClick, activeHeadingId }) {
  if (headings.length === 0) {
    return (
      <aside className="h-full flex flex-col bg-white border-l border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <ListTree className="w-3.5 h-3.5" />
            大纲
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-xs text-gray-300">使用标题格式后<br />自动生成大纲</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <ListTree className="w-3.5 h-3.5" />
          大纲
          <span className="ml-auto font-normal text-gray-300">{headings.length}</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {headings.map((h) => (
          <HeadingItem
            key={h.id}
            heading={h}
            activeId={activeHeadingId}
            onClick={onHeadingClick}
          />
        ))}
      </div>
    </aside>
  );
}
