import { createContext, useContext, useReducer } from 'react';
import { noteReducer, initialState } from './noteReducer';

const NoteContext = createContext(null);
const NoteDispatchContext = createContext(null);

export function NoteProvider({ children }) {
  const [state, dispatch] = useReducer(noteReducer, initialState);

  return (
    <NoteContext.Provider value={state}>
      <NoteDispatchContext.Provider value={dispatch}>
        {children}
      </NoteDispatchContext.Provider>
    </NoteContext.Provider>
  );
}

export function useNoteState() {
  const ctx = useContext(NoteContext);
  if (ctx === null) {
    throw new Error('useNoteState must be used within a NoteProvider');
  }
  return ctx;
}

export function useNoteDispatch() {
  const ctx = useContext(NoteDispatchContext);
  if (ctx === null) {
    throw new Error('useNoteDispatch must be used within a NoteProvider');
  }
  return ctx;
}
