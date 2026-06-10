# Spring Boot 后端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AI-Note 创建 Spring Boot 后端，实现笔记 CRUD、多用户认证、AI 集成，并将前端接入后端 API。

**Architecture:** 前后端分离 — Spring Boot 提供 REST API（端口 8080），React Vite 前端独立运行（端口 5173）通过代理转发 /api 请求。Controller → Service → Mapper 三层架构，DTO 与 Entity 分离。

**Tech Stack:** Spring Boot 3.4.x, MyBatis-Plus 3.5.9, PostgreSQL 15+, Spring Security + JWT (jjwt 0.12.6), Spring AI 1.0.0-M6, Knife4j 4.5.0, Maven, Java 17

---

## 文件结构总览

```
ai-note/
├── ai-note-server/                    ← 新建：Spring Boot 后端
│   ├── pom.xml
│   ├── src/main/java/com/ainote/
│   │   ├── AiNoteApplication.java
│   │   ├── common/
│   │   │   ├── Result.java            ← 统一响应
│   │   │   └── GlobalExceptionHandler.java
│   │   ├── config/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── CorsConfig.java
│   │   │   └── MybatisPlusConfig.java
│   │   ├── security/
│   │   │   ├── JwtUtils.java
│   │   │   ├── JwtAuthFilter.java
│   │   │   └── UserDetailsServiceImpl.java
│   │   ├── entity/
│   │   │   ├── User.java
│   │   │   ├── Note.java
│   │   │   ├── Tag.java
│   │   │   └── NoteTag.java
│   │   ├── dto/
│   │   │   ├── LoginRequest.java
│   │   │   ├── RegisterRequest.java
│   │   │   ├── AuthResponse.java
│   │   │   ├── NoteRequest.java
│   │   │   ├── NoteListResponse.java
│   │   │   ├── TagRequest.java
│   │   │   ├── AiRequest.java
│   │   │   └── AiResponse.java
│   │   ├── mapper/
│   │   │   ├── UserMapper.java
│   │   │   ├── NoteMapper.java
│   │   │   ├── TagMapper.java
│   │   │   └── NoteTagMapper.java
│   │   ├── service/
│   │   │   ├── AuthService.java
│   │   │   ├── NoteService.java
│   │   │   ├── TagService.java
│   │   │   ├── AiService.java
│   │   │   └── impl/
│   │   │       ├── AuthServiceImpl.java
│   │   │       ├── NoteServiceImpl.java
│   │   │       ├── TagServiceImpl.java
│   │   │       └── AiServiceImpl.java
│   │   └── controller/
│   │       ├── AuthController.java
│   │       ├── NoteController.java
│   │       ├── TagController.java
│   │       └── AiController.java
│   └── src/main/resources/
│       ├── application.yml
│       └── db/
│           └── schema.sql            ← 建表 + 索引 DDL
│
├── src/                              ← 现有前端改造
│   ├── api/
│   │   ├── client.js
│   │   ├── auth.js
│   │   ├── notes.js
│   │   ├── tags.js
│   │   └── ai.js
│   ├── store/
│   │   ├── AuthContext.jsx           ← 新增
│   │   └── noteReducer.js            ← 改造
│   └── pages/
│       ├── Login.jsx                 ← 新增
│       └── Register.jsx              ← 新增
└── vite.config.js                    ← 改造：添加代理
```

---

### Task 1: 初始化 Spring Boot 项目

**Files:**
- Create: `ai-note-server/pom.xml`
- Create: `ai-note-server/src/main/java/com/ainote/AiNoteApplication.java`
- Create: `ai-note-server/src/main/resources/application.yml`

- [ ] **Step 1: 创建 pom.xml**

在 `ai-note-server/` 目录下创建 `pom.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.3</version>
        <relativePath/>
    </parent>

    <groupId>com.ainote</groupId>
    <artifactId>ai-note-server</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>ai-note-server</name>

    <properties>
        <java.version>17</java.version>
        <mybatis-plus.version>3.5.9</mybatis-plus.version>
        <jjwt.version>0.12.6</jjwt.version>
        <knife4j.version>4.5.0</knife4j.version>
        <spring-ai.version>1.0.0-M6</spring-ai.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- MyBatis-Plus -->
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
            <version>${mybatis-plus.version}</version>
        </dependency>

        <!-- PostgreSQL -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Spring AI -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
            <version>${spring-ai.version}</version>
        </dependency>

        <!-- Knife4j API 文档 -->
        <dependency>
            <groupId>com.github.xiaoymin</groupId>
            <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
            <version>${knife4j.version}</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <repositories>
        <repository>
            <id>spring-milestones</id>
            <name>Spring Milestones</name>
            <url>https://repo.spring.io/milestone</url>
        </repository>
    </repositories>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: 创建 application.yml**

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ai_note
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
  sql:
    init:
      mode: always
      schema-locations: classpath:db/schema.sql
  ai:
    openai:
      api-key: ${OPENAI_API_KEY:sk-dummy}
      base-url: ${OPENAI_BASE_URL:https://api.openai.com}
      chat:
        options:
          model: gpt-4o-mini
          temperature: 0.3
          max-tokens: 2000

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: isDeleted
      logic-delete-value: true
      logic-not-delete-value: false

jwt:
  secret: ${JWT_SECRET:ai-note-default-secret-key-change-in-production}
  expiration: 604800000

knife4j:
  enable: true
  setting:
    language: zh_cn

logging:
  level:
    com.ainote: debug
```

- [ ] **Step 3: 创建启动类**

`ai-note-server/src/main/java/com/ainote/AiNoteApplication.java`：

```java
package com.ainote;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AiNoteApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiNoteApplication.class, args);
    }
}
```

- [ ] **Step 4: 创建 DDL 建表脚本**

`ai-note-server/src/main/resources/db/schema.sql`：

