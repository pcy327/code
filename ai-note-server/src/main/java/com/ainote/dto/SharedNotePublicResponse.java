package com.ainote.dto;

import lombok.Data;

@Data
public class SharedNotePublicResponse {
    private String title;
    private String contentHtml; // pre-rendered HTML from Markdown
    private boolean requiresPassword;
}
