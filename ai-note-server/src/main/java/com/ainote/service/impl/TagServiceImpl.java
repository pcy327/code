package com.ainote.service.impl;

import com.ainote.dto.TagRequest;
import com.ainote.entity.NoteTag;
import com.ainote.entity.Tag;
import com.ainote.mapper.NoteTagMapper;
import com.ainote.mapper.TagMapper;
import com.ainote.service.TagService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {

    private final TagMapper tagMapper;
    private final NoteTagMapper noteTagMapper;

    @Override
    public List<Tag> listTags(Long userId) {
        return tagMapper.selectList(
                new LambdaQueryWrapper<Tag>()
                        .eq(Tag::getUserId, userId)
                        .orderByDesc(Tag::getCreatedAt));
    }

    @Override
    public Tag createTag(Long userId, TagRequest request) {
        Long count = tagMapper.selectCount(
                new LambdaQueryWrapper<Tag>()
                        .eq(Tag::getUserId, userId)
                        .eq(Tag::getName, request.getName()));
        if (count > 0) {
            throw new IllegalArgumentException("标签名已存在");
        }

        Tag tag = new Tag();
        tag.setUserId(userId);
        tag.setName(request.getName());
        tag.setColor(request.getColor());
        tagMapper.insert(tag);
        return tag;
    }

    @Override
    public Tag updateTag(Long userId, Long tagId, TagRequest request) {
        Tag tag = tagMapper.selectOne(
                new LambdaQueryWrapper<Tag>()
                        .eq(Tag::getId, tagId)
                        .eq(Tag::getUserId, userId));
        if (tag == null) {
            throw new IllegalArgumentException("标签不存在");
        }

        if (request.getName() != null) {
            Long count = tagMapper.selectCount(
                    new LambdaQueryWrapper<Tag>()
                            .eq(Tag::getUserId, userId)
                            .eq(Tag::getName, request.getName())
                            .ne(Tag::getId, tagId));
            if (count > 0) {
                throw new IllegalArgumentException("标签名已存在");
            }
            tag.setName(request.getName());
        }
        if (request.getColor() != null) {
            tag.setColor(request.getColor());
        }
        tagMapper.updateById(tag);
        return tag;
    }

    @Override
    @Transactional
    public void deleteTag(Long userId, Long tagId) {
        Tag tag = tagMapper.selectOne(
                new LambdaQueryWrapper<Tag>()
                        .eq(Tag::getId, tagId)
                        .eq(Tag::getUserId, userId));
        if (tag == null) {
            throw new IllegalArgumentException("标签不存在");
        }
        noteTagMapper.delete(
                new LambdaQueryWrapper<NoteTag>()
                        .eq(NoteTag::getTagId, tagId));
        tagMapper.deleteById(tagId);
    }
}
