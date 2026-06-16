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

    /**
     * Stream inline completion — short continuation for ghost text (Cursor Tab style).
     * @param context the text before the cursor
     */
    void streamComplete(String context, StreamCallback callback);

    /**
     * Process selected text: polish, translate, simplify, or expand.
     * @return the processed text
     */
    String processText(String text, String action);

    /**
     * Stream chat response about a specific note's content.
     */
    void streamNoteChat(String noteContent, String question, StreamCallback callback);

    interface StreamCallback {
        void onToken(String token);
        void onComplete(String fullText);
        void onError(Throwable e);
    }
}
