# AI-Note Spring Boot 后端设计规格

> **日期：** 2026-06-10  
> **状态：** 已确认  
> **关联：** 前端项目 `ai-note-web/`，后端项目 `ai-note-server/`

---

## 1. 概述

为 AI-Note 智能 Markdown 云笔记系统创建 Spring Boot 后端，将现有纯前端项目升级为全栈应用。

### 1.1 核心目标

- 笔记数据的持久化存储与 CRUD API
- 多用户系统（注册/登录/JWT 认证）
- 真实 LLM 集成替换前端本地模拟
- 标签系统规范化管理

### 1.2 技术栈总览

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Spring Boot 3.x | 主框架 |
| ORM | MyBatis-Plus 3.5+ | 数据库访问 |
| 数据库 | PostgreSQL 15+ | JSONB、GIN 全文索引 |
| 认证 | Spring Security + JWT | HMAC-SHA256，7天有效期 |
| AI | Spring AI | OpenAI 兼容接口 |
| 文档 | Knife4j / Swagger | 自动生成 API 文档 |
| 构建 | Maven | 单模块 |

---

## 2. 项目结构

```
ai-note/
├── ai-note-server/           ← Spring Boot 后端（新建）
│   ├── pom.xml
│   └── src/main/java/com/ainote/
│       ├── controller/       ← REST 接口层
│       ├── service/          ← 业务逻辑层
│       │   └── impl/
│       ├── mapper/           ← MyBatis-Plus Mapper
│       ├── entity/           ← 数据库实体
│       ├── dto/              ← 请求/响应 DTO
│       ├── config/           ← Security / AI / CORS 配置
│       ├── security/         ← JWT Filter / UserDetails
│       ├── ai/               ← Spring AI Prompt 模板
│       ├── common/           ← 统一响应 / 异常处理 / 工具类
│       └── AiNoteApplication.java
│
├── ai-note-web/              ← React 前端（改造现有）
│   ├── src/
│   │   ├── api/              ← 新增：axios + API 函数
│   │   │   ├── client.js     ← axios 实例 + 拦截器
│   │   │   ├── auth.js       ← login/register/me
│   │   │   ├── notes.js      ← 笔记 CRUD
│   │   │   ├── tags.js       ← 标签 CRUD
│   │   │   └── ai.js         ← AI 调用
│   │   ├── store/
│   │   │   └── AuthContext.jsx ← 新增：登录状态上下文
│   │   └── ...（现有文件保持）
│   └── vite.config.js        ← 添加 /api 代理
│
└── docs/superpowers/specs/
```

### 2.1 分层职责

```
Controller → Service → Mapper → PostgreSQL
     ↕
   DTO ←→ Entity 转换在 Service 层完成
```

- **Controller**：仅处理 HTTP 请求/响应，参数校验，调用 Service
- **Service**：业务逻辑，DTO/Entity 转换，事务管理
- **Mapper**：MyBatis-Plus BaseMapper，纯 SQL 映射
- **Entity**：与数据库表一一对应
- **DTO**：前端交互对象，与 Entity 分离

---

## 3. 数据库设计

### 3.1 表结构

#### user（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| password_hash | VARCHAR(255) | NOT NULL | BCrypt 密码哈希 |
| email | VARCHAR(100) | | 邮箱 |
| avatar_url | VARCHAR(255) | | 头像 URL |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

#### note（笔记表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 |
| user_id | BIGINT | FK → user.id, NOT NULL | 所属用户 |
| title | VARCHAR(255) | NOT NULL, DEFAULT '未命名笔记' | 标题 |
| content | TEXT | | Markdown 正文 |
| summary | TEXT | | AI 生成摘要 |
| is_deleted | BOOLEAN | DEFAULT FALSE | 软删除标记 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

#### tag（标签表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 |
| user_id | BIGINT | FK → user.id, NOT NULL | 所属用户 |
| name | VARCHAR(50) | NOT NULL | 标签名称 |
| color | VARCHAR(20) | | 标签颜色（hex 或类名） |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

UNIQUE(user_id, name) — 同用户下标签名唯一

#### note_tag（笔记-标签关联表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| note_id | BIGINT | FK → note.id | 笔记 ID |
| tag_id | BIGINT | FK → tag.id | 标签 ID |

PRIMARY KEY (note_id, tag_id)

### 3.2 索引策略