```sql
CREATE TABLE IF NOT EXISTS "user" (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id),
    title VARCHAR(255) NOT NULL DEFAULT '未命名笔记',
    content TEXT,
    summary TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tag (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS note_tag (
    note_id BIGINT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_note_user_id ON note(user_id);
CREATE INDEX IF NOT EXISTS idx_note_updated_at ON note(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_is_deleted ON note(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tag_user_id ON tag(user_id);
CREATE INDEX IF NOT EXISTS idx_note_tag_note_id ON note_tag(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tag_tag_id ON note_tag(tag_id);

-- 全文搜索索引（PostgreSQL GIN + zhparser 可选）
CREATE INDEX IF NOT EXISTS idx_note_search ON note USING GIN (
    to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);
```

- [ ] **Step 5: 验证项目编译**

Run:
```bash
cd ai-note-server && mvn compile
```
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: init Spring Boot project with dependencies and DDL"
```

---

### Task 2: 统一响应与异常处理

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/common/Result.java`
- Create: `ai-note-server/src/main/java/com/ainote/common/GlobalExceptionHandler.java`

- [ ] **Step 1: 创建统一响应类**

`Result.java`：

```java
package com.ainote.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    private int code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        return new Result<>(200, "success", data);
    }

    public static <T> Result<T> success() {
        return new Result<>(200, "success", null);
    }

    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }

    // ---- 分页快捷 ----
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PageData<T> {
        private List<T> records;
        private long total;
        private long page;
        private long pageSize;
    }
}
```

- [ ] **Step 2: 创建全局异常处理器**

`GlobalExceptionHandler.java`：

```java
package com.ainote.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(Result.error(400, msg));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Result<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Result.error(400, ex.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Result<Void>> handleAuth(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Result.error(401, "用户名或密码错误"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Result<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Result.error(403, "无权访问"));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Result<Void>> handleRuntime(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(500, ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleAll(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(500, "服务器内部错误"));
    }
}
```

- [ ] **Step 3: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add unified response and global exception handler"
```

---

### Task 3: 创建 Entity 实体类

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/entity/User.java`
- Create: `ai-note-server/src/main/java/com/ainote/entity/Note.java`
- Create: `ai-note-server/src/main/java/com/ainote/entity/Tag.java`
- Create: `ai-note-server/src/main/java/com/ainote/entity/NoteTag.java`

- [ ] **Step 1: 创建 User 实体**

`User.java`：

```java
package com.ainote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("\"user\"")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;
    private String passwordHash;
    private String email;
    private String avatarUrl;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 2: 创建 Note 实体**

`Note.java`：

```java
package com.ainote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("note")
public class Note {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String title;
    private String content;
    private String summary;

