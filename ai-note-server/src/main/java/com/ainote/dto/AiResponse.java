package com.ainote.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiResponse {
    private String summary;
    private List<String> tags;
    private String content;
}
