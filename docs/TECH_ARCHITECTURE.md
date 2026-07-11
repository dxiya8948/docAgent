# 技术架构设计文档

## 1. 项目概述

文档问答系统是一个基于 AI 的智能文档问答平台，支持上传多种格式文档（TXT、Markdown、Word、PDF），通过自然语言提问获得准确答案。系统采用前后端分离架构，支持多种 AI 提供方（OpenAI、Claude、Ollama）。

---

## 2. 技术栈

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| React Router | 7.x | 路由管理 |
| SCSS | - | CSS 预处理器 |
| Lucide React | - | 图标库 |
| IndexedDB | - | 前端配置存储 |
| react-markdown | - | Markdown 渲染 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.139+ | 后端框架 |
| Python | 3.11 | 编程语言 |
| SQLite | - | 对话记录存储 |
| ChromaDB | 1.5+ | 向量数据库 |
| OpenAI API | 1.x | OpenAI 模型调用 |
| Anthropic API | 0.x | Claude 模型调用 |
| python-docx | 1.x | Word 文档解析 |
| PyMuPDF | 1.24+ | PDF 文档解析 |

### 2.3 部署技术

| 技术 | 用途 |
|------|------|
| Docker | 容器化部署 |
| Docker Compose | 多容器编排 |
| Nginx | 前端静态服务 + 反向代理 |

---