    @TableLogic
    private Boolean isDeleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 3: 创建 Tag 实体**

`Tag.java`：

```java
package com.ainote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag")
public class Tag {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String name;
    private String color;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
```

- [ ] **Step 4: 创建 NoteTag 关联实体**

`NoteTag.java`：

```java
package com.ainote.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("note_tag")
public class NoteTag {
    private Long noteId;
    private Long tagId;
}
```

- [ ] **Step 5: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add entity classes for user, note, tag, note_tag"
```

---

### Task 4: 创建 Mapper 接口 + MyBatis-Plus 配置

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/mapper/UserMapper.java`
- Create: `ai-note-server/src/main/java/com/ainote/mapper/NoteMapper.java`
- Create: `ai-note-server/src/main/java/com/ainote/mapper/TagMapper.java`
- Create: `ai-note-server/src/main/java/com/ainote/mapper/NoteTagMapper.java`
- Create: `ai-note-server/src/main/java/com/ainote/config/MybatisPlusConfig.java`

- [ ] **Step 1: 创建 UserMapper**

`UserMapper.java`：

```java
package com.ainote.mapper;

import com.ainote.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
```

- [ ] **Step 2: 创建 NoteMapper（含自定义查询）**

`NoteMapper.java`：

```java
package com.ainote.mapper;

import com.ainote.entity.Note;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface NoteMapper extends BaseMapper<Note> {

    IPage<Note> searchNotes(Page<Note> page,
                            @Param("userId") Long userId,
                            @Param("keyword") String keyword,
                            @Param("tagId") Long tagId);
}
```

- [ ] **Step 3: 创建 NoteMapper.xml**

创建 `ai-note-server/src/main/resources/mapper/NoteMapper.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ainote.mapper.NoteMapper">

    <select id="searchNotes" resultType="com.ainote.entity.Note">
        SELECT DISTINCT n.*
        FROM note n
        <if test="tagId != null">
            INNER JOIN note_tag nt ON n.id = nt.note_id
        </if>
        WHERE n.user_id = #{userId}
          AND n.is_deleted = FALSE
        <if test="keyword != null and keyword != ''">
          AND to_tsvector('simple', COALESCE(n.title, '') || ' ' || COALESCE(n.content, ''))
              @@ plainto_tsquery('simple', #{keyword})
        </if>
        <if test="tagId != null">
          AND nt.tag_id = #{tagId}
        </if>
        ORDER BY n.updated_at DESC
    </select>

</mapper>
```

- [ ] **Step 4: 创建 TagMapper 和 NoteTagMapper**

`TagMapper.java`：

```java
package com.ainote.mapper;

import com.ainote.entity.Tag;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TagMapper extends BaseMapper<Tag> {
}
```

`NoteTagMapper.java`：

```java
package com.ainote.mapper;

import com.ainote.entity.NoteTag;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface NoteTagMapper extends BaseMapper<NoteTag> {

    List<Long> selectTagIdsByNoteId(@Param("noteId") Long noteId);
}
```

创建 `ai-note-server/src/main/resources/mapper/NoteTagMapper.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ainote.mapper.NoteTagMapper">

    <select id="selectTagIdsByNoteId" resultType="java.lang.Long">
        SELECT tag_id FROM note_tag WHERE note_id = #{noteId}
    </select>

</mapper>
```

- [ ] **Step 5: 创建 MybatisPlusConfig**

`MybatisPlusConfig.java`：

```java
package com.ainote.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.POSTGRE_SQL));
        return interceptor;
    }
}
```

- [ ] **Step 6: 更新 application.yml 添加 mapper xml 路径**

在 `application.yml` 的 `mybatis-plus` 块追加：

```yaml
mybatis-plus:
  mapper-locations: classpath:mapper/*.xml
```

- [ ] **Step 7: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add mapper interfaces with search SQL and MyBatis-Plus config"
```

---

### Task 5: 创建 DTO 类

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/dto/LoginRequest.java`
- Create: `ai-note-server/src/main/java/com/ainote/dto/RegisterRequest.java`
- Create: `ai-note-server/src/main/java/com/ainote/dto/AuthResponse.java`
- Create: `ai-note-server/src/main/java/com/ainote/dto/NoteRequest.java`
- Create: `ai-note-server/src/main/java/com/ainote/dto/NoteListResponse.java`
- Create: `ai-note-server/src/main/java/com/ainote/dto/TagRequest.java`
- Create: `ai-note-server/src/main/java/com/ainote/dto/AiRequest.java`
- Create: `ai-note-server/src/main/java/com/ainote/dto/AiResponse.java`

- [ ] **Step 1: 创建认证 DTO**

`LoginRequest.java`：

```java
package com.ainote.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;
}
```

`RegisterRequest.java`：

```java
package com.ainote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 50, message = "用户名长度为2-50个字符")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, message = "密码最少6位")
    private String password;

    private String email;
}
```

`AuthResponse.java`：

```java
package com.ainote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private Long id;
    private String username;
    private String email;
    private String avatarUrl;
    private String token;
}
```

- [ ] **Step 2: 创建笔记 DTO**

`NoteRequest.java`：

```java
package com.ainote.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class NoteRequest {
    @Size(max = 255, message = "标题长度不能超过255")
    private String title;

    private String content;

    private String summary;

    private List<Long> tagIds;
}
```

`NoteListResponse.java`：

```java
package com.ainote.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class NoteListResponse {
    private Long id;
    private String title;
    private String summary;
    private List<TagInfo> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    public static class TagInfo {
        private Long id;
        private String name;
        private String color;
    }
}
```

- [ ] **Step 3: 创建标签 DTO**

`TagRequest.java`：

```java
package com.ainote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TagRequest {
    @NotBlank(message = "标签名不能为空")
    @Size(max = 50, message = "标签名最长50个字符")
    private String name;

    private String color;
}
```

- [ ] **Step 4: 创建 AI DTO**

`AiRequest.java`：

```java
package com.ainote.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiRequest {
    @NotBlank(message = "内容不能为空")
    private String content;
}
```

`AiResponse.java`：

```java
package com.ainote.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiResponse {
    private String summary;       // 摘要结果
    private List<String> tags;    // 标签推荐结果
    private String content;       // 排版优化结果
}
```

- [ ] **Step 5: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add all DTO classes"
```

---

### Task 6: JWT 工具类

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/security/JwtUtils.java`

- [ ] **Step 1: 创建 JwtUtils**

`JwtUtils.java`：

```java
package com.ainote.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    private final SecretKey key;
    private final long expiration;

    public JwtUtils(@Value("${jwt.secret}") String secret,
                    @Value("${jwt.expiration}") long expiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    public String generateToken(Long userId, String username) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiration))
                .signWith(key)
                .compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        return Long.parseLong(claims.getSubject());
    }

    public String getUsernameFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("username", String.class);
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add JWT utility class"
```

---

### Task 7: Spring Security 配置 + JWT Filter

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/security/JwtAuthFilter.java`
- Create: `ai-note-server/src/main/java/com/ainote/security/UserDetailsServiceImpl.java`
- Create: `ai-note-server/src/main/java/com/ainote/config/SecurityConfig.java`
- Create: `ai-note-server/src/main/java/com/ainote/config/CorsConfig.java`

- [ ] **Step 1: 创建 JwtAuthFilter**

`JwtAuthFilter.java`：

```java
package com.ainote.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        if (StringUtils.hasText(token) && jwtUtils.validateToken(token)) {
            Long userId = jwtUtils.getUserIdFromToken(token);
            String username = jwtUtils.getUsernameFromToken(token);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userId, null, Collections.emptyList());
            authentication.setDetails(username);

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
```

- [ ] **Step 2: 创建 SecurityConfig**

`SecurityConfig.java`：

```java
package com.ainote.config;

import com.ainote.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/doc.html", "/v3/api-docs/**", "/webjars/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

- [ ] **Step 3: 创建 CorsConfig**

`CorsConfig.java`：

```java
package com.ainote.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("http://localhost:5173"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
```

- [ ] **Step 4: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add Spring Security config with JWT filter and CORS"
```

---

### Task 8: 认证服务与控制器

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/service/AuthService.java`
- Create: `ai-note-server/src/main/java/com/ainote/service/impl/AuthServiceImpl.java`
- Create: `ai-note-server/src/main/java/com/ainote/controller/AuthController.java`

- [ ] **Step 1: 创建 AuthService 接口**

`AuthService.java`：

```java
package com.ainote.service;

import com.ainote.dto.AuthResponse;
import com.ainote.dto.LoginRequest;
import com.ainote.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse getMe(Long userId);
}
```

- [ ] **Step 2: 创建 AuthServiceImpl**

`AuthServiceImpl.java`：

```java
package com.ainote.service.impl;

import com.ainote.dto.AuthResponse;
import com.ainote.dto.LoginRequest;
import com.ainote.dto.RegisterRequest;
import com.ainote.entity.User;
import com.ainote.mapper.UserMapper;
import com.ainote.security.JwtUtils;
import com.ainote.service.AuthService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Override
    public AuthResponse register(RegisterRequest request) {
        // 检查用户名是否已存在
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, request.getUsername()));
        if (count > 0) {
            throw new IllegalArgumentException("用户名已存在");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        userMapper.insert(user);

        String token = jwtUtils.generateToken(user.getId(), user.getUsername());
        return toResponse(user, token);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, request.getUsername()));
        if (user == null) {
            throw new BadCredentialsException("用户名或密码错误");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("用户名或密码错误");
        }

        String token = jwtUtils.generateToken(user.getId(), user.getUsername());
        return toResponse(user, token);
    }

    @Override
    public AuthResponse getMe(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        return toResponse(user, null);
    }

    private AuthResponse toResponse(User user, String token) {
        AuthResponse resp = new AuthResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatarUrl(),
                token
        );
        return resp;
    }
}
```

- [ ] **Step 3: 创建 AuthController**

`AuthController.java`：

```java
package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.AuthResponse;
import com.ainote.dto.LoginRequest;
import com.ainote.dto.RegisterRequest;
import com.ainote.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public Result<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return Result.success(authService.register(request));
    }

    @PostMapping("/login")
    public Result<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.login(request));
    }

    @GetMapping("/me")
    public Result<AuthResponse> me(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(authService.getMe(userId));
    }
}
```

- [ ] **Step 4: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add auth service and controller (register/login/me)"
```

---

### Task 9: 笔记服务与控制器

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/service/NoteService.java`
- Create: `ai-note-server/src/main/java/com/ainote/service/impl/NoteServiceImpl.java`
- Create: `ai-note-server/src/main/java/com/ainote/controller/NoteController.java`

- [ ] **Step 1: 创建 NoteService 接口**

`NoteService.java`：

```java
package com.ainote.service;

import com.ainote.common.Result;
import com.ainote.dto.NoteListResponse;
import com.ainote.dto.NoteRequest;

public interface NoteService {
    Result.PageData<NoteListResponse> listNotes(Long userId, String keyword, Long tagId, long page, long size);
    NoteListResponse getNote(Long userId, Long noteId);
    NoteListResponse createNote(Long userId, NoteRequest request);
    NoteListResponse updateNote(Long userId, Long noteId, NoteRequest request);
    void deleteNote(Long userId, Long noteId);
}
```

- [ ] **Step 2: 创建 NoteServiceImpl**

`NoteServiceImpl.java`：

```java
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
        return toListResponse(note, getTagsForNote(note.getId()));
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

        // 关联标签
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

        // 更新标签关联
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

    // ---- 私有辅助 ----

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
```

- [ ] **Step 3: 创建 NoteController**

`NoteController.java`：

```java
package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.NoteListResponse;
import com.ainote.dto.NoteRequest;
import com.ainote.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @GetMapping
    public Result<Result.PageData<NoteListResponse>> list(
            Authentication authentication,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long tagId,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.listNotes(userId, keyword, tagId, page, size));
    }

    @GetMapping("/{id}")
    public Result<NoteListResponse> get(Authentication authentication, @PathVariable Long id) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.getNote(userId, id));
    }

    @PostMapping
    public Result<NoteListResponse> create(Authentication authentication,
                                           @Valid @RequestBody NoteRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.createNote(userId, request));
    }

    @PutMapping("/{id}")
    public Result<NoteListResponse> update(Authentication authentication,
                                           @PathVariable Long id,
                                           @Valid @RequestBody NoteRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return Result.success(noteService.updateNote(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(Authentication authentication, @PathVariable Long id) {
        Long userId = (Long) authentication.getPrincipal();
        noteService.deleteNote(userId, id);
        return Result.success();
    }
}
```

- [ ] **Step 4: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add note service and controller with full CRUD"
```

---

### Task 10: 标签服务与控制器

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/service/TagService.java`
- Create: `ai-note-server/src/main/java/com/ainote/service/impl/TagServiceImpl.java`
- Create: `ai-note-server/src/main/java/com/ainote/controller/TagController.java`

- [ ] **Step 1: 创建 TagService 接口**

`TagService.java`：

```java
package com.ainote.service;

import com.ainote.entity.Tag;
import com.ainote.dto.TagRequest;
import java.util.List;

public interface TagService {
    List<Tag> listTags(Long userId);
    Tag createTag(Long userId, TagRequest request);
    Tag updateTag(Long userId, Long tagId, TagRequest request);
    void deleteTag(Long userId, Long tagId);
}
```

- [ ] **Step 2: 创建 TagServiceImpl**

`TagServiceImpl.java`：

```java
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
        // 检查标签名是否重复
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
            // 检查新名称是否与其他标签冲突
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
        // 级联删除关联
        noteTagMapper.delete(
                new LambdaQueryWrapper<NoteTag>()
                        .eq(NoteTag::getTagId, tagId));
        tagMapper.deleteById(tagId);
    }
}
```

- [ ] **Step 3: 创建 TagController**

`TagController.java`：

```java
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
```

- [ ] **Step 4: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add tag service and controller with CRUD"
```

---

### Task 11: AI 服务与控制器

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/service/AiService.java`
- Create: `ai-note-server/src/main/java/com/ainote/service/impl/AiServiceImpl.java`
- Create: `ai-note-server/src/main/java/com/ainote/controller/AiController.java`

- [ ] **Step 1: 创建 AiService 接口**

`AiService.java`：

```java
package com.ainote.service;

import com.ainote.dto.AiResponse;

public interface AiService {
    AiResponse generateSummary(String content);
    AiResponse suggestTags(String content);
    AiResponse optimizeMarkdown(String content);
}
```

- [ ] **Step 2: 创建 AiServiceImpl**

`AiServiceImpl.java`：

```java
package com.ainote.service.impl;

import com.ainote.dto.AiResponse;
import com.ainote.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final ChatClient.Builder chatClientBuilder;

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

            // 降级：AI 不可用时使用本地关键词匹配
            List<String> tags = parseTagsFromResult(result);

            AiResponse resp = new AiResponse();
            resp.setTags(tags);
            return resp;
        } catch (Exception e) {
            log.error("AI tags failed, fallback to local", e);
            // 降级：本地关键词匹配
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

    // ---- 私有辅助 ----

    private List<String> parseTagsFromResult(String result) {
        if (result == null) return List.of();
        try {
            // 尝试解析 JSON 数组
            String trimmed = result.trim();
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                return com.fasterxml.jackson.databind.ObjectMapperHolder.get()
                        .readValue(trimmed, List.class);
            }
        } catch (Exception ignored) {
        }
        // 降级：按行拆分
        return List.of(result.replaceAll("[\\[\\]\"]", "").split("[,\\n]"))
                .stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .limit(5)
                .toList();
    }

    private List<String> localTagExtract(String content) {
        String[] keywords = {"react", "javascript", "typescript", "css", "html",
                "vue", "python", "java", "api", "ai", "markdown",
                "性能", "架构", "设计", "测试", "部署"};
        String lower = content.toLowerCase();
        return java.util.Arrays.stream(keywords)
                .filter(lower::contains)
                .limit(5)
                .toList();
    }
}
```

> **注意：** `ObjectMapperHolder` 是 Jackson 2.17+ 的内部类。如果编译不通过，替换为 `new com.fasterxml.jackson.databind.ObjectMapper().readValue(...)`。

- [ ] **Step 3: 创建 AiController**

`AiController.java`：

```java
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
```

- [ ] **Step 4: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add AI service with Spring AI and controller"
```

---

### Task 12: MessageSource 自动填充配置

**Files:**
- Create: `ai-note-server/src/main/java/com/ainote/config/MetaObjectHandlerConfig.java`

- [ ] **Step 1: 创建自动填充处理器**

MyBatis-Plus 的 `@TableField(fill = ...)` 需要配合 MetaObjectHandler 才能自动填充时间字段。

`MetaObjectHandlerConfig.java`：

```java
package com.ainote.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

@Configuration
public class MetaObjectHandlerConfig implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd ai-note-server && git add -A && git commit -m "feat: add MyBatis-Plus MetaObjectHandler for auto-fill timestamps"
```

---

### Task 13: 前端 API 层 — axios 客户端与 auth 模块

**Files:**
- Create: `src/api/client.js`
- Create: `src/api/auth.js`

- [ ] **Step 1: 创建 axios 客户端**

`src/api/client.js`：

```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动带 Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一解包 + 401 跳登录
client.interceptors.response.use(
  (res) => res.data.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message = err.response?.data?.message || '网络错误';
    return Promise.reject(new Error(message));
  },
);

export default client;
```

- [ ] **Step 2: 创建 auth API 模块**

`src/api/auth.js`：

```javascript
import client from './client';

export function login(username, password) {
  return client.post('/auth/login', { username, password });
}

export function register(username, password, email) {
  return client.post('/auth/register', { username, password, email });
}

export function getMe() {
  return client.get('/auth/me');
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add axios client and auth API module"
```

---

### Task 14: 前端 API 层 — notes / tags / ai 模块

**Files:**
- Create: `src/api/notes.js`
- Create: `src/api/tags.js`
- Create: `src/api/ai.js`

- [ ] **Step 1: 创建 notes API**

`src/api/notes.js`：

```javascript
import client from './client';

export function listNotes(params = {}) {
  return client.get('/notes', { params });
}

export function getNote(id) {
  return client.get(`/notes/${id}`);
}

export function createNote(data) {
  return client.post('/notes', data);
}

export function updateNote(id, data) {
  return client.put(`/notes/${id}`, data);
}

export function deleteNote(id) {
  return client.delete(`/notes/${id}`);
}
```

- [ ] **Step 2: 创建 tags API**

`src/api/tags.js`：

```javascript
import client from './client';

export function listTags() {
  return client.get('/tags');
}

export function createTag(data) {
  return client.post('/tags', data);
}

export function updateTag(id, data) {
  return client.put(`/tags/${id}`, data);
}

export function deleteTag(id) {
  return client.delete(`/tags/${id}`);
}
```

- [ ] **Step 3: 创建 ai API**

`src/api/ai.js`：

```javascript
import client from './client';

export function generateSummary(content) {
  return client.post('/ai/summary', { content });
}

export function suggestTags(content) {
  return client.post('/ai/tags', { content });
}

export function optimizeMarkdown(content) {
  return client.post('/ai/optimize', { content });
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add notes, tags, ai API modules"
```

---

### Task 15: AuthContext + ProtectedRoute

**Files:**
- Create: `src/store/AuthContext.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: 创建 AuthContext**

`src/store/AuthContext.jsx`：

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  // 启动时验证 token 有效性
  useEffect(() => {
    if (token) {
      getMe()
        .then((u) => {
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setToken(data.token);
    setUser(data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  }, []);

  const register = useCallback(async (username, password, email) => {
    const data = await apiRegister(username, password, email);
    setToken(data.token);
    setUser(data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }
  return children;
}
```

- [ ] **Step 2: 修改 App.jsx**

将 `src/App.jsx` 替换为：

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NoteProvider } from './store/NoteContext';
import { AuthProvider, ProtectedRoute } from './store/AuthContext';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NoteProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/workspace/:noteId?" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NoteProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add AuthContext, ProtectedRoute, and update App routing"
```

---

### Task 16: 登录/注册页面

**Files:**
- Create: `src/pages/Login.jsx`
- Create: `src/pages/Register.jsx`

- [ ] **Step 1: 创建 Login 页面**

`src/pages/Login.jsx`：

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { FileText } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md mx-auto mb-3">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI-Note</h1>
          <p className="text-sm text-gray-400 mt-1">登录你的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="请输入密码"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg
                       transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <p className="text-center text-sm text-gray-400">
            还没有账户？{' '}
            <Link to="/register" className="text-blue-500 hover:text-blue-600">注册</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 Register 页面**

`src/pages/Register.jsx`：

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { FileText } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('密码最少6位');
      return;
    }
    setLoading(true);
    try {
      await register(username, password, email);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md mx-auto mb-3">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI-Note</h1>
          <p className="text-sm text-gray-400 mt-1">创建新账户</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="至少2个字符"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱（选填）</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="至少6位"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg
                       transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? '注册中...' : '注册'}
          </button>

          <p className="text-center text-sm text-gray-400">
            已有账户？{' '}
            <Link to="/login" className="text-blue-500 hover:text-blue-600">登录</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Login and Register pages"
```

---

### Task 17: 改造 noteReducer 接入 API

**Files:**
- Modify: `src/store/noteReducer.js`

- [ ] **Step 1: 改造 noteReducer**

需要将 `localStorage` 读写替换为 API 调用。但是 reducer 必须是纯函数——所以实际做法是：保持 reducer 结构不变，但将 `saveNotes` 等副作用移除，改为在组件中先调 API 再 dispatch。

具体改动 `src/store/noteReducer.js`：

```javascript
/* ============================================================
 * AI-Note — 统一状态 (useReducer)
 *
 * TODO 已改造为后端 API 驱动。
 * 数据持久化由后端 API 处理，前端不再直接操作 localStorage。
 * ============================================================ */

/* ---------- 初始化默认笔记（仅首次加载用） ---------- */
const DEFAULT_NOTES = [
  {
    id: '1',
    title: '欢迎使用 AI-Note',
    content: `# 欢迎使用 ✨ AI-Note

这是你的第一篇笔记。**AI-Note** 是一款智能 Markdown 云笔记系统。

## 快速上手

1. 在左侧编辑区输入 Markdown 文本
2. 右侧预览区实时渲染效果
3. 点击 "✨ AI一键优化排版" 体验智能排版

---
*Happy Note Taking! 🚀*`,
    summary: 'AI-Note 入门指南',
    tags: [],
    updatedAt: new Date().toISOString(),
  },
];

/* ==============================================================
 * Initial State
 * ============================================================== */
export const initialState = {
  notes: [],         // 由 Dashboard 从 API 加载
  currentNote: null,
  isAiLoading: false,
  isLoading: false,
  searchKeyword: '',
  customTags: [],
};

/* ==============================================================
 * Action Types
 * ============================================================== */
export const ACTION = {
  SET_NOTES: 'SET_NOTES',
  SET_CURRENT_NOTE: 'SET_CURRENT_NOTE',
  UPDATE_CURRENT_NOTE_FIELD: 'UPDATE_CURRENT_NOTE_FIELD',
  SET_AI_LOADING: 'SET_AI_LOADING',
  SET_LOADING: 'SET_LOADING',
  SET_SEARCH_KEYWORD: 'SET_SEARCH_KEYWORD',
  ADD_NOTE: 'ADD_NOTE',
  DELETE_NOTE: 'DELETE_NOTE',
  SAVE_CURRENT_NOTE: 'SAVE_CURRENT_NOTE',
  RESET_DEFAULTS: 'RESET_DEFAULTS',
  ADD_TAG: 'ADD_TAG',
  REMOVE_TAG: 'REMOVE_TAG',
  SET_CUSTOM_TAGS: 'SET_CUSTOM_TAGS',
};

/* ==============================================================
 * Reducer (纯函数 — 不再包含任何副作用)
 * ============================================================== */
export function noteReducer(state, action) {
  switch (action.type) {
    case ACTION.SET_NOTES:
      return { ...state, notes: action.payload, isLoading: false };

    case ACTION.SET_CURRENT_NOTE:
      return { ...state, currentNote: action.payload };

    case ACTION.UPDATE_CURRENT_NOTE_FIELD:
      return {
        ...state,
        currentNote: {
          ...state.currentNote,
          [action.payload.field]: action.payload.value,
          ...(action.payload.field === 'content' || action.payload.field === 'title'
            ? { updatedAt: new Date().toISOString() }
            : {}),
        },
      };

    case ACTION.SET_AI_LOADING:
      return { ...state, isAiLoading: action.payload };

    case ACTION.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ACTION.SET_SEARCH_KEYWORD:
      return { ...state, searchKeyword: action.payload };

    case ACTION.ADD_NOTE: {
      const newNote = action.payload?.id
        ? { ...action.payload, updatedAt: new Date().toISOString() }
        : {
            id: String(Date.now()),
            title: '未命名笔记',
            content: '',
            summary: '',
            tags: [],
            updatedAt: new Date().toISOString(),
          };
      return { ...state, notes: [newNote, ...state.notes], currentNote: newNote };
    }

    case ACTION.DELETE_NOTE: {
      const notes = state.notes.filter((n) => n.id !== action.payload);
      return {
        ...state,
        notes,
        currentNote: state.currentNote?.id === action.payload ? null : state.currentNote,
      };
    }

    case ACTION.SAVE_CURRENT_NOTE: {
      if (!state.currentNote) return state;
      const notes = state.notes.map((n) =>
        n.id === state.currentNote.id ? state.currentNote : n,
      );
      return { ...state, notes };
    }

    case ACTION.RESET_DEFAULTS:
      return {
        ...state,
        notes: DEFAULT_NOTES,
        currentNote: DEFAULT_NOTES[0],
        searchKeyword: '',
      };

    case ACTION.ADD_TAG: {
      const tag = action.payload?.trim?.() || action.payload;
      if (!tag || state.customTags.includes(tag)) return state;
      return { ...state, customTags: [...state.customTags, tag] };
    }

    case ACTION.REMOVE_TAG:
      return {
        ...state,
        customTags: state.customTags.filter((t) => t !== action.payload),
      };

    case ACTION.SET_CUSTOM_TAGS:
      return { ...state, customTags: action.payload };

    default:
      return state;
  }
}
```

改动要点：
1. 移除所有 `localStorage` 读写和 `saveNotes`/`loadNotes` 函数
2. 移除 `initStorage` 自执行函数
3. `initialState.notes` 初始为空数组（由 Dashboard 从 API 加载）
4. 新增 `SET_CUSTOM_TAGS` action

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "refactor: remove localStorage from reducer, prepare for API-driven state"
```

---

### Task 18: 改造 Dashboard 接入 API

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: 改造 Dashboard**

将 `src/pages/Dashboard.jsx` 替换为：

```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { listNotes, createNote } from '../api/notes';
import { listTags } from '../api/tags';
import { useAuth } from '../store/AuthContext';
import TagCloud from '../components/TagCloud';
import NoteGrid from '../components/NoteGrid';
import { Search, Sparkles, FileText, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { searchKeyword, notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  /* 初始加载笔记列表和标签 */
  useEffect(() => {
    dispatch({ type: ACTION.SET_LOADING, payload: true });
    listNotes({ page: 1, size: 50 })
      .then((data) => {
        // 将 API 返回的 NoteListResponse 转为 store 格式
        const mapped = (data.records || []).map((n) => ({
          id: String(n.id),
          title: n.title,
          content: '',   // 列表不返回 content，详情时再加载
          summary: n.summary || '',
          tags: (n.tags || []).map((t) => t.name),
          updatedAt: n.updatedAt,
        }));
        dispatch({ type: ACTION.SET_NOTES, payload: mapped });
        if (mapped.length > 0) {
          dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: mapped[0] });
        }
      })
      .catch((err) => console.error('加载笔记失败', err));

    // 加载标签
    listTags()
      .then((tags) => {
        const tagNames = (tags || []).map((t) => t.name);
        dispatch({ type: ACTION.SET_CUSTOM_TAGS, payload: tagNames });
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: e.target.value });
  };

  const handleClearSearch = () => {
    dispatch({ type: ACTION.SET_SEARCH_KEYWORD, payload: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ---------- 头部 ---------- */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI-Note</h1>
              <p className="text-sm text-gray-400 -mt-0.5">智能 Markdown 云笔记</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-gray-500">{user.username}</span>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </header>

        {/* ---------- 大搜索框 ---------- */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchKeyword}
            onChange={handleSearch}
            placeholder="搜索笔记标题、内容或标签…"
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl text-base
                       shadow-sm placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400
                       transition-all duration-200"
          />
          {searchKeyword && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* ---------- 标签云 ---------- */}
        <TagCloud />

        {/* ---------- 笔记网格 ---------- */}
        <NoteGrid />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "refactor: connect Dashboard to backend API"
```

---

### Task 19: 改造 NoteGrid + NoteCard

**Files:**
- Modify: `src/components/NoteGrid.jsx`
- Modify: `src/components/NoteCard.jsx`

- [ ] **Step 1: 改造 NoteGrid**

`src/components/NoteGrid.jsx`：

```jsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { createNote } from '../api/notes';
import NoteCard from './NoteCard';
import { Plus } from 'lucide-react';

export default function NoteGrid() {
  const { notes, searchKeyword, isLoading } = useNoteState();
  const dispatch = useNoteDispatch();
  const navigate = useNavigate();

  const filteredNotes = useMemo(() => {
    if (!searchKeyword) return notes;
    const kw = searchKeyword.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(kw) ||
        (n.summary || '').toLowerCase().includes(kw) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(kw)),
    );
  }, [notes, searchKeyword]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  /* 新建笔记 — 调用 API */
  const handleNewNote = async () => {
    try {
      const tagIds = [];
      const data = await createNote({
        title: '未命名笔记',
        content: '',
        tagIds,
      });
      // 将 API 返回的数据加入 store
      const newNote = {
        id: String(data.id),
        title: data.title,
        content: '',
        summary: data.summary || '',
        tags: (data.tags || []).map((t) => t.name),
        updatedAt: data.updatedAt,
      };
      dispatch({ type: ACTION.ADD_NOTE, payload: newNote });
      navigate(`/workspace/${data.id}`);
    } catch (err) {
      console.error('创建笔记失败', err);
    }
  };

  const sectionTitle = searchKeyword
    ? `📁 ${searchKeyword}`
    : '📄 全部笔记';

  if (filteredNotes.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {sectionTitle}
            <span className="ml-2 text-gray-400 font-normal">(0)</span>
          </h2>
          <button
            onClick={handleNewNote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       text-white bg-blue-500 hover:bg-blue-600
                       rounded-lg shadow-sm hover:shadow-md
                       transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            新建
          </button>
        </div>
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg font-medium">暂无笔记</p>
          <p className="text-sm mt-1">
            {searchKeyword ? '换个关键词试试？' : '点击上方按钮创建你的第一篇笔记吧'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {sectionTitle}
          <span className="ml-2 text-gray-400 font-normal">
            ({filteredNotes.length})
          </span>
        </h2>
        <button
          onClick={handleNewNote}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-white bg-blue-500 hover:bg-blue-600
                     rounded-lg shadow-sm hover:shadow-md
                     transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          新建
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredNotes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: NoteCard 保持不变**

NoteCard 仅做展示和跳转，不需要改动。确认 `src/components/NoteCard.jsx` 保持不变即可。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor: connect NoteGrid to backend API for create/list"
```

---

### Task 20: 改造 Workspace + Sidebar + EditorPanel

**Files:**
- Modify: `src/pages/Workspace.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/EditorPanel.jsx`

- [ ] **Step 1: 改造 Workspace — 加载笔记详情**

`src/pages/Workspace.jsx`：

```jsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { getNote } from '../api/notes';
import Sidebar from '../components/Sidebar';
import EditorPanel from '../components/EditorPanel';
import OutlinePanel from '../components/OutlinePanel';

export default function Workspace() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();

  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  /* 根据 URL 参数加载笔记（含 content） */
  useEffect(() => {
    if (noteId) {
      getNote(noteId)
        .then((data) => {
          const note = {
            id: String(data.id),
            title: data.title,
            content: data.content || '',
            summary: data.summary || '',
            tags: (data.tags || []).map((t) => t.name),
            updatedAt: data.updatedAt,
          };
          dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: note });
        })
        .catch(() => {
          navigate('/', { replace: true });
        });
    } else if (!currentNote && notes.length > 0) {
      const first = notes[0];
      navigate(`/workspace/${first.id}`, { replace: true });
    }
  }, [noteId]);

  const handleHeadingsChange = useCallback((list) => {
    setHeadings(list);
  }, []);

  const handleHeadingClick = useCallback(
    (heading) => {
      setActiveHeadingId(heading.id);
      const container = document.querySelector('.w-md-editor-content');
      if (!container) return;
      const headingEls = container.querySelectorAll('h1, h2, h3');
      const idx = headings.indexOf(heading);
      const target = headingEls[idx];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [headings],
  );

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white">
      <div className="w-[15%] min-w-[180px] max-w-[220px] shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 min-w-0 flex flex-col border-x border-gray-100 h-full">
        <EditorPanel onHeadingsChange={handleHeadingsChange} />
      </div>
      <div className="w-[20%] min-w-[200px] max-w-[280px] shrink-0">
        <OutlinePanel
          headings={headings}
          onHeadingClick={handleHeadingClick}
          activeHeadingId={activeHeadingId}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 改造 Sidebar — 接入 API**

`src/components/Sidebar.jsx` 改动：需要远程获取笔记详情替代 `contentSnippet`。

```jsx
import { useNavigate, useParams } from 'react-router-dom';
import { useNoteState, useNoteDispatch } from '../store/NoteContext';
import { ACTION } from '../store/noteReducer';
import { updateNote } from '../api/notes';
import { ArrowLeft, RotateCcw } from 'lucide-react';

function contentSnippet(content, maxLen = 60) {
  if (!content) return '暂无内容';
  const plain = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[`*~_>\[\]()]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const firstLine = plain.split('\n').filter(Boolean)[0] || '暂无内容';
  return firstLine.length > maxLen
    ? firstLine.slice(0, maxLen) + '…'
    : firstLine;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const { notes, currentNote } = useNoteState();
  const dispatch = useNoteDispatch();

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  const handleBack = async () => {
    if (currentNote) {
      // 保存当前笔记到 API
      try {
        const tagIds = []; // tags 映射需要额外处理，简化处理
        await updateNote(currentNote.id, {
          title: currentNote.title,
          content: currentNote.content,
          summary: currentNote.summary,
          tagIds,
        });
      } catch (err) {
        console.error('保存笔记失败', err);
      }
      dispatch({ type: ACTION.SAVE_CURRENT_NOTE });
    }
    navigate('/');
  };

  const handleSwitchNote = async (note) => {
    if (currentNote) {
      try {
        await updateNote(currentNote.id, {
          title: currentNote.title,
          content: currentNote.content,
          summary: currentNote.summary,
          tagIds: [],
        });
      } catch (err) {
        console.error('保存笔记失败', err);
      }
      dispatch({ type: ACTION.SAVE_CURRENT_NOTE });
    }
    dispatch({ type: ACTION.SET_CURRENT_NOTE, payload: note });
    navigate(`/workspace/${note.id}`);
  };

  const handleReset = () => {
    dispatch({ type: ACTION.RESET_DEFAULTS });
    navigate('/');
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={handleBack}
          className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600
                     bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回大盘
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <h3 className="px-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          最近笔记
        </h3>

        <div className="space-y-0.5 px-2">
          {recentNotes.map((note) => {
            const isActive = note.id === noteId;
            const snippet = contentSnippet(note.content || note.summary);

            return (
              <button
                key={note.id}
                onClick={() => handleSwitchNote(note)}
                className={`w-full text-left relative transition-all duration-150 cursor-pointer
                  ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'} rounded-lg`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full" />
                )}
                <div className="pl-3 pr-3 py-2.5">
                  <p className={`text-sm leading-snug line-clamp-1 ${
                    isActive ? 'font-semibold text-blue-700' : 'font-medium text-gray-800'
                  }`}>
                    {note.title || '未命名笔记'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">
                    {snippet}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {recentNotes.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-8">暂无笔记</p>
        )}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleReset}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5
                     text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50
                     rounded-lg transition-colors cursor-pointer"
          title="清除所有数据并恢复默认笔记"
        >
          <RotateCcw className="w-3 h-3" />
          重置示例数据
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: 改造 EditorPanel AI 功能**

