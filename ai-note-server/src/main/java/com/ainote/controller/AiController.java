package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.AiRequest;
import com.ainote.dto.AiResponse;
import com.ainote.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
}
