package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.*;
import com.ainote.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shares")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    /** Create a share link */
    @PostMapping
    public Result<ShareResponse> create(Authentication auth, @RequestBody ShareCreateRequest request) {
        Long userId = (Long) auth.getPrincipal();
        return Result.success(shareService.createShare(userId, request));
    }

    /** List active shares for current user */
    @GetMapping
    public Result<List<ShareResponse>> list(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return Result.success(shareService.listShares(userId));
    }

    /** Revoke a share link */
    @DeleteMapping("/{id}")
    public Result<Void> revoke(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        shareService.revokeShare(userId, id);
        return Result.success();
    }

    // ========== Public endpoints (no auth required) ==========

    /** Get shared note content by token (no password or after auth) */
    @GetMapping("/public/{token}")
    public Result<SharedNotePublicResponse> getPublic(@PathVariable String token) {
        return Result.success(shareService.getSharedNote(token));
    }

    /** Verify password for password-protected shared note */
    @PostMapping("/public/{token}/verify")
    public Result<SharedNotePublicResponse> verify(@PathVariable String token,
                                                   @RequestBody ShareVerifyRequest request) {
        return Result.success(shareService.verifyPassword(token, request.getPassword()));
    }
}