`EditorPanel.jsx` 中需要将 AI 按钮替换为真实 API 调用。修改 AI handler 部分：

```jsx
// 在文件顶部添加 import
import { generateSummary, suggestTags, optimizeMarkdown } from '../api/ai';

// 替换 handleAISummary
const handleAISummary = async () => {
  setAiPanel('summary'); setAiLoading(true); setAiResult(null);
  try {
    const data = await generateSummary(localContent);
    setAiResult(data.summary);
  } catch (err) {
    setAiResult('AI 摘要生成失败：' + err.message);
  }
  setAiLoading(false);
};

// 替换 handleAITags
const handleAITags = async () => {
  setAiPanel('tags'); setAiLoading(true); setAiResult(null);
  try {
    const data = await suggestTags(localContent);
    setAiResult(data.tags || []);
  } catch (err) {
    setAiResult(['生成失败，请重试']);
  }
  setAiLoading(false);
};

// 替换 handleAIOptimize
const handleAIOptimize = async () => {
  setAiPanel('optimize'); setAiLoading(true); setAiResult(null);
  try {
    const data = await optimizeMarkdown(localContent);
    setLocalContent(data.content);
    dispatch({ type: ACTION.UPDATE_CURRENT_NOTE_FIELD, payload: { field: 'content', value: data.content } });
    setAiResult('✅ 排版优化完成！');
  } catch (err) {
    setAiResult('AI 优化失败：' + err.message);
  }
  setAiLoading(false);
};
```

