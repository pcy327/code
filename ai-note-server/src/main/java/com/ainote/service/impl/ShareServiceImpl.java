package com.ainote.service.impl;

import com.ainote.dto.*;
import com.ainote.entity.Note;
import com.ainote.entity.SharedNote;
import com.ainote.mapper.NoteMapper;
import com.ainote.mapper.SharedNoteMapper;
import com.ainote.service.ShareService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.data.MutableDataSet;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShareServiceImpl implements ShareService {

    private final SharedNoteMapper sharedNoteMapper;
    private final NoteMapper noteMapper;
    private final PasswordEncoder passwordEncoder;

    private static final Parser MD_PARSER;
    private static final HtmlRenderer MD_RENDERER;

    static {
        MutableDataSet options = new MutableDataSet();
        MD_PARSER = Parser.builder(options).build();
        MD_RENDERER = HtmlRenderer.builder(options).build();
    }

    @Override
    @Transactional
    public ShareResponse createShare(Long userId, ShareCreateRequest request) {
        // Verify note exists and belongs to user
        Note note = noteMapper.selectOne(
                new LambdaQueryWrapper<Note>()
                        .eq(Note::getId, request.getNoteId())
                        .eq(Note::getUserId, userId));
        if (note == null) throw new IllegalArgumentException("笔记不存在");

        SharedNote sn = new SharedNote();
        sn.setNoteId(request.getNoteId());
        sn.setUserId(userId);
        sn.setToken(generateToken());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            sn.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getExpiresInHours() != null && request.getExpiresInHours() > 0) {
            sn.setExpiresAt(LocalDateTime.now().plusHours(request.getExpiresInHours()));
        }

        sn.setIsRevoked(false);
        sharedNoteMapper.insert(sn);

        return toResponse(sn, note.getTitle());
    }

    @Override
    @Transactional
    public void revokeShare(Long userId, Long shareId) {
        SharedNote sn = sharedNoteMapper.selectOne(
                new LambdaQueryWrapper<SharedNote>()
                        .eq(SharedNote::getId, shareId)
                        .eq(SharedNote::getUserId, userId));
        if (sn == null) throw new IllegalArgumentException("分享链接不存在");
        sn.setIsRevoked(true);
        sharedNoteMapper.updateById(sn);
    }

    @Override
    public List<ShareResponse> listShares(Long userId) {
        List<SharedNote> list = sharedNoteMapper.selectList(
                new LambdaQueryWrapper<SharedNote>()
                        .eq(SharedNote::getUserId, userId)
                        .eq(SharedNote::getIsRevoked, false)
                        .orderByDesc(SharedNote::getCreatedAt));

        return list.stream().map(sn -> {
            Note note = noteMapper.selectById(sn.getNoteId());
            return toResponse(sn, note != null ? note.getTitle() : "已删除");
        }).collect(Collectors.toList());
    }

    @Override
    public SharedNotePublicResponse getSharedNote(String token) {
        SharedNote sn = validateToken(token);
        if (sn.getPasswordHash() != null) {
            // Requires password — don't return content yet
            SharedNotePublicResponse resp = new SharedNotePublicResponse();
            resp.setRequiresPassword(true);
            return resp;
        }
        return buildPublicResponse(sn);
    }

    @Override
    public SharedNotePublicResponse verifyPassword(String token, String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("密码不能为空");
        }
        SharedNote sn = validateToken(token);
        if (sn.getPasswordHash() == null) {
            return buildPublicResponse(sn);
        }
        if (!passwordEncoder.matches(password, sn.getPasswordHash())) {
            throw new IllegalArgumentException("密码错误");
        }
        return buildPublicResponse(sn);
    }

    // ---- internal helpers ----

    private SharedNote validateToken(String token) {
        SharedNote sn = sharedNoteMapper.selectOne(
                new LambdaQueryWrapper<SharedNote>().eq(SharedNote::getToken, token));
        if (sn == null) throw new IllegalArgumentException("分享链接不存在");
        if (sn.getIsRevoked()) throw new IllegalArgumentException("分享链接已失效");
        if (sn.getExpiresAt() != null && sn.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("分享链接已过期");
        }
        return sn;
    }

    private SharedNotePublicResponse buildPublicResponse(SharedNote sn) {
        Note note = noteMapper.selectById(sn.getNoteId());
        if (note == null) throw new IllegalArgumentException("笔记不存在");

        String md = note.getContent() != null ? note.getContent() : "";
        String bodyHtml = MD_RENDERER.render(MD_PARSER.parse(md));

        String fullHtml = """
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head><meta charset="utf-8">
            <style>
              body { max-width: 800px; margin: 40px auto; padding: 0 20px;
                     font-family: -apple-system, 'Georgia', serif; line-height: 1.8; color: #1e293b; }
              h1,h2,h3 { color: #0f172a; }
              pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
              code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
              img { max-width: 100%%; }
              blockquote { border-left: 4px solid #818cf8; margin: 1em 0; padding: 0 1em; color: #475569; }
              table { border-collapse: collapse; width: 100%%; }
              th, td { border: 1px solid #e2e8f0; padding: 8px 14px; text-align: left; }
            </style>
            </head>
            <body><h1>%s</h1>%s</body></html>
            """.formatted(escapeHtml(note.getTitle()), bodyHtml);

        SharedNotePublicResponse resp = new SharedNotePublicResponse();
        resp.setTitle(note.getTitle());
        resp.setContentHtml(fullHtml);
        resp.setRequiresPassword(false);
        return resp;
    }

    private synchronized String generateToken() {
        SecureRandom rng = new SecureRandom();
        byte[] bytes = new byte[16];
        rng.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private ShareResponse toResponse(SharedNote sn, String noteTitle) {
        ShareResponse r = new ShareResponse();
        r.setId(sn.getId());
        r.setNoteId(sn.getNoteId());
        r.setNoteTitle(noteTitle);
        r.setToken(sn.getToken());
        r.setHasPassword(sn.getPasswordHash() != null);
        r.setExpiresAt(sn.getExpiresAt());
        r.setCreatedAt(sn.getCreatedAt());
        return r;
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
