import uuid
import json
import os
from typing import List, Dict, Optional
from .parser import parse_document, parse_document_bytes
from .chunker import chunk_text
from .store import store_document_chunks, delete_document_chunks, count_document_chunks
from .sitemap import add_to_sitemap, remove_from_sitemap, find_relevant_documents, get_sitemap_entry
from ..providers.factory import ProviderFactory

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCUMENTS_FILE = os.path.join(BASE_DIR, "documents.json")


def load_documents() -> List[Dict]:
    try:
        with open(DOCUMENTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def save_documents(documents: List[Dict]):
    with open(DOCUMENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(documents, f, indent=2, ensure_ascii=False)


def get_document_by_id(document_id: str) -> Optional[Dict]:
    documents = load_documents()
    return next((doc for doc in documents if doc['id'] == document_id), None)


async def upload_document(file_content: str | bytes, filename: str, mode: str = "prompt", embedding_provider_type: str = "openai") -> Dict:
    document_id = str(uuid.uuid4())
    
    if isinstance(file_content, bytes):
        parsed_text, metadata = parse_document_bytes(file_content, filename)
    else:
        parsed_text, metadata = parse_document(file_content, filename)
    
    metadata['content'] = parsed_text
    
    if mode == "rag":
        chunks = chunk_text(parsed_text)
        
        provider = ProviderFactory.get_provider(embedding_provider_type)
        embeddings = await provider.embed_texts([chunk[0] for chunk in chunks])
        await store_document_chunks(document_id, filename, chunks, embeddings)
        
        chunk_count = len(chunks)
    else:
        add_to_sitemap(document_id, filename, parsed_text)
        chunk_count = 0
    
    document = {
        "id": document_id,
        "filename": filename,
        "original_filename": filename,
        "status": "processed",
        "chunk_count": chunk_count,
        "char_count": len(parsed_text),
        "created_at": int(__import__('time').time()),
        "metadata": metadata,
        "mode": mode
    }
    
    documents = load_documents()
    documents.append(document)
    save_documents(documents)
    
    return document


def get_all_document_content() -> str:
    documents = load_documents()
    all_content = []
    for doc in documents:
        all_content.append(f"=== {doc['filename']} ===")
        all_content.append(doc.get('metadata', {}).get('content', ''))
    return "\n\n".join(all_content)


def delete_document(document_id: str) -> bool:
    documents = load_documents()
    document = get_document_by_id(document_id)
    
    if not document:
        return False
    
    delete_document_chunks(document_id)
    remove_from_sitemap(document_id)
    
    documents = [doc for doc in documents if doc['id'] != document_id]
    save_documents(documents)
    
    return True


def list_documents() -> List[Dict]:
    documents = load_documents()
    for doc in documents:
        doc['chunk_count'] = count_document_chunks(doc['id'])
    return sorted(documents, key=lambda x: x['created_at'], reverse=True)


def update_document_status(document_id: str, status: str):
    documents = load_documents()
    for doc in documents:
        if doc['id'] == document_id:
            doc['status'] = status
            break
    save_documents(documents)
