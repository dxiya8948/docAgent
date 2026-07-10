import json
import os
import time
from typing import List, Dict, AsyncGenerator
from ..documents.store import retrieve_relevant_chunks
from ..documents.manager import list_documents, get_document_by_id
from ..documents.sitemap import find_relevant_documents, find_relevant_documents_with_agent
from ..providers.factory import ProviderFactory
from ..config.settings import get_provider_config, get_all_settings, get_embedding_config
from ..database.operations import (
    save_conversation,
    save_message,
    get_conversation_messages,
    get_all_conversations,
    delete_conversation as db_delete_conversation
)


def get_conversation_history(conversation_id: str, max_messages: int = None) -> List[Dict]:
    messages = get_conversation_messages(conversation_id)
    
    if max_messages is None:
        settings = get_all_settings()
        max_messages = settings.get("max_history_messages", 10)
    
    if max_messages > 0 and len(messages) > max_messages:
        messages = messages[-max_messages:]
    
    return [{
        'role': msg['role'],
        'content': msg['content'],
        'timestamp': msg['timestamp']
    } for msg in messages]


def save_conversation_message(conversation_id: str, role: str, content: str, relevant_docs: List[str] = None):
    save_conversation(conversation_id)
    save_message(conversation_id, role, content, relevant_docs=relevant_docs)


async def build_context(query: str, provider_type: str, document_ids: List[str] = None) -> str:
    documents = list_documents()
    
    if not documents:
        return ""
    
    rag_docs = [doc for doc in documents if doc.get('mode') == 'rag']
    prompt_docs = [doc for doc in documents if doc.get('mode') == 'prompt']
    
    context_parts = []
    found_relevant = False
    
    if rag_docs:
        embedding_config = get_embedding_config()
        embedding_provider_type = embedding_config.get('provider_type', 'openai')
        
        provider_config = get_provider_config(embedding_provider_type)
        provider_config.update(embedding_config)
        provider = ProviderFactory.get_provider(embedding_provider_type, provider_config)
        
        query_embedding = await provider.embed_text(query)
        
        rag_doc_ids = [doc['id'] for doc in rag_docs]
        
        relevant_chunks = await retrieve_relevant_chunks(
            query_embedding,
            document_ids=rag_doc_ids,
            top_k=5
        )
        
        if relevant_chunks:
            found_relevant = True
            for chunk in relevant_chunks:
                context_parts.append(f"[文档: {chunk['metadata'].get('filename', '未知')}]")
                context_parts.append(chunk['content'])
                context_parts.append("---")
    
    if prompt_docs:
        relevant_doc_ids = await find_relevant_documents_with_agent(
            query,
            provider_type,
            get_provider_config(provider_type),
            top_k=3
        )
        
        if not relevant_doc_ids:
            relevant_doc_ids = find_relevant_documents(query, top_k=3)
        
        if relevant_doc_ids:
            found_relevant = True
            for doc_id in relevant_doc_ids:
                doc = get_document_by_id(doc_id)
                if doc and doc.get('mode') == 'prompt':
                    content = doc.get('metadata', {}).get('content', '')
                    context_parts.append(f"[文档: {doc['filename']}]")
                    context_parts.append(content[:1000])
                    context_parts.append("---")
    
    if not found_relevant and documents:
        return "[NO_RELEVANT_DOCS]"
    
    return "\n".join(context_parts)


async def generate_answer(
    query: str,
    provider_type: str,
    conversation_id: str = None,
    document_ids: List[str] = None
) -> str:
    context = await build_context(query, provider_type, document_ids)
    
    if context == "[NO_RELEVANT_DOCS]":
        answer = "文档库中没有相关内容，请尝试上传相关文档或调整查询关键词。"
        
        if conversation_id:
            save_conversation_message(conversation_id, "user", query)
            save_conversation_message(conversation_id, "assistant", answer)
        
        return answer
    
    history = []
    if conversation_id:
        history = get_conversation_history(conversation_id)
    
    provider_config = get_provider_config(provider_type)
    provider = ProviderFactory.get_provider(provider_type, provider_config)
    answer = await provider.generate_answer(query, context, history)
    
    if conversation_id:
        save_conversation_message(conversation_id, "user", query)
        save_conversation_message(conversation_id, "assistant", answer)
    
    return answer


async def stream_answer(
    query: str,
    provider_type: str,
    conversation_id: str = None,
    document_ids: List[str] = None
) -> AsyncGenerator[str, None]:
    context = await build_context(query, provider_type, document_ids)
    
    if context == "[NO_RELEVANT_DOCS]":
        answer = "文档库中没有相关内容，请尝试上传相关文档或调整查询关键词。"
        
        yield answer
        
        if conversation_id:
            save_conversation_message(conversation_id, "user", query)
            save_conversation_message(conversation_id, "assistant", answer)
        
        return
    
    history = []
    if conversation_id:
        history = get_conversation_history(conversation_id)
    
    provider_config = get_provider_config(provider_type)
    provider = ProviderFactory.get_provider(provider_type, provider_config)
    
    full_answer = ""
    async for chunk in provider.stream_answer(query, context, history):
        full_answer += chunk
        yield chunk
    
    if conversation_id:
        save_conversation_message(conversation_id, "user", query)
        save_conversation_message(conversation_id, "assistant", full_answer)


def delete_conversation(conversation_id: str) -> bool:
    return db_delete_conversation(conversation_id)

