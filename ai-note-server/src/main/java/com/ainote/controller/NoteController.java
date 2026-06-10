package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.NoteListResponse;
import com.ainote.dto.NoteRequest;
import com.ainote.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @GetMapping
    public Result<Result.PageData<NoteListResponse>> list(
            Authentication authentication,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long tagId,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.listNotes(userId, keyword, tagId, page, size));
    }

    @GetMapping("/{id}")
    public Result<NoteListResponse> get(Authentication authentication, @PathVariable Long id) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.getNote(userId, id));
    }

    @PostMapping
    public Result<NoteListResponse> create(Authentication authentication,
                                           @Valid @RequestBody NoteRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.createNote(userId, request));
    }

    @PutMapping("/{id}")
    public Result<NoteListResponse> update(Authentication authentication,
                                           @PathVariable Long id,
                                           @Valid @RequestBody NoteRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.updateNote(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(Authentication authentication, @PathVariable Long id) {
        Long userId = (Long) authentication.getPrincipal();
        noteService.deleteNote(userId, id);
        return Result.success();
    }
}
