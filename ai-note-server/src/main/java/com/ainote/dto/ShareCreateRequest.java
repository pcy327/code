package com.ainote.dto;

import lombok.Data;

@Data
public class ShareCreateRequest {
    private Long noteId;
    private String password;      // optional
    private Integer expiresInHours; // optional, null = never expires
}
