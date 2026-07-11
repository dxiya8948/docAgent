# 后端 API 文档

## 基础信息

- **基础 URL**: `http://localhost:8000/api`
- **内容类型**: `application/json; charset=utf-8`
- **框架**: FastAPI

---

## 目录

1. [文档管理](#1-文档管理)
2. [智能问答](#2-智能问答)
3. [对话管理](#3-对话管理)
4. [模型配置](#4-模型配置)
5. [向量化配置](#5-向量化配置)
6. [统计与监控](#6-统计与监控)

---

## 1. 文档管理

### 1.1 上传文档

**POST** `/api/documents/upload`

上传文档到系统，支持 TXT、Markdown、Word、PDF 格式。

**请求参数**（Form Data）:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| file | File | 是 | - | 文档文件 |
| mode | string | 否 | prompt | 模式：prompt 或 rag |

**响应**:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "filename": "example.txt",
    "mode": "prompt",
    "size": 1024,
    "uploaded_at": 1625097600,
    "metadata": {
      "type": "txt",
      "char_count": 1000,
      "content": "文档内容..."
    }
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "仅支持 TXT、Markdown、Word 和 PDF 格式"
}
```

### 1.2 获取文档列表

**GET** `/api/documents`

获取所有已上传的文档列表。

**响应**:
```json
[
  {
    "id": "uuid",
    "filename": "example.txt",
    "mode": "prompt",
    "size": 1024,
    "uploaded_at": 1625097600,
    "metadata": {...}
  }
]
```

### 1.3 获取文档状态

**GET** `/api/documents/{document_id}/status`

获取指定文档的详细信息。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| document_id | string | 文档 ID |

**响应**:
```json
{
  "id": "uuid",
  "filename": "example.txt",
  "mode": "prompt",
  "size": 1024,
  "uploaded_at": 1625097600,
  "metadata": {...}
}
```

### 1.4 删除文档

**DELETE** `/api/documents/{document_id}`

删除指定文档。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| document_id | string | 文档 ID |

**响应**:
```json
{
  "success": true,
  "message": "文档删除成功"
}
```

### 1.5 生成 Wiki

**POST** `/api/documents/wiki/generate`

根据已上传的文档生成 Wiki 索引（sitemap）。

**响应**:
```json
{
  "success": true,
  "message": "Wiki生成完成",
  "updated_at": 1625097600,
  "prompt_docs_count": 5,
  "rag_docs_count": 2
}
```

### 1.6 获取 Wiki 状态

**GET** `/api/documents/wiki/status`

获取 Wiki 索引的更新状态。

**响应**:
```json
{
  "updated_at": 1625097600,
  "prompt_docs_count": 5,
  "rag_docs_count": 2
}
```

---

## 2. 智能问答

### 2.1 问答接口

**POST** `/api/qa`

提交问题获取 AI 回答，支持流式响应。

**请求体**:
```json
{
  "query": "考勤制度是什么？",
  "provider_type": "openai",
  "conversation_id": "test-123",
  "stream": true,
  "document_ids": ["doc1", "doc2"]
}
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| query | string | 是 | - | 用户问题 |
| provider_type | string | 否 | 当前配置的 provider | AI 提供方 |
| conversation_id | string | 否 | 自动生成 | 对话 ID |
| stream | boolean | 否 | true | 是否启用流式响应 |
| document_ids | array | 否 | - | 指定文档 ID 列表 |

**流式响应**（SSE）:
```
data: {"content": "考勤"}
data: {"content": "制度"}
data: [END]
```

**非流式响应**:
```json
{
  "answer": "考勤制度是...",
  "conversation_id": "test-123"
}
```

---

## 3. 对话管理

### 3.1 获取对话列表

**GET** `/api/conversations`

获取所有对话列表。

**响应**:
```json
{
  "conversations": [
    {
      "id": "test-123",
      "created_at": 1625097600,
      "last_message": "考勤制度是什么？",
      "provider_type": "openai"
    }
  ]
}
```

### 3.2 获取对话详情

**GET** `/api/conversations/{conversation_id}`

获取指定对话的完整消息历史。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| conversation_id | string | 对话 ID |

**响应**:
```json
{
  "messages": [
    {
      "id": 1,
      "conversation_id": "test-123",
      "role": "user",
      "content": "考勤制度是什么？",
      "created_at": 1625097600
    },
    {
      "id": 2,
      "conversation_id": "test-123",
      "role": "assistant",
      "content": "考勤制度是...",
      "created_at": 1625097600,
      "response_time": 5.2,
      "provider_type": "openai"
    }
  ]
}
```

### 3.3 删除对话

**DELETE** `/api/conversations/{conversation_id}`

删除指定对话及其所有消息。

**响应**:
```json
{
  "success": true,
  "message": "对话删除成功"
}
```

---

## 4. 模型配置

### 4.1 获取所有配置

**GET** `/api/settings`

获取系统所有配置。

**响应**:
```json
{
  "current_provider": "openai",
  "stream": true,
  "max_history_messages": 10,
  "providers": {
    "openai": {
      "api_key": "sk-xxx",
      "base_url": "https://api.openai.com/v1",
      "model": "gpt-4o"
    },
    "claude": {...},
    "local": {...}
  },
  "embedding": {...}
}
```

### 4.2 更新配置

**PUT** `/api/settings`

更新系统配置。

**请求体**:
```json
{
  "current_provider": "openai",
  "stream": true,
  "max_history_messages": 10,
  "providers": {...}
}
```

**响应**:
```json
{
  "success": true
}
```

### 4.3 获取当前 Provider

**GET** `/api/settings/provider`

获取当前选中的 AI 提供方及其配置。

**响应**:
```json
{
  "provider": "openai",
  "config": {
    "api_key": "sk-xxx",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4o"
  }
}
```

### 4.4 设置当前 Provider

**POST** `/api/settings/provider`

切换当前 AI 提供方。

**请求体**:
```json
{
  "provider_type": "openai",
  "config": {
    "api_key": "sk-xxx",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4o"
  }
}
```

**响应**:
```json
{
  "success": true,
  "provider": "openai"
}
```

### 4.5 获取可用 Providers

**GET** `/api/settings/providers`

获取系统支持的所有 AI 提供方列表。

**响应**:
```json
{
  "providers": ["openai", "claude", "ollama"]
}
```

### 4.6 获取 Ollama 模型列表

**GET** `/api/settings/ollama/models`

获取本地 Ollama 服务中已安装的模型列表。

**响应**:
```json
{
  "models": [
    {
      "name": "qwen2:7b",
      "size": "4.5 GB",
      "modified_at": 1625097600
    }
  ]
}
```

### 4.7 测试 Provider 连接

**POST** `/api/settings/provider/test`

测试 AI 提供方配置是否正确。

**请求体**:
```json
{
  "provider_type": "openai",
  "config": {
    "api_key": "sk-xxx",
    "base_url": "https://api.openai.com/v1"
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "连接成功",
  "response": "你好！我是..."
}
```

---

## 5. 向量化配置

### 5.1 获取向量化配置

**GET** `/api/settings/embedding`

获取向量化模型配置。

**响应**:
```json
{
  "provider_type": "openai",
  "api_key": "sk-xxx",
  "base_url": "https://api.openai.com/v1",
  "model": "text-embedding-3-small"
}
```

### 5.2 更新向量化配置

**PUT** `/api/settings/embedding`

更新向量化模型配置。

**请求体**:
```json
{
  "provider_type": "openai",
  "api_key": "sk-xxx",
  "base_url": "https://api.openai.com/v1",
  "model": "text-embedding-3-small"
}
```

**响应**:
```json
{
  "success": true
}
```

---

## 6. 统计与监控

### 6.1 健康检查

**GET** `/api/health`

检查服务健康状态。

**响应**:
```json
{
  "status": "healthy"
}
```

### 6.2 获取对话统计

**GET** `/api/stats`

获取对话统计信息。

**响应**:
```json
{
  "total_conversations": 100,
  "total_messages": 500,
  "today_conversations": 10,
  "today_messages": 45,
  "avg_response_time": 3.5
}
```

### 6.3 获取所有消息

**GET** `/api/messages`

获取所有消息记录（用于报表分析）。

**响应**:
```json
{
  "messages": [
    {
      "id": 1,
      "conversation_id": "test-123",
      "role": "user",
      "content": "考勤制度是什么？",
      "created_at": 1625097600,
      "provider_type": "openai",
      "response_time": 5.2,
      "feedback": 0
    }
  ]
}
```

### 6.4 更新消息反馈

**PUT** `/api/messages/{message_id}/feedback`

更新消息的用户反馈。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| message_id | int | 消息 ID |

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| feedback | int | 0 | 反馈值：-1（差）、0（无）、1（好） |

**响应**:
```json
{
  "success": true
}
```

---

## 本地模型接口（已废弃）

以下接口已废弃，推荐使用 Ollama：

- `GET /api/models/local/list` - 获取本地模型列表
- `GET /api/models/local/status/{model_id}` - 获取模型状态
- `POST /api/models/local/download/{model_id}` - 下载模型
- `POST /api/models/local/load/{model_id}` - 加载模型
- `POST /api/models/local/unload` - 卸载模型
- `GET /api/models/local/current` - 获取当前模型

**响应示例**:
```json
{
  "status": "error",
  "message": "本地模型下载功能已禁用，请使用 Ollama 运行本地模型。安装地址: https://ollama.com/download"
}
```
