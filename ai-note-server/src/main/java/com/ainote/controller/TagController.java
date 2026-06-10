package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.TagRequest;
import com.ainote.entity.Tag;
import com.ainote.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public Result<List<Tag>> list(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(tagService.listTags(userId));
    }

    @PostMapping
    public Result<Tag> create(Authentication authentication,
                              @Valid @RequestBody TagRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(tagService.createTag(userId, request));
    }

    @PutMapping("/{id}")
    public Result<Tag> update(Authentication authentication,
                              @PathVariable Long id,
                              @Valid @RequestBody TagRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(tagService.updateTag(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(Authentication authentication, @PathVariable Long id) {
        Long userId = (Long) authentication.getPrincipal();
        tagService.deleteTag(userId, id);
        return Result.success();
    }
}
