package com.ainote.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ShareResponse {
    private Long id;
    private Long noteId;
    private String noteTitle;
    private String token;
    private boolean hasPassword;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
