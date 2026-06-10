package com.ainote.service;

import com.ainote.common.Result;
import com.ainote.dto.NoteListResponse;
import com.ainote.dto.NoteRequest;

public interface NoteService {
    Result.PageData<NoteListResponse> listNotes(Long userId, String keyword, Long tagId, long page, long size);
    NoteListResponse getNote(Long userId, Long noteId);
    NoteListResponse createNote(Long userId, NoteRequest request);
    NoteListResponse updateNote(Long userId, Long noteId, NoteRequest request);
    void deleteNote(Long userId, Long noteId);
}