## 3. 架构设计

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用 (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  文档管理     │  │  智能问答     │  │  模型配置     │          │
│  │  Documents   │  │    Chat      │  │   Settings   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                 │
│  ┌──────┴──────────────────┴──────────────────┴───────┐        │
│  │                  API 客户端 (client.ts)             │        │
│  └───────────────────────────┬─────────────────────────┘        │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTP/HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端服务 (FastAPI)                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  API 路由     │  │  配置管理     │  │  文档管理     │          │
│  │   routes.py   │  │  settings.py  │  │  manager.py  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                 │
│         │                  │                  ▼                 │
│         │                  │     ┌──────────────────┐           │
│         │                  │     │   文档解析器     │           │
│         │                  │     │   parser.py      │           │
│         │                  │     │ (TXT/MD/DOCX/PDF)│           │
│         │                  │     └────────┬─────────┘           │
│         │                  │              │                     │
│         │                  │              ▼                     │
│         │                  │     ┌──────────────────┐           │
│         │                  │     │   Sitemap 生成   │           │
│         │                  │     │   sitemap.py     │           │
│         │                  │     └──────────────────┘           │
│         │                  │                                   │
│         ▼                  ▼                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │                RAG 问答流水线                      │           │
│  │                  rag_pipeline.py                  │           │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │           │
│  │  │ 文档检索  │→│ 上下文构建 │→│ AI 生成  │       │           │
│  │  └──────────┘  └──────────┘  └──────────┘       │           │
│  └──────────────────────────────────────────────────┘           │
│                           │                                    │
│                           ▼                                    │
│  ┌──────────────────────────────────────────────────┐           │
│  │                Provider 工厂                      │           │
│  │                  factory.py                       │           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │           │
│  │  │ OpenAI  │  │ Claude  │  │ Ollama  │          │           │
│  │  └─────────┘  └─────────┘  └─────────┘          │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │   SQLite     │  │  ChromaDB    │  │  IndexedDB   │
     │ (对话记录)   │  │  (向量存储)   │  │  (前端配置)   │
     └──────────────┘  └──────────────┘  └──────────────┘
```

### 3.2 模块划分

#### 3.2.1 前端模块

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| 布局组件 | `src/components/Layout.tsx` | 页面布局、导航栏 |
| 欢迎弹窗 | `src/components/WelcomeModal.tsx` | 首次访问欢迎提示 |
| 文档管理 | `src/pages/Documents.tsx` | 文档上传、列表、删除、Wiki生成 |
| 智能问答 | `src/pages/Chat.tsx` | 对话界面、消息展示、模型切换 |
| 模型配置 | `src/pages/Settings.tsx` | AI提供方配置、模型选择、测试连接 |
| 对话记录 | `src/pages/Report.tsx` | 统计信息、消息列表 |
| API客户端 | `src/api/client.ts` | 后端API调用封装 |
| 配置存储 | `src/storage/configStore.ts` | IndexedDB配置读写 |

#### 3.2.2 后端模块

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| API路由 | `app/api/routes.py` | 所有HTTP接口定义 |
| API模式 | `app/api/schemas.py` | Pydantic数据模型 |
| 配置管理 | `app/config/settings.py` | 配置读写、默认值管理 |
| 数据库操作 | `app/database/operations.py` | SQLite CRUD操作 |
| 文档管理 | `app/documents/manager.py` | 文档上传、删除、列表 |
| 文档解析 | `app/documents/parser.py` | 多格式文档解析 |
| 文档分块 | `app/documents/chunker.py` | 文本分块处理 |
| Sitemap生成 | `app/documents/sitemap.py` | 文档摘要、关键词提取 |
| 向量存储 | `app/memory/chroma_store.py` | ChromaDB操作 |
| Provider基类 | `app/providers/base.py` | AI提供方抽象接口 |
| Provider工厂 | `app/providers/factory.py` | Provider实例创建 |
| OpenAI Provider | `app/providers/openai.py` | OpenAI API调用 |
| Claude Provider | `app/providers/claude.py` | Claude API调用 |
| Ollama Provider | `app/providers/ollama.py` | Ollama API调用 |
| RAG流水线 | `app/qa/rag_pipeline.py` | 问答逻辑、上下文管理 |

---

## 4. 核心流程设计

### 4.1 文档上传流程

```
用户上传文件
    │
    ▼
前端验证文件类型和大小
    │
    ▼
POST /api/documents/upload
    │
    ▼
后端解析文件内容 (parser.py)
    │
    ├── TXT → 直接读取
    ├── MD → 去除Markdown格式
    ├── DOCX → python-docx解析
    └── PDF → PyMuPDF解析
    │
    ▼
根据模式处理 (manager.py)
    │
    ├── prompt模式 → 保存原始内容 + 生成sitemap
    └── rag模式 → 分块 + 向量化 + 存储到ChromaDB
    │
    ▼
返回文档信息
```

### 4.2 问答流程

```
用户提交问题
    │
    ▼
POST /api/qa
    │
    ▼
检查是否启用流式响应
    │
    ├── stream=true → StreamingResponse (SSE)
    └── stream=false → 普通响应
    │
    ▼
RAG流水线处理 (rag_pipeline.py)
    │
    ├── 步骤1: 关键词提取
    ├── 步骤2: 文档检索
    │   ├── prompt模式 → 查询sitemap
    │   └── rag模式 → 查询ChromaDB向量
    ├── 步骤3: 构建上下文
    │   └── 截断控制 (max_history_messages)
    └── 步骤4: 调用AI生成回答
    │
    ▼
Provider工厂获取实例 (factory.py)
    │
    ├── openai → OpenAI API
    ├── claude → Anthropic API
    └── ollama → Ollama HTTP API
    │
    ▼
保存对话记录到SQLite
    │
    ▼
返回回答
```

### 4.3 配置管理流程

```
用户修改配置
    │
    ▼
前端保存到IndexedDB
    │
    ▼
PUT /api/settings
    │
    ▼
后端更新配置文件
    │
    ▼
Provider工厂清除缓存
    │
    ▼
下次请求时重新创建Provider实例
```

---

## 5. 数据存储设计

### 5.1 SQLite 数据库

**表结构：**

#### users 表（预留）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | VARCHAR(100) | 用户名 |
| email | VARCHAR(255) | 邮箱 |
| created_at | INTEGER | 创建时间戳 |

#### conversations 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键，UUID |
| user_id | INTEGER | 用户ID（预留） |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

#### messages 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| conversation_id | VARCHAR(36) | 对话ID |
| role | VARCHAR(20) | 角色：user/assistant |
| content | TEXT | 内容 |
| provider_type | VARCHAR(50) | AI提供方 |
| response_time | REAL | 响应时间(秒) |
| feedback | INTEGER | 反馈：-1/0/1 |
| created_at | INTEGER | 创建时间戳 |

### 5.2 ChromaDB 向量存储

**集合结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文档ID |
| document | string | 文档内容 |
| metadata | dict | 元数据（文档名、分块信息） |
| embedding | array | 向量表示 |

### 5.3 IndexedDB 前端存储

**存储结构：**

```javascript
{
  settings: {
    current_provider: "openai",
    stream: true,
    max_history_messages: 10,
    providers: {
      openai: { api_key, base_url, model },
      claude: { api_key, model },
      local: { base_url, model }
    },
    embedding: { provider_type, api_key, base_url, model }
  },
  hasSeenWelcome: "true"
}
```

---

## 6. API 设计原则

### 6.1 RESTful 规范

- 使用合适的 HTTP 方法：GET（查询）、POST（创建）、PUT（更新）、DELETE（删除）
- 资源命名使用复数形式：`/documents`、`/conversations`
- 响应格式统一：`{ success, data, message }`
- 错误处理：统一的错误响应格式和 HTTP 状态码

### 6.2 流式响应

支持 Server-Sent Events (SSE) 实现实时流式回答：

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"content": "Hello"}
data: {"content": "World"}
data: [END]
```

---

## 7. 安全设计

### 7.1 密钥管理

- API Key 仅存储在客户端（IndexedDB）和配置文件中
- 传输时使用 HTTPS
- 不记录 API Key 到日志中

### 7.2 输入验证

- 前端验证文件类型和大小
- 后端验证所有输入参数
- 防止文件上传漏洞

### 7.3 CORS 配置

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 8. 部署架构

### 8.1 Docker Compose 配置

```
docker-compose.yml
├── frontend (Nginx)
│   ├── 端口: 80
│   └── 代理 /api → backend:8000
└── backend (FastAPI + Uvicorn)
    ├── 端口: 8000
    ├── 数据卷: ./data → /app/data
    └── 依赖: python-docx, PyMuPDF, chromadb...
```

### 8.2 目录结构

```
doc-agent/
├── backend/          # 后端代码
│   ├── app/          # 应用代码
│   ├── Dockerfile    # 后端Docker配置
│   └── requirements.txt
├── frontend/         # 前端代码
│   ├── src/          # 源码
│   ├── Dockerfile    # 前端Docker配置
│   └── nginx.conf    # Nginx配置
├── data/             # 数据持久化
│   ├── database/     # SQLite数据库
│   ├── chroma/       # ChromaDB向量数据
│   └── documents/    # 上传的文档
├── docs/             # 文档
│   ├── API.md        # API文档
│   └── TECH_ARCHITECTURE.md  # 技术架构文档
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## 9. 待完善功能

### 9.1 已实现功能

- ✅ 文档上传（TXT/MD/DOCX/PDF）
- ✅ 文档管理（列表、删除）
- ✅ 智能问答（多轮对话、流式响应）
- ✅ 模型配置（OpenAI/Claude/Ollama）
- ✅ 对话记录（SQLite存储）
- ✅ Docker部署

### 9.2 待完善功能

- ⬜ 向量处理优化（RAG模式）
- ⬜ 账户系统（用户认证、权限管理）
- ⬜ 上下文智能提炼（当前使用强制长度截断控制）
- ⬜ 文档预览功能
- ⬜ 多文档联合问答
- ⬜ 文档版本管理
- ⬜ 搜索功能优化
- ⬜ 性能监控和日志系统

---

## 10. 设计决策说明

### 10.1 为什么使用 SQLite

- 轻量级，无需额外数据库服务
- 文件型数据库，适合 Docker 部署
- 对于对话记录这种读多写少的场景性能足够
- 便于数据备份和迁移

### 10.2 为什么使用 ChromaDB

- 专为向量检索设计
- 支持内存和持久化两种模式
- 轻量级，适合中小型项目
- 内置向量化功能

### 10.3 为什么使用 IndexedDB 存储配置

- 前端独立存储，无需每次请求后端
- 支持复杂数据结构
- 离线可用
- 与 localStorage 相比支持更大的数据量

### 10.4 上下文管理策略

当前使用简单的截断法：保留最近 N 条消息（max_history_messages）。未来可优化为：

- 基于 Token 数量的智能截断
- 语义压缩（使用 AI 压缩历史对话）
- 摘要生成（为长对话生成摘要）

---

## 11. 代码规范

### 11.1 命名规范

- 前端：使用 PascalCase（组件）和 camelCase（变量/函数）
- 后端：使用 snake_case（函数/变量）和 PascalCase（类）
- 文件命名：使用 kebab-case（前端）和 snake_case（后端）

### 11.2 错误处理

- 前端：使用 try-catch 和统一的错误提示
- 后端：使用 FastAPI 的 HTTPException 和统一的响应格式

### 11.3 日志规范

- 后端：使用 Python logging 模块
- 关键操作记录日志（文档上传、问答请求、配置变更）