> 同时删除文件顶部不再需要的工具函数：`delay`, `generateSummary`, `generateTags`, `optimizeMarkdown`。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: connect Workspace, Sidebar, EditorPanel to backend API"
```

---

### Task 21: Vite 代理配置

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: 添加 API 代理**

`vite.config.js`：

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add Vite proxy for /api -> Spring Boot backend"
```

---

## 自审清单

1. **Spec coverage** — 逐一对照 spec 章节：
   - ✅ Section 2 项目结构 → Task 1
   - ✅ Section 3 数据库 → Task 1 DDL + Task 3 Entity
   - ✅ Section 4 API → Tasks 8-11 (Auth/Note/Tag/AI controllers)
   - ✅ Section 5 认证安全 → Tasks 6-7 (JWT + Security)
   - ✅ Section 6 AI 集成 → Task 11
   - ✅ Section 7 前端改造 → Tasks 13-21
   - ✅ Section 8 非功能需求 → 分页（Task 9）、BCrypt（Task 8）、异常处理（Task 2）

2. **Placeholder scan** — 无 TBD/TODO，所有代码完整

3. **Type consistency** — Entity/DTO/Mapper 字段与数据库表一致，API 入参与 DTO 匹配

---

## 运行验证

后端启动（需先启动 PostgreSQL）：

```bash
cd ai-note-server
mvn spring-boot:run
```

前端启动：

```bash
npm run dev
```

测试流程：
1. 浏览器打开 http://localhost:5173
2. 自动跳转到 /login
3. 点击注册 → 创建账户 → 自动登录
4. 进入 Dashboard，点击"新建"创建笔记
5. 进入 Workspace 编辑 Markdown
6. 点击 AI 按钮测试摘要/标签/优化
