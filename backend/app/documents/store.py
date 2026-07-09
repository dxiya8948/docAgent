import os
import asyncio
import chromadb
from typing import List, Dict, Optional, Tuple
from .chunker import chunk_text, get_chunk_id

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")

_client = None
_collection = None


def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return _client


def get_document_collection():
    global _collection
    client = get_chroma_client()
    
    try:
        _collection = client.get_collection("documents")
    except Exception:
        _collection = client.create_collection("documents")
    
    return _collection


def _store_document_chunks_sync(
    document_id: str,
    filename: str,
    chunks: List[Tuple[str, int, int]],
    embeddings: Optional[List[List[float]]] = None
):
    if embeddings is None:
        return
    
    collection = get_document_collection()
    
    documents = [chunk[0] for chunk in chunks]
    metadatas = [
        {
            "document_id": document_id,
            "filename": filename,
            "start": chunk[1],
            "end": chunk[2],
            "chunk_index": i
        }
        for i, chunk in enumerate(chunks)
    ]
    ids = [get_chunk_id(document_id, i) for i in range(len(chunks))]
    
    collection.add(
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
        ids=ids
    )

async def store_document_chunks(
    document_id: str,
    filename: str,
    chunks: List[Tuple[str, int, int]],
    embeddings: List[List[float]]
):
    await asyncio.to_thread(
        _store_document_chunks_sync,
        document_id,
        filename,
        chunks,
        embeddings
    )


def _retrieve_relevant_chunks_sync(
    query_embedding: List[float],
    document_ids: List[str] = None,
    top_k: int = 5
) -> List[Dict]:
    collection = get_document_collection()
    
    where_clause = None
    if document_ids:
        where_clause = {"document_id": {"$in": document_ids}}
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where_clause
    )
    
    chunks = []
    for i in range(len(results['ids'][0])):
        chunks.append({
            "id": results['ids'][0][i],
            "content": results['documents'][0][i],
            "metadata": results['metadatas'][0][i],
            "distance": results['distances'][0][i]
        })
    
    return chunks

async def retrieve_relevant_chunks(
    query_embedding: List[float],
    document_ids: List[str] = None,
    top_k: int = 5
) -> List[Dict]:
    return await asyncio.to_thread(
        _retrieve_relevant_chunks_sync,
        query_embedding,
        document_ids,
        top_k
    )


def delete_document_chunks(document_id: str):
    collection = get_document_collection()
    
    try:
        all_results = collection.get()
        ids_to_delete = [
            doc_id for doc_id in all_results['ids']
            if doc_id.startswith(f"{document_id}_chunk_")
        ]
        
        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
    except Exception:
        pass


def count_document_chunks(document_id: str) -> int:
    try:
        collection = get_document_collection()
        all_results = collection.get()
        count = sum(
            1 for doc_id in all_results['ids']
            if doc_id.startswith(f"{document_id}_chunk_")
        )
        return count
    except Exception:
        return 0
