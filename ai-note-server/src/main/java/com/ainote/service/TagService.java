package com.ainote.service;

import com.ainote.dto.TagRequest;
import com.ainote.entity.Tag;
import java.util.List;

public interface TagService {
    List<Tag> listTags(Long userId);
    Tag createTag(Long userId, TagRequest request);
    Tag updateTag(Long userId, Long tagId, TagRequest request);
    void deleteTag(Long userId, Long tagId);
}
