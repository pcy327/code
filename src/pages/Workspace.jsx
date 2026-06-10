import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { getNote } from '../api/notes';
import Sidebar from '../components/Sidebar';
import EditorPanel from '../components/EditorPanel';
import OutlinePanel from '../components/OutlinePanel';

/**
 * Workspace — immersive three-column document editor
 */
export default function Workspace() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();

  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  /* Load note detail (with content) from API when URL changes */
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
          dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: note });
        })
        .catch(() => {
          navigate('/', { replace: true });
        });
    } else if (!currentNote && notes.length > 0) {
      const first = notes[0];
      navigate(`/workspace/${first.id}`, { replace: true });
    }
  }, [noteId]);

  const handleHeadingsChange = useCallback((list) => {
    setHeadings(list);
  }, []);

  const handleHeadingClick = useCallback(
    (heading) => {
      setActiveHeadingId(heading.id);
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
      <div className="w-[15%] min-w-[180px] max-w-[220px] shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 min-w-0 flex flex-col border-x border-gray-100 h-full">
        <EditorPanel onHeadingsChange={handleHeadingsChange} />
      </div>
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