| 索引 | 类型 | 用途 |
|------|------|------|
| note.user_id | B-tree | 按用户查询笔记 |
| note.updated_at DESC | B-tree | 最近笔记排序 |
| note (title, content) | GIN 全文索引 | 搜索框全文检索 |
| note_tag (note_id) | B-tree | 查笔记关联标签 |
| note_tag (tag_id) | B-tree | 按标签反查笔记 |
| tag (user_id) | B-tree | 查询用户标签 |
| note (is_deleted) | B-tree (部分索引) | 排除已删除笔记 |

### 3.3 实体关系

```
user 1 ──── N note       （一个用户有多篇笔记）
user 1 ──── N tag        （一个用户有多个标签）
note N ──── M tag        （笔记与标签多对多，通过 note_tag）
```

---

## 4. API 设计

### 4.1 统一响应格式

```json
// 成功
{ "code": 200, "message": "success", "data": { ... } }

// 分页
{ "code": 200, "message": "success", "data": {
    "records": [...], "total": 42, "page": 1, "pageSize": 20
}}

// 失败
{ "code": 401, "message": "用户名或密码错误", "data": null }
```

### 4.2 认证接口 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 注册新用户 | — |
| POST | /api/auth/login | 登录，返回 JWT | — |
| GET | /api/auth/me | 当前用户信息 | 🔒 |

**POST /api/auth/register**
- Request: `{ "username": "...", "password": "...", "email": "..." }`
- Response: `{ "id": 1, "username": "...", "token": "eyJ..." }`

**POST /api/auth/login**
- Request: `{ "username": "...", "password": "..." }`
- Response: `{ "id": 1, "username": "...", "token": "eyJ..." }`

### 4.3 笔记接口 `/api/notes`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/notes | 列表（分页+搜索+筛选） | 🔒 |
| POST | /api/notes | 创建笔记 | 🔒 |
| GET | /api/notes/{id} | 笔记详情 | 🔒 |
| PUT | /api/notes/{id} | 更新笔记 | 🔒 |
| DELETE | /api/notes/{id} | 软删除 | 🔒 |

**GET /api/notes 查询参数：**
- `keyword` — 搜索关键词（标题+内容全文检索）
- `tagId` — 按标签筛选
- `page` — 页码（默认 1）
- `size` — 每页条数（默认 20）
- `sort` — 排序字段，默认 updatedAt,desc

**POST /api/notes**
```json
{ "title": "...", "content": "...", "tagIds": [1, 2] }
```

**PUT /api/notes/{id}**
```json
{ "title": "...", "content": "...", "summary": "...", "tagIds": [1, 3] }
```

### 4.4 标签接口 `/api/tags`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/tags | 用户标签列表 | 🔒 |
| POST | /api/tags | 创建标签 | 🔒 |
| PUT | /api/tags/{id} | 更新标签 | 🔒 |
| DELETE | /api/tags/{id} | 删除标签 | 🔒 |

**注意：** 删除标签时级联删除 note_tag 关联记录。

### 4.5 AI 接口 `/api/ai`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/ai/summary | 生成摘要 | 🔒 |
| POST | /api/ai/tags | 推荐标签 | 🔒 |
| POST | /api/ai/optimize | 排版优化 | 🔒 |

**通用入参：** `{ "content": "Markdown 原文" }`

**POST /api/ai/summary** 响应：`{ "summary": "文档摘要文本..." }`

**POST /api/ai/tags** 响应：`{ "tags": ["标签1", "标签2", "标签3"] }`

**POST /api/ai/optimize** 响应：`{ "content": "优化后的 Markdown..." }`

### 4.6 错误码

| Code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数校验失败 |
| 401 | 未登录 / Token 过期 |
| 403 | 无权访问该资源 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | AI 服务超时或不可用 |

---

## 5. 认证与安全

### 5.1 认证流程

```
用户登录 → POST /api/auth/login
  → 验证 BCrypt 密码
  → 签发 JWT（sub=userId, exp=7天后）
  → 前端存 token 到 localStorage
  → 后续请求带 Authorization: Bearer <token>
  → JwtAuthFilter 解析 → 验证 → 注入 SecurityContext
```

### 5.2 Security 配置

```yaml
# JWT 参数
jwt.secret: ${JWT_SECRET}          # HMAC-SHA256 密钥
jwt.expiration: 604800000          # 7 天（毫秒）

# 路径规则
/api/auth/** → permitAll            # 登录/注册公开
/api/**      → authenticated        # 其余需认证
```

### 5.3 密码策略

- BCrypt 编码，strength=10
- 最少 6 位
- 注册时后端校验

### 5.4 CORS 配置

- 开发环境允许 `http://localhost:5173`
- 生产环境通过 Nginx 或配置项指定
- 允许头：Authorization, Content-Type
- 允许方法：GET, POST, PUT, DELETE, OPTIONS

