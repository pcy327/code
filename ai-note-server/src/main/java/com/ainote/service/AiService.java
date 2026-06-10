package com.ainote.service;

import com.ainote.dto.AiResponse;

public interface AiService {
    AiResponse generateSummary(String content);
    AiResponse suggestTags(String content);
    AiResponse optimizeMarkdown(String content);
}
