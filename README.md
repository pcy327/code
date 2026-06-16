# AI-Note

> 智能 Markdown 云笔记 — 基于 AI 的写作助手，支持 WYSIWYG 编辑、DeepSeek 智能处理、阿里云 OSS 图片存储

![Tech Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tech Stack](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?logo=springboot)
![Tech Stack](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Tech Stack](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Tech Stack](https://img.shields.io/badge/DeepSeek-4F46E5?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==)


[![B站演示](封面图片地址)]([https://www.bilibili.com/video/BVxxxx/](https://www.bilibili.com/video/BV1R4jT6REhf/?vd_source=7e728ca6d8b380045f2c0c1b8fa5431e#reply116757427652762)

---

## 📋 目录

- [简介](#简介)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [API 概览](#api-概览)
- [许可证](#许可证)

---

## 简介

AI-Note 是一款全栈智能笔记应用，集成了 **WYSIWYG Markdown 编辑器**、**DeepSeek AI 能力** 和 **阿里云 OSS 图片存储**。它提供类似 Notion / Obsidian 的写作体验，并在此基础上加入了 AI 润色、翻译、扩写和对笔记内容智能问答等 AI 功能。

---

## 核心功能

### ✍️ Markdown 编辑
- **所见即所得编辑器** — 基于 Milkdown / ProseMirror，实时渲染 Markdown
- **斜杠命令菜单** — 输入 `/` 快速插入标题、列表、代码块、引用、分割线等
- **浮动工具栏** — 选中文本后弹出粗体、斜体、行内代码快捷按钮
- **大纲面板** — 自动提取标题结构，支持点击跳转，可拖拽调整宽度
- **编辑器右侧栏** — 在大纲和 AI 对话之间自由切换
- **暗色模式** — 完整的亮色/暗色主题切换，支持系统偏好检测

### 🤖 AI 智能助手
- **AI 对话** — 右侧面板对当前笔记提问，AI 根据笔记内容流式回答
- **一键润色/翻译/简化/扩写** — 选中文本后弹出浮动工具栏，AI 处理后可替换原文
- **AI 续写** — 编辑器内输入 `// 你的问题` + `Ctrl+Enter`，AI 流式生成回答，支持一键插入
- **智能摘要** — 自动生成笔记核心摘要
- **智能标签** — 根据内容推荐标签

### 🗂️ 笔记管理
- **笔记大盘** — 卡片式网格布局，展示所有笔记
- **全文搜索** — PostgreSQL GIN 全文索引，标题 + 内容联合搜索
- **标签系统** — 创建标签、按标签筛选、标签云视图
- **最近笔记** — 侧边栏显示 5 条最近编辑的笔记
- **回收站** — 软删除，30 天保留期，支持**批量选择/恢复/永久删除**
- **分享链接** — 生成公开分享链接，可选密码保护和过期时间

### 🖼️ 图片存储
- **粘贴上传** — 截图/复制图片 → `Ctrl+V` 直接粘贴到编辑器，自动上传 OSS
- **手动上传** — 工具栏「图片」按钮选择文件上传
- **阿里云 OSS** — 图片自动上传阿里云 OSS，返回公开可访问 URL
- **进度提示** — 上传进度百分比显示在工具栏

### ⚡ 性能优化
- **路由级代码分割** — React.lazy + Suspense 按需加载页面
- **Vite manualChunks** — 编辑器、Markdown 渲染、图标等拆分为独立 chunk
- **React.memo** — Milkdown 编辑器组件避免不必要的重渲染

---

## 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| **React 19** | UI 框架 |
| **Vite 6** | 构建工具（HMR、代码分割） |
| **React Router v7** | 客户端路由 |
| **Tailwind CSS v4** | 样式方案（工具类 + 暗色模式） |
| **Milkdown 7** | WYSIWYG Markdown 编辑器（ProseMirror 内核） |
| **react-markdown + remark-gfm** | Markdown 渲染预览 |
| **react-syntax-highlighter** | 代码块语法高亮 |
| **lucide-react** | 图标库 |
| **Axios** | HTTP 客户端 |

### 后端

| 技术 | 用途 |
|------|------|
| **Spring Boot 3.4** | 应用框架 |
| **Spring Security** | 认证授权（JWT Bearer Token） |
| **Spring AI** | AI 集成（OpenAI / DeepSeek 兼容） |
| **MyBatis-Plus 3.5** | ORM + 自动填充 + 逻辑删除 |
| **PostgreSQL 16** | 数据库（全文搜索 GIN 索引） |
| **Alibaba Cloud OSS** | 对象存储（图片） |
| **JWT (jjwt)** | 登录令牌 |
| **Knife4j** | API 文档（Swagger UI） |
| **Lombok** | 代码简化 |

---

## 项目结构

```
ai-note/
├── src/                              # 前端 React 源码
│   ├── api/                          # API 调用层
│   │   ├── ai.js                     # AI 接口（聊天、处理、摘要）
│   │   ├── auth.js                   # 认证接口（登录、注册）
│   │   ├── client.js                 # Axios 实例（拦截器、JWT 注入）
│   │   ├── notes.js                  # 笔记 CRUD + 回收站接口
│   │   ├── shares.js                 # 分享接口
│   │   ├── tags.js                   # 标签接口
│   │   └── upload.js                 # 图片上传接口（XHR + 进度）
│   ├── components/                   # 可复用组件
│   │   ├── AiProcessPopup.jsx        # AI 处理浮动弹窗
│   │   ├── ChatPanel.jsx             # AI 对话面板（SSE 流式）
│   │   ├── EditorPanel.jsx           # 核心编辑器（Milkdown + 工具栏 + AI 气泡）
│   │   ├── NoteCard.jsx              # 笔记卡片
│   │   ├── NoteGrid.jsx              # 笔记网格布局
│   │   ├── OutlinePanel.jsx          # 大纲面板
│   │   ├── ShareModal.jsx            # 分享对话框
│   │   ├── Sidebar.jsx               # 侧边栏导航
│   │   └── TagCloud.jsx              # 标签云
│   ├── pages/                        # 页面级组件（路由懒加载）
│   │   ├── Dashboard.jsx             # 首页大盘
│   │   ├── Login.jsx                 # 登录页
│   │   ├── Register.jsx              # 注册页
│   │   ├── SharedNotePage.jsx        # 公开分享页
│   │   ├── TrashPage.jsx             # 回收站页
│   │   └── Workspace.jsx             # 编辑器工作区（三栏可拖拽布局）
│   ├── store/                        # 状态管理
│   │   ├── AuthContext.jsx           # 认证上下文
│   │   ├── NoteContext.jsx           # 笔记状态上下文
│   │   ├── noteReducer.js            # 笔记 Reducer（11 种 Action）
│   │   └── ThemeContext.jsx          # 主题上下文（暗色模式）
│   ├── App.jsx                       # 根路由配置
│   ├── main.jsx                      # React 入口
│   └── index.css                     # Tailwind + 暗色模式 + Milkdown 样式覆盖
│
├── ai-note-server/                   # 后端 Spring Boot 源码
│   ├── src/main/java/com/ainote/
│   │   ├── AiNoteApplication.java    # 应用入口
│   │   ├── common/                   # 通用工具
│   │   │   ├── GlobalExceptionHandler.java  # 全局异常处理
│   │   │   └── Result.java                 # 统一 API 响应
│   │   ├── config/                   # 配置类
│   │   │   ├── MetaObjectHandlerConfig.java # MyBatis-Plus 自动填充
│   │   │   ├── MybatisPlusConfig.java       # 分页插件
│   │   │   ├── OssConfig.java               # 阿里云 OSS
│   │   │   └── SecurityConfig.java          # Spring Security + CORS
│   │   ├── controller/               # REST 控制器
│   │   │   ├── AiController.java     # /api/ai/*
│   │   │   ├── AuthController.java   # /api/auth/*
│   │   │   ├── FileController.java   # /api/files/*
│   │   │   ├── NoteController.java   # /api/notes/*
│   │   │   ├── ShareController.java  # /api/shares/*
│   │   │   └── TagController.java    # /api/tags/*
│   │   ├── dto/                      # 数据传输对象
│   │   ├── entity/                   # 实体（User, Note, Tag, NoteTag, SharedNote）
│   │   ├── mapper/                   # MyBatis-Plus 映射器
│   │   ├── security/                 # JWT 认证
│   │   │   ├── JwtAuthFilter.java
│   │   │   └── JwtUtils.java
│   │   └── service/                  # 业务逻辑
│   │       ├── impl/                 # 接口实现
│   │       └── *.java                # 服务接口
│   └── src/main/resources/
│       ├── application.yml           # Spring Boot 配置
│       ├── db/schema.sql             # 数据库 DDL
│       └── mapper/                   # MyBatis XML 映射
│
├── vite.config.js                    # Vite 配置（代理 + 代码分割）
├── package.json                      # 前端依赖
├── index.html                        # HTML 入口
└── README.md                         # 本文档
```

---

## 快速开始

### 前置要求

- **Node.js** ≥ 18
- **Java** ≥ 17
- **Maven** ≥ 3.8
- **PostgreSQL** ≥ 14
- **阿里云 OSS**（或配置 `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` / `OSS_BUCKET_NAME`）
- **DeepSeek API Key**（或任意 OpenAI 兼容 API）

### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/ai-note.git
cd ai-note
```

### 2. 数据库初始化

```bash
# 创建数据库（PostgreSQL）
createdb ai_note

# 执行 schema.sql 初始化表结构
psql -d ai_note -f ai-note-server/src/main/resources/db/schema.sql
```

### 3. 后端启动

```bash
cd ai-note-server

# 配置环境变量
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export OSS_ACCESS_KEY_ID=your_oss_key_id
export OSS_ACCESS_KEY_SECRET=your_oss_key_secret
export OSS_BUCKET_NAME=your-bucket
export OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com

# 编译 & 启动
mvn spring-boot:run
```

后端默认运行在 `http://localhost:8080`。

### 4. 前端启动

```bash
cd ..
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。

> Vite 已配置 `/api` 代理到 `http://localhost:8080`，开发环境无需处理跨域。

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_USERNAME` | PostgreSQL 用户名 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 密码 | `postgres` |
| `JWT_SECRET` | JWT 签名密钥 | `ai-note-default-secret-key-change-in-production` |
| `OSS_ACCESS_KEY_ID` | 阿里云 OSS AccessKey ID | — |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 OSS AccessKey Secret | — |
| `OSS_BUCKET_NAME` | OSS Bucket 名称 | `ai-note-images` |
| `OSS_ENDPOINT` | OSS 地域节点 | `oss-cn-hangzhou.aliyuncs.com` |
| `OSS_DOMAIN` | OSS 自定义域名（可选） | — |

> AI API Key 在 `application.yml` 中配置：
> ```yaml
> spring:
>   ai:
>     openai:
>       api-key: sk-your-key-here
>       base-url: https://api.deepseek.com
> ```

---

## API 概览

### 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录（返回 JWT） |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 笔记 `/api/notes`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notes` | 分页查询（支持 keyword/tagId 搜索） |
| GET | `/api/notes/{id}` | 获取笔记详情（含内容） |
| POST | `/api/notes` | 创建笔记 |
| PUT | `/api/notes/{id}` | 更新笔记 |
| DELETE | `/api/notes/{id}` | 软删除（移入回收站） |
| GET | `/api/notes/trash` | 回收站列表 |
| PUT | `/api/notes/{id}/restore` | 恢复笔记 |
| DELETE | `/api/notes/{id}/hard` | 永久删除 |

### AI `/api/ai`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/summary` | 生成摘要 |
| POST | `/api/ai/tags` | 推荐标签 |
| POST | `/api/ai/optimize` | Markdown 排版优化 |
| GET | `/api/ai/stream` | AI 对话（SSE 流式） |
| GET | `/api/ai/complete` | AI 续写（SSE 流式） |
| POST | `/api/ai/process` | 润色/翻译/简化/扩写 |
| POST | `/api/ai/note-chat` | 基于笔记内容的问答（SSE 流式） |

### 文件 `/api/files`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/files/upload` | 上传图片到 OSS |

### 标签 `/api/tags`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tags` | 获取所有标签 |
| POST | `/api/tags` | 创建标签 |
| PUT | `/api/tags/{id}` | 更新标签 |
| DELETE | `/api/tags/{id}` | 删除标签 |

### 分享 `/api/shares`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/shares` | 创建分享链接 |
| GET | `/api/shares` | 获取我的分享列表 |
| DELETE | `/api/shares/{id}` | 撤销分享 |
| POST | `/api/shares/public/verify` | 验证分享密码 |
| GET | `/api/shares/public/{token}` | 获取公开笔记内容 |

---

## 许可证

MIT