### 5.5 用户数据隔离

所有数据查询在 Service 层从 SecurityContext 获取当前 `userId`，确保用户只能操作自己的数据。Controller 层不直接传 userId（从 Token 中提取，不可由客户端指定）。

---

## 6. AI 集成

### 6.1 Spring AI 配置

```yaml
spring.ai.openai:
  api-key: ${OPENAI_API_KEY}
  base-url: https://api.openai.com    # 可替换为其他兼容 API
  chat.options:
    model: gpt-4o-mini
    temperature: 0.3
    max-tokens: 2000
```

### 6.2 Prompt 模板

#### 摘要生成
```
System: 你是一个专业的文档摘要助手。请用简洁的语言总结以下 Markdown 文档的核心要点，控制在 150 字以内。
User: {content}
```

#### 标签推荐
```
System: 你是一个内容分类专家。根据以下 Markdown 文档内容，推荐 3-5 个标签。只返回 JSON 数组格式：["标签1","标签2","标签3"]，不要包含其他内容。
User: {content}
```

#### 排版优化
```
System: 你是一个 Markdown 排版专家。请优化以下 Markdown 文档的排版格式：统一标题前后空行、代码块前后空行、删除多余空行（不超过2个连续空行）、修正列表缩进。只返回优化后的 Markdown 内容，不要添加任何解释。
User: {content}
```

### 6.3 容错策略

| 场景 | 策略 |
|------|------|
| AI 超时（30s） | 返回 503，前端提示重试 |
| AI 不可用 | 标签推荐降级为本地关键词匹配 |
| 并发限制 | 预留：每用户每分钟 10 次 AI 调用 |
| 内容过短 | 摘要/标签接口：content < 50 字符时返回空 |

---

## 7. 前端改造

### 7.1 新增文件

```
src/api/client.js       ← axios 实例，请求/响应拦截器
src/api/auth.js         ← login(), register(), getMe()
src/api/notes.js        ← listNotes(), getNote(), createNote(), updateNote(), deleteNote()
src/api/tags.js         ← listTags(), createTag(), updateTag(), deleteTag()
src/api/ai.js           ← generateSummary(), suggestTags(), optimizeMarkdown()
src/store/AuthContext.jsx ← AuthProvider + useAuth hook
src/pages/Login.jsx     ← 登录页面
src/pages/Register.jsx  ← 注册页面
```

### 7.2 axios 客户端

```javascript
// 请求拦截：自动带 Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：统一解包 + 401 处理
client.interceptors.response.use(
  (res) => res.data.data,         // 解包 { code, message, data } → data
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

### 7.3 Store 改造原则

- **noteReducer** 纯函数结构保持不变
- **Action 内部**：原本 `localStorage.setItem/getItem` 替换为 API 调用
- **AI 功能**：`EditorPanel` 中的 `handleAISummary/handleAITags/handleAIOptimize` 替换为 `api/ai.js` 调用
- **AuthContext**：管理 `{ user, token, isAuthenticated }`，提供 `login/logout/register` 方法

### 7.4 路由改造

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/workspace/:noteId?" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
</Routes>
```

`ProtectedRoute` 检查 token 是否存在，否则重定向到 `/login`。

### 7.5 Vite 代理

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
};
```

---

## 8. 非功能需求

### 8.1 性能

- 笔记列表分页查询，默认 20 条/页
- 笔记内容字段较大时，列表接口不返回 content 全文（仅返回 title + summary + tags）
- GIN 全文索引支持搜索

### 8.2 安全

- 所有密码 BCrypt 哈希存储
- JWT 无状态，不依赖服务端 Session
- SQL 注入防护：MyBatis-Plus 参数化查询
- 用户数据隔离：所有查询必须带 userId 条件

### 8.3 可维护性

- 统一响应格式，前端只需处理一种结构
- 统一异常处理（`@RestControllerAdvice`）
- Swagger 文档自动生成

---

## 9. 测试策略

| 层级 | 测试类型 | 覆盖目标 |
|------|----------|----------|
| Mapper | 集成测试（@MybatisPlusTest） | SQL 正确性 |
| Service | 单元测试（Mock Mapper） | 业务逻辑 |
| Controller | 集成测试（@WebMvcTest） | API 契约 |
| AI Service | 集成测试（Mock ChatClient） | Prompt 正确性 |

---

## 10. 待定项（后续迭代）

- Token 刷新机制（Refresh Token）
- 笔记协作/分享
- 图片上传
- 笔记历史版本
- 导出（PDF/Word）
- 限流中间件
