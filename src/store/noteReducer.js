/* ============================================================
 * AI-Note — Unified state (useReducer)
 *
 * Backend-driven. Data persistence handled by API, not localStorage.
 * Reducer stays pure — side effects happen in components via api/ modules.
 * ============================================================ */

/* ==============================================================
 * Initial State
 * ============================================================== */
export const initialState = {
  notes: [],         // loaded from API by Dashboard
  currentNote: null,
  isAiLoading: false,
  isLoading: false,
  searchKeyword: '',
  customTags: [],
  tagMap: {},         // tag name → tag id mapping for quick lookup
};

/* ==============================================================
 * Action Types
 * ============================================================== */
export const ACTION = {
  SET_NOTES: 'SET_NOTES',
  SET_CURRENT_NOTE: 'SET_CURRENT_NOTE',
  UPDATE_CURRENT_NOTE_FIELD: 'UPDATE_CURRENT_NOTE_FIELD',
  SET_AI_LOADING: 'SET_AI_LOADING',
  SET_LOADING: 'SET_LOADING',
  SET_SEARCH_KEYWORD: 'SET_SEARCH_KEYWORD',
  ADD_NOTE: 'ADD_NOTE',
  DELETE_NOTE: 'DELETE_NOTE',
  SAVE_CURRENT_NOTE: 'SAVE_CURRENT_NOTE',
  RESET_DEFAULTS: 'RESET_DEFAULTS',
  ADD_TAG: 'ADD_TAG',
  REMOVE_TAG: 'REMOVE_TAG',
  SET_CUSTOM_TAGS: 'SET_CUSTOM_TAGS',
  SET_TAG_MAP: 'SET_TAG_MAP',
};

/* ==============================================================
 * Reducer (pure function — no side effects)
 * ============================================================== */
export function noteReducer(state, action) {
  switch (action.type) {
    case ACTION.SET_NOTES:
      return { ...state, notes: action.payload, isLoading: false };

    case ACTION.SET_CURRENT_NOTE:
      return { ...state, currentNote: action.payload };

    case ACTION.UPDATE_CURRENT_NOTE_FIELD:
      return {
        ...state,
        currentNote: {
          ...state.currentNote,
          [action.payload.field]: action.payload.value,
          ...(action.payload.field === 'content' || action.payload.field === 'title'
            ? { updatedAt: new Date().toISOString() }
            : {}),
        },
      };

    case ACTION.SET_AI_LOADING:
      return { ...state, isAiLoading: action.payload };

    case ACTION.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ACTION.SET_SEARCH_KEYWORD:
      return { ...state, searchKeyword: action.payload };

    case ACTION.ADD_NOTE: {
      const newNote = action.payload?.id
        ? { ...action.payload, updatedAt: new Date().toISOString() }
        : {
            id: String(Date.now()),
            title: '未命名笔记',
            content: '',
            summary: '',
            tags: [],
            updatedAt: new Date().toISOString(),
          };
      return { ...state, notes: [newNote, ...state.notes], currentNote: newNote };
    }

    case ACTION.DELETE_NOTE: {
      const notes = state.notes.filter((n) => n.id !== action.payload);
      return {
        ...state,
        notes,
        currentNote: state.currentNote?.id === action.payload ? null : state.currentNote,
      };
    }

    case ACTION.SAVE_CURRENT_NOTE: {
      if (!state.currentNote) return state;
      const notes = state.notes.map((n) =>
        n.id === state.currentNote.id ? state.currentNote : n,
      );
      return { ...state, notes };
    }

    case ACTION.RESET_DEFAULTS:
      return { ...state, notes: [], currentNote: null, searchKeyword: '' };

    case ACTION.ADD_TAG: {
      const tag = action.payload?.trim?.() || action.payload;
      if (!tag || state.customTags.includes(tag)) return state;
      return { ...state, customTags: [...state.customTags, tag] };
    }

    case ACTION.REMOVE_TAG:
      return {
        ...state,
        customTags: state.customTags.filter((t) => t !== action.payload),
      };

    case ACTION.SET_CUSTOM_TAGS:
      return { ...state, customTags: action.payload };

    case ACTION.SET_TAG_MAP:
      return { ...state, tagMap: action.payload };

    default:
      return state;
  }
}
