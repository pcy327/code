package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.AiRequest;
import com.ainote.dto.AiResponse;
import com.ainote.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/summary")
    public Result<AiResponse> summary(@Valid @RequestBody AiRequest request) {
        return Result.success(aiService.generateSummary(request.getContent()));
    }

    @PostMapping("/tags")
    public Result<AiResponse> tags(@Valid @RequestBody AiRequest request) {
        return Result.success(aiService.suggestTags(request.getContent()));
    }

    @PostMapping("/optimize")
    public Result<AiResponse> optimize(@Valid @RequestBody AiRequest request) {
        return Result.success(aiService.optimizeMarkdown(request.getContent()));
    }

    /**
     * SSE streaming endpoint — AI generates content token by token.
     * Frontend connects via EventSource or fetch ReadableStream.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestParam String prompt) {
        SseEmitter emitter = new SseEmitter(120_000L);
        // Capture security context for async thread
        SecurityContext secCtx = SecurityContextHolder.getContext();

        aiService.streamChat(prompt, new AiService.StreamCallback() {
            @Override
            public void onToken(String token) {
                SecurityContextHolder.setContext(secCtx);
                try {
                    emitter.send(SseEmitter.event().name("token").data(token));
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            }

            @Override
            public void onComplete(String fullText) {
                SecurityContextHolder.setContext(secCtx);
                try {
                    emitter.send(SseEmitter.event().name("done").data(fullText));
                    emitter.complete();
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            }

            @Override
            public void onError(Throwable e) {
                SecurityContextHolder.setContext(secCtx);
                try {
                    emitter.send(SseEmitter.event().name("error").data(e.getMessage()));
                } catch (IOException ex) { /* ignore */ }
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }
}
