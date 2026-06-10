import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import Sidebar from '../components/Sidebar';
import EditorPanel from '../components/EditorPanel';
import OutlinePanel from '../components/OutlinePanel';

/**
 * Workspace — 沉浸式三栏文档工作台
 *
 * ┌──────┬────────────────────────────────┬──────────┐
 * │      │  ┌ 笔记标题 (text-3xl) ────┐  │          │
 * │      │  │                          │  │  大纲    │
 * │ Side │  ├──────────────────────────┤  │  ├ H1    │
 * │ bar  │  │  @uiw/react-md-editor    │  │  ├ H2    │
 * │ 15%  │  │  沉浸式单栏 Markdown     │  │  │ ├ H3  │
 * │      │  │  max-w-4xl 居中          │  │  └ H2    │
 * │      │  │  实时预览 + 工具栏       │  │          │
 * └──────┴────────────────────────────────┴──────────┘
 *  固定          w-[65%] / flex-1              w-[20%]
 */
export default function Workspace() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();

  /* 大纲标题列表 & 当前激活项 */
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  /* 根据 URL 参数切换笔记 */
  useEffect(() => {
    if (noteId) {
      const target = notes.find((n) => n.id === noteId);
      if (target) {
        dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: target });
      } else {
        navigate('/', { replace: true });
      }
    } else if (!currentNote && notes.length > 0) {
      dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: notes[0] });
    }
  }, [noteId]);

  /** 接收 EditorPanel 提取的 headings */
  const handleHeadingsChange = useCallback((list) => {
    setHeadings(list);
  }, []);

  /** 点击大纲标题 → 滚动到文档对应位置 */
  const handleHeadingClick = useCallback(
    (heading) => {
      setActiveHeadingId(heading.id);
      /* 通过 heading 文本查找 DOM 中的标题元素 */
      const container = document.querySelector('.w-md-editor-content');
      if (!container) return;
      const headingEls = container.querySelectorAll('h1, h2, h3');
      const idx = headings.indexOf(heading);
      const target = headingEls[idx];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [headings],
  );

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white">
      {/* 左栏：侧边栏导航 (15%) */}
      <div className="w-[15%] min-w-[180px] max-w-[220px] shrink-0">
        <Sidebar />
      </div>

      {/* 中栏：沉浸式文档编辑区 */}
      <div className="flex-1 min-w-0 flex flex-col border-x border-gray-100 h-full">
        <EditorPanel onHeadingsChange={handleHeadingsChange} />
      </div>

      {/* 右栏：文章大纲目录 (20%) */}
      <div className="w-[20%] min-w-[200px] max-w-[280px] shrink-0">
        <OutlinePanel
          headings={headings}
          onHeadingClick={handleHeadingClick}
          activeHeadingId={activeHeadingId}
        />
      </div>
    </div>
  );
}
