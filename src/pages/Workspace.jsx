/**
 * 工作区页面组件
 * 沉浸式三栏文档编辑器，支持可调整宽度的右侧面板
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useNoteStore } from '../store/useNoteStore';
import { getNote } from '../api/notes';
import Sidebar from '../components/Sidebar';
import EditorPanel from '../components/EditorPanel';
import OutlinePanel from '../components/OutlinePanel';
import ChatPanel from '../components/ChatPanel';

const DEFAULT_RIGHT_WIDTH = 300;
const MIN_RIGHT_WIDTH = 300;
const MAX_RIGHT_WIDTH = 600;
const STORAGE_KEY = 'workspace-right-panel-width';

export default function Workspace() {
  const { noteId } = useParams();
  const navigate = useNavigate();

  const { notes, currentNote } = useNoteStore(
    useShallow((s) => ({ notes: s.notes, currentNote: s.currentNote })),
  );
  const setCurrentNote = useNoteStore((s) => s.setCurrentNote);

  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const [rightPanel, setRightPanel] = useState('outline');
  const [rightWidth, setRightWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Math.min(MAX_RIGHT_WIDTH, Math.max(MIN_RIGHT_WIDTH, Number(saved))) : DEFAULT_RIGHT_WIDTH;
    } catch {
      return DEFAULT_RIGHT_WIDTH;
    }
  });
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const extractHeadings = useCallback((md) => {
    const list = [];
    if (md) {
      const lines = md.split('\n');
      let idx = 0;
      for (const line of lines) {
        const m = line.match(/^(#{1,3})\s+(.+)$/);
        if (m) list.push({ id: `h-${++idx}`, level: m[1].length, text: m[2].trim() });
      }
    }
    setHeadings(list);
  }, []);

  useEffect(() => {
    if (noteId) {
      getNote(noteId)
        .then((data) => {
          const note = {
            id: String(data.id),
            title: data.title,
            content: data.content || '',
            summary: data.summary || '',
            tags: (data.tags || []).map((t) => t.name),
            updatedAt: data.updatedAt,
          };
          setCurrentNote(note);
          extractHeadings(note.content);
        })
        .catch(() => navigate('/', { replace: true }));
    } else if (!currentNote && notes.length > 0) {
      navigate(`/workspace/${notes[0].id}`, { replace: true });
    }
  }, [noteId]);

  const handleHeadingsChange = useCallback((list) => setHeadings(list), []);

  const handleHeadingClick = useCallback(
    (heading) => {
      setActiveHeadingId(heading.id);
      const container = document.querySelector('.w-md-editor-content');
      if (!container) return;
      const headingEls = container.querySelectorAll('h1, h2, h3');
      const idx = headings.indexOf(heading);
      headingEls[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [headings],
  );

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setRightWidth(Math.min(MAX_RIGHT_WIDTH, Math.max(MIN_RIGHT_WIDTH, rect.right - e.clientX)));
    };
    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setRightWidth((prev) => { localStorage.setItem(STORAGE_KEY, String(prev)); return prev; });
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <div ref={containerRef} className="h-screen w-screen flex overflow-hidden bg-white dark:bg-slate-900">
      <div className="w-[15%] min-w-[180px] max-w-[220px] shrink-0"><Sidebar /></div>
      <div className="flex-1 min-w-0 flex flex-col border-x border-gray-100 h-full dark:border-slate-700">
        <EditorPanel onHeadingsChange={handleHeadingsChange} />
      </div>
      <div className="w-1 shrink-0 relative cursor-col-resize group" onMouseDown={handleMouseDown}>
        <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full
                        bg-transparent group-hover:bg-indigo-300 dark:group-hover:bg-indigo-600 transition-colors duration-150" />
      </div>
      <div className="shrink-0 flex flex-col" style={{ width: rightWidth }}>
        <div className="shrink-0 flex border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button onClick={() => setRightPanel('outline')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors cursor-pointer ${
              rightPanel === 'outline'
                ? 'text-indigo-600 border-b-2 border-indigo-500 dark:text-indigo-400 dark:border-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}>大纲</button>
          <button onClick={() => setRightPanel('chat')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors cursor-pointer ${
              rightPanel === 'chat'
                ? 'text-indigo-600 border-b-2 border-indigo-500 dark:text-indigo-400 dark:border-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}>AI 对话</button>
        </div>
        <div className="flex-1 min-h-0">
          {rightPanel === 'outline' ? (
            <OutlinePanel headings={headings} onHeadingClick={handleHeadingClick} activeHeadingId={activeHeadingId} />
          ) : (
            <ChatPanel noteContent={currentNote?.content || ''} noteId={currentNote?.id} />
          )}
        </div>
      </div>
    </div>
  );
}
