import uuid
import asyncio
import json
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from .schemas import (
    UploadResponse,
    DeleteResponse,
    DocumentResponse,
    QARequest,
    QAResponse,
    ConversationHistoryResponse,
    ConversationListResponse,
    SettingsResponse,
    ProviderConfigRequest,
    HealthResponse
)
from ..documents.manager import upload_document, delete_document, list_documents
from ..documents.sitemap import generate_full_sitemap_with_agent, get_sitemap_updated_at
from ..qa.rag_pipeline import (
    generate_answer,
    stream_answer,
    get_conversation_history,
    get_all_conversations,
    delete_conversation
)
from ..database.operations import get_all_messages, get_conversation_stats, update_message_feedback
from ..config.settings import (
    get_current_provider,
    set_current_provider,
    get_provider_config,
    update_provider_config,
    get_all_settings,
    update_settings,
    get_embedding_config,
    update_embedding_config
)
from ..providers.factory import ProviderFactory
from ..models.manager import ModelManager

router = APIRouter()


@router.get("/models/local/list")
async def list_local_models_endpoint():
    return {
        "models": [],
        "message": "本地模型下载功能已禁用，请使用 Ollama 运行本地模型。安装地址: https://ollama.com/download"
    }


@router.get("/models/local/status/{model_id}")
async def get_local_model_status_endpoint(model_id: str):
    return {
        "model_id": model_id,
        "status": "error",
        "message": "本地模型下载功能已禁用，请使用 Ollama 运行本地模型"
    }


@router.post("/models/local/download/{model_id}")
async def download_local_model_endpoint(model_id: str):
    return {"status": "error", "message": "本地模型下载功能已禁用，请使用 Ollama 运行本地模型"}


@router.post("/models/local/load/{model_id}")
async def load_local_model_endpoint(model_id: str):
    return {"status": "error", "message": "本地模型加载功能已禁用，请使用 Ollama 运行本地模型"}


@router.post("/models/local/unload")
async def unload_local_model_endpoint():
    return {"status": "error", "message": "本地模型功能已禁用"}


@router.get("/models/local/current")
async def get_current_local_model_endpoint():
    return {"model_id": None, "name": None, "message": "本地模型功能已禁用"}


@router.post("/documents/upload", response_model=UploadResponse)
async def upload_document_endpoint(
    file: UploadFile = File(...),
    mode: str = "prompt"
):
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        ext = file.filename.split('.')[-1].lower()
        if ext not in ['txt', 'md', 'markdown']:
            return UploadResponse(success=False, error="仅支持 TXT 和 Markdown 格式")
        
        if mode not in ["prompt", "rag"]:
            return UploadResponse(success=False, error="模式参数无效，仅支持 prompt 或 rag")
        
        if mode == "rag":
            embedding_config = get_embedding_config()
            if not embedding_config.get("api_key"):
                return UploadResponse(success=False, error="RAG向量化模式需要配置有效的向量化模型API Key")
            embedding_provider_type = embedding_config.get('provider_type', 'openai')
            document = await upload_document(content_str, file.filename, mode, embedding_provider_type)
        else:
            document = await upload_document(content_str, file.filename, mode)
        
        return UploadResponse(
            success=True,
            document=document
        )
    except Exception as e:
        return UploadResponse(success=False, error=str(e))


@router.get("/documents")
async def list_documents_endpoint():
    documents = list_documents()
    return documents


@router.post("/documents/wiki/generate")
async def generate_wiki_endpoint():
    documents = list_documents()
    
    if not documents:
        return {"success": True, "message": "暂无文档", "updated_at": None}
    
    prompt_docs = [doc for doc in documents if doc.get('mode') == 'prompt']
    rag_docs = [doc for doc in documents if doc.get('mode') == 'rag']
    
    updated_at = None
    
    if prompt_docs:
        provider_type = get_current_provider()
        provider_config = get_provider_config(provider_type)
        
        sitemap = await generate_full_sitemap_with_agent(
            documents,
            provider_type,
            provider_config
        )
        updated_at = sitemap.get("updated_at")
    
    if rag_docs:
        embedding_config = get_embedding_config()
        if not embedding_config.get("api_key"):
            return {"success": False, "message": "RAG模式需要配置向量化模型API Key"}
        
        embedding_provider_type = embedding_config.get('provider_type', 'openai')
        provider_config = get_provider_config(embedding_provider_type)
        provider_config.update(embedding_config)
        
        provider = ProviderFactory.get_provider(embedding_provider_type, provider_config)
        
        for doc in rag_docs:
            content = doc.get('metadata', {}).get('content', '')
            if content:
                from ..documents.chunker import chunk_text
                from ..documents.store import store_document_chunks
                
                chunks = chunk_text(content)
                embeddings = await provider.embed_texts([chunk[0] for chunk in chunks])
                await store_document_chunks(doc['id'], doc['filename'], chunks, embeddings)
        
        updated_at = int(__import__('time').time())
    
    return {
        "success": True,
        "message": "Wiki生成完成",
        "updated_at": updated_at,
        "prompt_docs_count": len(prompt_docs),
        "rag_docs_count": len(rag_docs)
    }


