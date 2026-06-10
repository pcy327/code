package com.ainote.service.impl;

import com.ainote.common.Result;
import com.ainote.dto.NoteListResponse;
import com.ainote.dto.NoteRequest;
import com.ainote.entity.Note;
import com.ainote.entity.NoteTag;
import com.ainote.entity.Tag;
import com.ainote.mapper.NoteMapper;
import com.ainote.mapper.NoteTagMapper;
import com.ainote.mapper.TagMapper;
import com.ainote.service.NoteService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteServiceImpl implements NoteService {

    private final NoteMapper noteMapper;
    private final TagMapper tagMapper;
    private final NoteTagMapper noteTagMapper;

    @Override
    public Result.PageData<NoteListResponse> listNotes(Long userId, String keyword,
                                                        Long tagId, long page, long size) {
        Page<Note> pageParam = new Page<>(page, size);
        IPage<Note> result = noteMapper.searchNotes(pageParam, userId, keyword, tagId);

        List<NoteListResponse> records = result.getRecords().stream()
                .map(note -> toListResponse(note, getTagsForNote(note.getId())))
                .collect(Collectors.toList());

        return new Result.PageData<>(records, result.getTotal(), page, size);
    }

    @Override
    public NoteListResponse getNote(Long userId, Long noteId) {
        Note note = noteMapper.selectOne(
                new LambdaQueryWrapper<Note>()
                        .eq(Note::getId, noteId)
                        .eq(Note::getUserId, userId));
        if (note == null) {
            throw new IllegalArgumentException("笔记不存在");
        }
        NoteListResponse resp = toListResponse(note, getTagsForNote(note.getId()));
        resp.setContent(note.getContent());
        return resp;
    }

    @Override
    @Transactional
    public NoteListResponse createNote(Long userId, NoteRequest request) {
        Note note = new Note();
        note.setUserId(userId);
        note.setTitle(request.getTitle() != null ? request.getTitle() : "未命名笔记");
        note.setContent(request.getContent());
        note.setSummary(request.getSummary());
        noteMapper.insert(note);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            saveNoteTags(note.getId(), request.getTagIds());
        }

        return toListResponse(note, getTagsForNote(note.getId()));
    }

    @Override
    @Transactional
    public NoteListResponse updateNote(Long userId, Long noteId, NoteRequest request) {
        Note note = noteMapper.selectOne(
                new LambdaQueryWrapper<Note>()
                        .eq(Note::getId, noteId)
                        .eq(Note::getUserId, userId));
        if (note == null) {
            throw new IllegalArgumentException("笔记不存在");
        }

        if (request.getTitle() != null) note.setTitle(request.getTitle());
        if (request.getContent() != null) note.setContent(request.getContent());
        if (request.getSummary() != null) note.setSummary(request.getSummary());
        noteMapper.updateById(note);

        if (request.getTagIds() != null) {
            List<Long> existingTagIds = noteTagMapper.selectTagIdsByNoteId(noteId);
            if (!existingTagIds.isEmpty()) {
                noteTagMapper.delete(
                        new LambdaQueryWrapper<NoteTag>()
                                .eq(NoteTag::getNoteId, noteId));
            }
            if (!request.getTagIds().isEmpty()) {
                saveNoteTags(noteId, request.getTagIds());
            }
        }

        return toListResponse(note, getTagsForNote(note.getId()));
    }

    @Override
    @Transactional
    public void deleteNote(Long userId, Long noteId) {
        Note note = noteMapper.selectOne(
                new LambdaQueryWrapper<Note>()
                        .eq(Note::getId, noteId)
                        .eq(Note::getUserId, userId));
        if (note == null) {
            throw new IllegalArgumentException("笔记不存在");
        }
        noteMapper.deleteById(noteId);
    }

    private List<NoteListResponse.TagInfo> getTagsForNote(Long noteId) {
        List<Long> tagIds = noteTagMapper.selectTagIdsByNoteId(noteId);
        if (tagIds.isEmpty()) return List.of();
        List<Tag> tags = tagMapper.selectBatchIds(tagIds);
        return tags.stream()
                .map(t -> {
                    NoteListResponse.TagInfo ti = new NoteListResponse.TagInfo();
                    ti.setId(t.getId());
                    ti.setName(t.getName());
                    ti.setColor(t.getColor());
                    return ti;
                })
                .collect(Collectors.toList());
    }

    private void saveNoteTags(Long noteId, List<Long> tagIds) {
        for (Long tagId : tagIds) {
            NoteTag nt = new NoteTag();
            nt.setNoteId(noteId);
            nt.setTagId(tagId);
            noteTagMapper.insert(nt);
        }
    }

    private NoteListResponse toListResponse(Note note, List<NoteListResponse.TagInfo> tags) {
        NoteListResponse resp = new NoteListResponse();
        resp.setId(note.getId());
        resp.setTitle(note.getTitle());
        resp.setSummary(note.getSummary());
        resp.setTags(tags);
        resp.setCreatedAt(note.getCreatedAt());
        resp.setUpdatedAt(note.getUpdatedAt());
        return resp;
    }
}
