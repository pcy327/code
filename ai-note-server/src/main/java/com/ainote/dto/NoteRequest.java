package com.ainote.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class NoteRequest {
    @Size(max = 255, message = "标题长度不能超过255")
    private String title;

    private String content;

    private String summary;

    private List<Long> tagIds;
}