@router.get("/documents/wiki/status")
async def get_wiki_status_endpoint():
    updated_at = get_sitemap_updated_at()
    documents = list_documents()
    
    prompt_docs = [doc for doc in documents if doc.get('mode') == 'prompt']
    rag_docs = [doc for doc in documents if doc.get('mode') == 'rag']
    
    return {
        "updated_at": updated_at,
        "prompt_docs_count": len(prompt_docs),
        "rag_docs_count": len(rag_docs)
    }


@router.get("/documents/{document_id}/status", response_model=DocumentResponse)
async def get_document_status(document_id: str):
    documents = list_documents()
    for doc in documents:
        if doc['id'] == document_id:
            return doc
    raise HTTPException(status_code=404, detail="文档不存在")


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
async def delete_document_endpoint(document_id: str):
    success = delete_document(document_id)
    if success:
        return DeleteResponse(success=True, message="文档删除成功")
    else:
        raise HTTPException(status_code=404, detail="文档不存在")


@router.post("/qa")
async def qa_endpoint(request: QARequest):
    provider_type = request.provider_type or get_current_provider()
    conversation_id = request.conversation_id or str(uuid.uuid4())
    
    use_stream = request.stream
    if use_stream is None:
        settings = get_all_settings()
        use_stream = settings.get("stream", True)
    
    if use_stream:
        async def generate():
            async for chunk in stream_answer(
                query=request.query,
                provider_type=provider_type,
                conversation_id=conversation_id,
                document_ids=request.document_ids
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [END]\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    else:
        answer = await generate_answer(
            query=request.query,
            provider_type=provider_type,
            conversation_id=conversation_id,
            document_ids=request.document_ids
        )
        
        return {"answer": answer, "conversation_id": conversation_id}


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations_endpoint():
    conversations = get_all_conversations()
    return ConversationListResponse(conversations=conversations)


@router.get("/conversations/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_conversation_endpoint(conversation_id: str):
    messages = get_conversation_history(conversation_id)
    return ConversationHistoryResponse(messages=messages)


@router.delete("/conversations/{conversation_id}", response_model=DeleteResponse)
async def delete_conversation_endpoint(conversation_id: str):
    success = delete_conversation(conversation_id)
    if success:
        return DeleteResponse(success=True, message="对话删除成功")
    else:
        raise HTTPException(status_code=404, detail="对话不存在")


@router.get("/settings")
async def get_settings_endpoint():
    settings = get_all_settings()
    result = dict(settings)
    if "stream" not in result:
        result["stream"] = True
    if "max_history_messages" not in result:
        result["max_history_messages"] = 10
    return result


@router.put("/settings")
async def update_settings_endpoint(settings: SettingsResponse):
    update_settings(settings.model_dump())
    return {"success": True}


@router.get("/settings/provider")
async def get_current_provider_endpoint():
    provider = get_current_provider()
    config = get_provider_config(provider)
    return {"provider": provider, "config": config}


@router.post("/settings/provider")
async def set_current_provider_endpoint(request: ProviderConfigRequest):
    set_current_provider(request.provider_type)
    update_provider_config(request.provider_type, request.config)
    ProviderFactory.clear_providers()
    return {"success": True, "provider": request.provider_type}


@router.get("/settings/providers")
async def get_available_providers_endpoint():
    return {"providers": ProviderFactory.get_available_providers()}


@router.get("/settings/ollama/models")
async def get_ollama_models_endpoint():
    try:
        from ..providers.ollama import OllamaProvider
        provider = OllamaProvider(config={"base_url": "http://localhost:11434"})
        models = await provider.list_models()
        return {"models": models}
    except Exception as e:
        return {"models": [], "error": str(e)}


@router.get("/health", response_model=HealthResponse)
async def health_check_endpoint():
    return HealthResponse(status="healthy")


@router.get("/settings/embedding")
async def get_embedding_config_endpoint():
    config = get_embedding_config()
    return config


@router.put("/settings/embedding")
async def update_embedding_config_endpoint(config: dict):
    update_embedding_config(config)
    return {"success": True}


@router.get("/stats")
async def get_conversation_stats_endpoint():
    stats = get_conversation_stats()
    return stats


@router.get("/messages")
async def get_all_messages_endpoint():
    messages = get_all_messages()
    return {"messages": messages}


@router.put("/messages/{message_id}/feedback")
async def update_feedback_endpoint(message_id: int, feedback: int = 0):
    success = update_message_feedback(message_id, feedback)
    if success:
        return {"success": True}
    else:
        raise HTTPException(status_code=404, detail="消息不存在")


@router.post("/settings/provider/test")
async def test_provider_connection_endpoint(request: ProviderConfigRequest):
    try:
        provider_config = get_provider_config(request.provider_type)
        provider_config.update(request.config)
        
        ProviderFactory.clear_providers()
        provider = ProviderFactory.get_provider(request.provider_type, provider_config)
        
        test_response = await asyncio.wait_for(
            provider.generate_answer("你好", ""),
            timeout=15.0
        )
        
        if test_response:
            return {"success": True, "message": "连接成功", "response": test_response[:50]}
        else:
            return {"success": False, "message": "连接成功但未返回有效响应"}
    except asyncio.TimeoutError:
        return {"success": False, "message": "连接超时，请检查网络或API配置"}
    except Exception as e:
        return {"success": False, "message": f"连接失败: {str(e)}"}
