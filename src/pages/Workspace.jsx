/**
 * 工作区页面组件
 * 沉浸式三栏文档编辑器，支持可调整宽度的右侧面板
 */

// React 核心 hooks 导入
import { useEffect, useState, useCallback, useRef } from 'react';
// React Router 路由相关 hooks
import { useParams, useNavigate } from 'react-router-dom';
// 笔记状态管理相关
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
// API 接口
import { getNote } from '../api/notes';
// 组件导入
import Sidebar from '../components/Sidebar';
import EditorPanel from '../components/EditorPanel';
import OutlinePanel from '../components/OutlinePanel';
import ChatPanel from '../components/ChatPanel';

// 右侧面板宽度相关常量配置
const DEFAULT_RIGHT_WIDTH = 300; // 默认宽度（像素）
const MIN_RIGHT_WIDTH = 300;     // 最小宽度限制
const MAX_RIGHT_WIDTH = 600;     // 最大宽度限制
const STORAGE_KEY = 'workspace-right-panel-width'; // 本地存储键名

/**
 * Workspace 组件 - 主工作区布局
 * 包含三栏布局：侧边栏、编辑器、右侧面板（大纲/AI对话）
 */
export default function Workspace() {
  // 从 URL 参数获取笔记 ID
  const { noteId } = useParams();
  // 路由导航函数
  const navigate = useNavigate();
  // 获取笔记状态和 dispatch 函数
  const { notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();

  // 状态管理
  const [headings, setHeadings] = useState([]);           // 文档大纲标题列表
  const [activeHeadingId, setActiveHeadingId] = useState(null); // 当前激活的标题 ID
  const [rightPanel, setRightPanel] = useState('outline'); // 右侧面板类型：'outline' | 'chat'
  // 右侧面板宽度，从 localStorage 读取上次保存的宽度
  const [rightWidth, setRightWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // 读取保存的宽度，限制在最小和最大范围内
      return saved ? Math.min(MAX_RIGHT_WIDTH, Math.max(MIN_RIGHT_WIDTH, Number(saved))) : DEFAULT_RIGHT_WIDTH;
    } catch {
      // 读取失败时使用默认宽度
      return DEFAULT_RIGHT_WIDTH;
    }
  });
  const isDragging = useRef(false);     // 是否正在拖拽调整宽度
  const containerRef = useRef(null);    // 容器引用，用于计算宽度

  /**
   * 从 Markdown 内容中提取标题
   * @param {string} md - Markdown 内容字符串
   */
  const extractHeadings = useCallback((md) => {
    const list = [];
    if (md) {
      const lines = md.split('\n');
      let idx = 0;
      for (const line of lines) {
        // 匹配 1-3 级标题：# 标题、## 标题、### 标题
        const m = line.match(/^(#{1,3})\s+(.+)$/);
        if (m) {
          list.push({
            id: `h-${++idx}`,      // 生成唯一 ID
            level: m[1].length,    // 标题级别（1-3）
            text: m[2].trim()      // 标题文本
          });
        }
      }
    }
    setHeadings(list);
  }, []);

  /**
   * 当 URL 中的 noteId 变化时，加载对应的笔记详情
   */
  useEffect(() => {
    if (noteId) {
      // 调用 API 获取笔记详情
      getNote(noteId)
        .then((data) => {
          // 转换 API 返回数据格式
          const note = {
            id: String(data.id),
            title: data.title,
            content: data.content || '',
            summary: data.summary || '',
            tags: (data.tags || []).map((t) => t.name),
            updatedAt: data.updatedAt,
          };
          // 更新当前笔记状态
          dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: note });
          // 立即提取标题，确保刷新页面时大纲能显示
          extractHeadings(note.content);
        })
        .catch(() => {
          // 加载失败时重定向到首页
          navigate('/', { replace: true });
        });
    } else if (!currentNote && notes.length > 0) {
      // 如果没有指定 noteId 且存在笔记，自动跳转到第一个笔记
      const first = notes[0];
      navigate(`/workspace/${first.id}`, { replace: true });
    }
  }, [noteId]);

  /**
   * 处理标题列表变化
   * @param {Array} list - 更新后的标题列表
   */
  const handleHeadingsChange = useCallback((list) => {
    setHeadings(list);
  }, []);

  /**
   * 处理大纲标题点击事件
   * 点击后滚动到文档中对应的标题位置
   * @param {Object} heading - 被点击的标题对象
   */
  const handleHeadingClick = useCallback(
    (heading) => {
      // 更新当前激活的标题
      setActiveHeadingId(heading.id);
      // 获取编辑器内容容器
      const container = document.querySelector('.w-md-editor-content');
      if (!container) return;
      // 获取所有 h1, h2, h3 元素
      const headingEls = container.querySelectorAll('h1, h2, h3');
      // 找到被点击标题在列表中的索引
      const idx = headings.indexOf(heading);
      // 获取对应的 DOM 元素
      const target = headingEls[idx];
      if (target) {
        // 平滑滚动到目标位置
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [headings],
  );

  /**
   * 处理鼠标按下事件（开始拖拽调整宽度）
   */
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    // 改变鼠标样式为列调整样式
    document.body.style.cursor = 'col-resize';
    // 禁止文本选择
    document.body.style.userSelect = 'none';
  }, []);

  /**
   * 拖拽调整宽度的主逻辑
   */
  useEffect(() => {
    /**
     * 处理鼠标移动事件
     */
    const handleMouseMove = (e) => {
      // 如果不在拖拽状态或容器不存在，直接返回
      if (!isDragging.current || !containerRef.current) return;
      // 获取容器的边界信息
      const rect = containerRef.current.getBoundingClientRect();
      // 计算新的右侧面板宽度
      const newWidth = rect.right - e.clientX;
      // 将宽度限制在最小和最大值之间
      const clamped = Math.min(MAX_RIGHT_WIDTH, Math.max(MIN_RIGHT_WIDTH, newWidth));
      // 更新状态
      setRightWidth(clamped);
    };

    /**
     * 处理鼠标释放事件（结束拖拽）
     */
    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      // 恢复鼠标样式
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // 持久化宽度设置到 localStorage
      setRightWidth(prev => {
        localStorage.setItem(STORAGE_KEY, String(prev));
        return prev;
      });
    };

    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 清理函数：组件卸载时移除事件监听
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  /**
   * 渲染工作区布局
   */
  return (
    <div ref={containerRef} className="h-screen w-screen flex overflow-hidden bg-white dark:bg-slate-900">
      {/* 左侧边栏 */}
      <div className="w-[15%] min-w-[180px] max-w-[220px] shrink-0">
        <Sidebar />
      </div>

      {/* 中间编辑器区域 */}
      <div className="flex-1 min-w-0 flex flex-col border-x border-gray-100 h-full dark:border-slate-700">
        <EditorPanel onHeadingsChange={handleHeadingsChange} />
      </div>

      {/* 拖拽调整宽度的手柄 */}
      <div
        className="w-1 shrink-0 relative cursor-col-resize group"
        onMouseDown={handleMouseDown}
      >
        {/* 扩展点击区域 */}
        <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
        {/* 拖拽线视觉效果 */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full
                        bg-transparent group-hover:bg-indigo-300 dark:group-hover:bg-indigo-600
                        transition-colors duration-150" />
      </div>

      {/* 右侧面板区域 */}
      <div
        className="shrink-0 flex flex-col"
        style={{ width: rightWidth }}
      >
        {/* 标签切换栏 */}
        <div className="shrink-0 flex border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          {/* 大纲标签 */}
          <button
            onClick={() => setRightPanel('outline')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors cursor-pointer ${
              rightPanel === 'outline'
                ? 'text-indigo-600 border-b-2 border-indigo-500 dark:text-indigo-400 dark:border-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            大纲
          </button>
          {/* AI 对话标签 */}
          <button
            onClick={() => setRightPanel('chat')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors cursor-pointer ${
              rightPanel === 'chat'
                ? 'text-indigo-600 border-b-2 border-indigo-500 dark:text-indigo-400 dark:border-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            AI 对话
          </button>
        </div>

        {/* 面板内容区域 */}
        <div className="flex-1 min-h-0">
          {/* 根据当前选中的标签渲染对应的面板 */}
          {rightPanel === 'outline' ? (
            <OutlinePanel
              headings={headings}
              onHeadingClick={handleHeadingClick}
              activeHeadingId={activeHeadingId}
            />
          ) : (
            <ChatPanel
              noteContent={currentNote?.content || ''}
              noteId={currentNote?.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
