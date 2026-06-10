package com.ainote.service.impl;

import com.ainote.dto.AiResponse;
import com.ainote.service.AiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final ChatClient.Builder chatClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SUMMARY_PROMPT = """
            你是一个专业的文档摘要助手。请用简洁的语言总结以下 Markdown 文档的核心要点，控制在 150 字以内。

            文档内容：
            %s""";

    private static final String TAGS_PROMPT = """
            你是一个内容分类专家。根据以下 Markdown 文档内容，推荐 3-5 个标签。
            只返回 JSON 数组格式：["标签1","标签2","标签3"]，不要包含其他内容。

            文档内容：
            %s""";

    private static final String OPTIMIZE_PROMPT = """
            你是一个 Markdown 排版专家。请优化以下 Markdown 文档的排版格式：
            - 统一标题前后空行
            - 代码块前后空行
            - 删除多余空行（不超过2个连续空行）
            - 修正列表缩进
            只返回优化后的 Markdown 内容，不要添加任何解释。

            原始文档：
            %s""";

    @Override
    public AiResponse generateSummary(String content) {
        if (content == null || content.trim().length() < 50) {
            AiResponse resp = new AiResponse();
            resp.setSummary("内容过短，无法生成摘要");
            return resp;
        }

        try {
            String result = chatClientBuilder.build()
                    .prompt()
                    .user(u -> u.text(String.format(SUMMARY_PROMPT, content)))
                    .call()
                    .content();

            AiResponse resp = new AiResponse();
            resp.setSummary(result != null ? result.trim() : "");
            return resp;
        } catch (Exception e) {
            log.error("AI summary failed", e);
            throw new RuntimeException("AI 服务暂时不可用，请稍后重试");
        }
    }

    @Override
    public AiResponse suggestTags(String content) {
        if (content == null || content.trim().length() < 50) {
            AiResponse resp = new AiResponse();
            resp.setTags(List.of());
            return resp;
        }

        try {
            String result = chatClientBuilder.build()
                    .prompt()
                    .user(u -> u.text(String.format(TAGS_PROMPT, content)))
                    .call()
                    .content();

            List<String> tags = parseTagsFromResult(result);
            AiResponse resp = new AiResponse();
            resp.setTags(tags);
            return resp;
        } catch (Exception e) {
            log.error("AI tags failed, fallback to local", e);
            List<String> fallbackTags = localTagExtract(content);
            AiResponse resp = new AiResponse();
            resp.setTags(fallbackTags);
            return resp;
        }
    }

    @Override
    public AiResponse optimizeMarkdown(String content) {
        if (content == null || content.trim().isEmpty()) {
            AiResponse resp = new AiResponse();
            resp.setContent(content);
            return resp;
        }

        try {
            String result = chatClientBuilder.build()
                    .prompt()
                    .user(u -> u.text(String.format(OPTIMIZE_PROMPT, content)))
                    .call()
                    .content();

            AiResponse resp = new AiResponse();
            resp.setContent(result != null ? result.trim() : content);
            return resp;
        } catch (Exception e) {
            log.error("AI optimize failed", e);
            throw new RuntimeException("AI 服务暂时不可用，请稍后重试");
        }
    }

    private List<String> parseTagsFromResult(String result) {
        if (result == null) return List.of();
        try {
            String trimmed = result.trim();
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                @SuppressWarnings("unchecked")
                List<String> list = objectMapper.readValue(trimmed, List.class);
                return list;
            }
        } catch (Exception ignored) {
        }
        return Arrays.stream(result.replaceAll("[\\[\\]\"]", "").split("[,\\n]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .limit(5)
                .toList();
    }

    @Override
    public void streamChat(String prompt, StreamCallback callback) {
        try {
            Flux<String> flux = chatClientBuilder.build()
                    .prompt()
                    .user(prompt)
                    .stream()
                    .content();

            StringBuilder full = new StringBuilder();
            flux.doOnNext(token -> {
                full.append(token);
                callback.onToken(token);
            }).doOnComplete(() -> {
                callback.onComplete(full.toString());
            }).doOnError(callback::onError)
            .subscribe();
        } catch (Exception e) {
            log.error("AI stream failed", e);
            callback.onError(e);
        }
    }

    private List<String> localTagExtract(String content) {
        String[] keywords = {"react", "javascript", "typescript", "css", "html",
                "vue", "python", "java", "api", "ai", "markdown",
                "性能", "架构", "设计", "测试", "部署"};
        String lower = content.toLowerCase();
        return Arrays.stream(keywords)
                .filter(lower::contains)
                .limit(5)
                .toList();
    }
}
