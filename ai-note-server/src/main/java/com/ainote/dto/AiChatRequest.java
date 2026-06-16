package com.ainote.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiChatRequest {
    @NotBlank(message = "笔记内容不能为空")
    private String noteContent;

    @NotBlank(message = "问题不能为空")
    private String question;
}
