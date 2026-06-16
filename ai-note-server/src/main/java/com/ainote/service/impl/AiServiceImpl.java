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

    private static final String SYSTEM_PROMPT = """
            你是一个专业的AI助手，请严格使用标准Markdown格式回答用户的问题。
                                       必须遵守以下规则：
                                       - 一级标题 # 后面必须加空格，正确：# 标题，错误：#标题
                                       - 二级标题 ## 后面必须加空格，正确：## 小标题，错误：##小标题
                                       - 三级标题 ### 后面必须加空格
                                       - 代码必须放在三个反引号代码块中，并标注语言，如 ```java
                                       - 无序列表 - 后面必须加空格，正确：- 项目，错误：-项目
                                       - 有序列表 1. 后面必须加空格
                                       - 使用 **粗体** 强调重点
                                       - 引用 > 后面必须加空格
                                       - 适当使用表格和分隔线
                                       注意：标题、列表符号、引用符号后必须添加一个空格；其余Markdown标记（粗体、行内代码、链接等）无需额外添加空格。
            """;

    private static final String POLISH_SYSTEM = """
            你是一个中文写作优化专家。请优化以下文本：
            - 修正语病和错别字
            - 优化表达，使语句更流畅自然
            - 保持原意和风格不变
            - 只返回优化后的文本，不要添加任何解释
            """;

    private static final String TRANSLATE_SYSTEM = """
            请将以下文本翻译成英文。
            - 保持专业术语的准确性
            - 翻译自然流畅，符合英文表达习惯
            - 只返回翻译结果，不要添加任何解释
            """;

    private static final String SIMPLIFY_SYSTEM = """
            你是一个文字简化专家。请将以下文本简化：
            - 用更简洁的词汇替换复杂表达
            - 缩短长句，使内容更易理解
            - 保留核心信息
            - 只返回简化后的文本，不要添加任何解释
            """;

    private static final String EXPAND_SYSTEM = """
            你是一个写作扩写专家。请将以下文本扩写：
            - 在不改变原意的基础上增加细节和例证
            - 使内容更丰富、更有说服力
            - 保持原有风格和语气
            - 只返回扩写后的文本，不要添加任何解释
            """;

    @Override
    public String processText(String text, String action) {
        if (text == null || text.isBlank()) return "";

        String systemPrompt;
        String userInstruction;

        switch (action) {
            case "translate" -> {
                systemPrompt = TRANSLATE_SYSTEM;
                userInstruction = "请翻译：\n" + text;
            }
            case "simplify" -> {
                systemPrompt = SIMPLIFY_SYSTEM;
                userInstruction = "请简化：\n" + text;
            }
            case "expand" -> {
                systemPrompt = EXPAND_SYSTEM;
                userInstruction = "请扩写：\n" + text;
            }
            default -> {
                systemPrompt = POLISH_SYSTEM;
                userInstruction = "请优化：\n" + text;
            }
        }

        try {
            String result = chatClientBuilder.build()
                    .prompt()
                    .system(systemPrompt)
                    .user(userInstruction)
                    .call()
                    .content();
            return result != null ? result.trim() : text;
        } catch (Exception e) {
            log.error("AI process failed for action: {}", action, e);
            throw new RuntimeException("AI 处理失败，请稍后重试");
        }
    }

    private static final String NOTE_CHAT_SYSTEM = """
            你是一个笔记问答助手。用户会提供一篇笔记的内容，然后向你提问。
            请根据笔记内容回答问题：
            - 基于笔记内容给出准确、简洁的回答
            - 如果问题无法从笔记内容中找到答案，如实说明笔记中没有相关信息
            - 使用 Markdown 格式组织回答（标题、列表、代码块等）
            - 引用笔记内容时使用引用格式 >
            """;

    private static final String COMPLETE_SYSTEM = """
            你是一个写作助手。根据用户提供的上文，自然地进行续写。
            要求：
            - 只返回续写内容（几个词到一句话），不要解释、不要重复原文
            - 保持与原内容相同的语言、语气和风格
            - 如果是代码，保持正确的缩进和语法
            - 在自然停顿处停止（句尾、行尾、代码块结束等）
            """;

    @Override
    public void streamComplete(String context, StreamCallback callback) {
        if (context == null || context.trim().isEmpty()) {
            callback.onComplete("");
            return;
        }
        try {
            Flux<String> flux = chatClientBuilder.build()
                    .prompt()
                    .system(COMPLETE_SYSTEM)
                    .user("请续写以下内容：\n" + context)
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
            log.error("AI complete failed", e);
            callback.onError(e);
        }
    }

    @Override
    public void streamChat(String prompt, StreamCallback callback) {
        try {
            Flux<String> flux = chatClientBuilder.build()
                    .prompt()
                    .system(SYSTEM_PROMPT)
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

    @Override
    public void streamNoteChat(String noteContent, String question, StreamCallback callback) {
        try {
            String userPrompt = "笔记内容：\n" + noteContent + "\n\n---\n\n我的问题是：" + question;

            Flux<String> flux = chatClientBuilder.build()
                    .prompt()
                    .system(NOTE_CHAT_SYSTEM)
                    .user(userPrompt)
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
            log.error("AI note chat failed", e);
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
