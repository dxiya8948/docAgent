# Document Q&A System

基于 AI 的智能文档问答系统，支持上传 TXT 和 Markdown 格式文档，通过自然语言提问获得准确答案。

## 技术栈

### 后端
- **框架**: FastAPI 0.110+
- **语言**: Python 3.11
- **数据库**: SQLite（对话记录）+ ChromaDB（向量存储）
- **AI 提供方**: OpenAI API、Anthropic Claude、Ollama（本地模型）
- **运行时**: Uvicorn

### 前端
- **框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **路由**: React Router 7
- **样式**: SCSS
- **图标**: Lucide React
- **Markdown**: react-markdown + remark-gfm

## 功能特性

### 文档管理
- 支持上传 TXT 和 Markdown 格式文档
- 文档列表展示与删除
- Wiki 生成功能（基于 Prompt 检索或 RAG 向量化）

### 智能问答
- 多轮对话支持
- 上下文压缩机制（保留最近 N 条消息）
- 流式响应（SSE）支持
- 模型切换功能

### 模型配置
- 支持 OpenAI、Claude、本地（Ollama）三种 AI 提供方
- 自定义 API Base URL 和 API Key
- 流式响应开关配置
- 向量化模型配置
- 测试连接功能

### 对话记录
- 查看所有对话记录
- 统计信息展示（总对话数、今日对话、平均响应时长、总消息数）

## 快速开始

### 前置要求
- Python 3.11+
- Node.js 20+
- npm 或 yarn

### 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 `http://localhost:8000` 启动。

### 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端页面将在 `http://localhost:5173` 启动。

### 前端构建

```bash
cd frontend
npm run build
```

构建产物将输出到 `dist` 目录。

## Docker 部署

### 前置要求
- Docker Desktop 或 Docker Engine
- Docker Compose

### 启动服务

```bash
# 构建并启动服务（后台运行）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 停止并删除数据卷
docker compose down -v
```

### 服务访问
- **前端**: http://localhost（端口 80）
- **后端 API**: http://localhost:8000（端口 8000）

### 数据持久化
- `backend-data`: SQLite 数据库和配置文件
- `chroma-data`: ChromaDB 向量数据库
- `document-data`: 文档文件存储

## 项目结构

```
doc-agent/
├── backend/                    # 后端代码
│   ├── app/                    # 应用主目录
│   │   ├── api/                # API 路由
│   │   ├── config/             # 配置管理
│   │   ├── database/           # 数据库操作
│   │   ├── documents/          # 文档处理
│   │   ├── memory/             # 向量存储
│   │   ├── providers/          # AI 提供方实现
│   │   ├── qa/                 # 问答逻辑
│   │   └── main.py             # 入口文件
│   ├── data/                   # SQLite 数据库
│   ├── chroma_db/              # ChromaDB 向量库
│   ├── requirements.txt        # Python 依赖
│   └── Dockerfile              # 后端 Dockerfile
├── frontend/                   # 前端代码
│   ├── src/
│   │   ├── api/                # API 客户端
│   │   ├── components/         # 公共组件
│   │   ├── pages/              # 页面组件
│   │   ├── storage/            # 本地存储
│   │   └── types/              # TypeScript 类型定义
│   ├── Dockerfile              # 前端 Dockerfile
│   ├── nginx.conf              # Nginx 配置
│   └── package.json            # Node.js 依赖
├── docker-compose.yml          # Docker Compose 配置
└── README.md                   # 项目说明文档
```

## API 接口

### 文档管理
- `GET /api/documents` - 获取文档列表
- `POST /api/documents/upload` - 上传文档
- `DELETE /api/documents/{doc_id}` - 删除文档

### 问答接口
- `POST /api/qa` - 问答接口（支持流式响应）
- `POST /api/qa/stream` - 流式问答接口

### 模型管理
- `GET /api/models` - 获取模型列表
- `GET /api/models/providers` - 获取可用 AI 提供方
- `POST /api/models/test` - 测试连接

### 对话记录
- `GET /api/conversations` - 获取对话列表
- `GET /api/messages` - 获取消息列表

## 配置说明

### 环境变量（后端）

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 8000 |

### AI 提供方配置

在前端设置页面配置：

1. **OpenAI**:
   - Base URL: 自定义 API 地址（默认 https://api.openai.com/v1）
   - API Key: OpenAI API Key
   - Model: 模型名称

2. **Claude**:
   - API Key: Anthropic API Key
   - Model: 模型名称

3. **本地（Ollama）**:
   - Base URL: Ollama 服务地址（默认 http://localhost:11434）

## License

MIT License
