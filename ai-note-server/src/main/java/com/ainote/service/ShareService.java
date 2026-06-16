package com.ainote.service;

import com.ainote.dto.*;

import java.util.List;

public interface ShareService {
    ShareResponse createShare(Long userId, ShareCreateRequest request);
    void revokeShare(Long userId, Long shareId);
    List<ShareResponse> listShares(Long userId);
    SharedNotePublicResponse getSharedNote(String token);
    SharedNotePublicResponse verifyPassword(String token, String password);
}
