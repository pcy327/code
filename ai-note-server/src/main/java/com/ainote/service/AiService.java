package com.ainote.service;

import com.ainote.dto.AiResponse;

public interface AiService {
    AiResponse generateSummary(String content);
    AiResponse suggestTags(String content);
    AiResponse optimizeMarkdown(String content);

    /**
     * Stream chat completion — callback receives tokens as they arrive.
     */
    void streamChat(String prompt, StreamCallback callback);

    interface StreamCallback {
        void onToken(String token);
        void onComplete(String fullText);
        void onError(Throwable e);
    }
}
