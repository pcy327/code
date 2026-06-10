package com.ainote.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class NoteListResponse {
    private Long id;
    private String title;
    private String content;
    private String summary;
    private List<TagInfo> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    public static class TagInfo {
        private Long id;
        private String name;
        private String color;
    }
}
