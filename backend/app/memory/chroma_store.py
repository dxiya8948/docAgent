import os
import chromadb
from dotenv import load_dotenv
from typing import Dict, Optional

load_dotenv()

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")

_client = None
_collection = None


def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return _client


def get_style_collection():
    global _collection
    client = get_chroma_client()
    
    try:
        _collection = client.get_collection("project_styles")
    except ValueError:
        _collection = client.create_collection("project_styles")
    
    return _collection


def store_project_style(project_id: str, style_data: Dict):
    collection = get_style_collection()
    style_text = str(style_data)
    
    collection.add(
        documents=[style_text],
        metadatas=[style_data],
        ids=[project_id]
    )
    collection.persist()


def get_project_style(project_id: str) -> Optional[Dict]:
    collection = get_style_collection()
    
    try:
        result = collection.get(ids=[project_id])
        if result['metadatas'] and len(result['metadatas']) > 0:
            return result['metadatas'][0]
    except Exception:
        pass
    
    return None


def update_project_style(project_id: str, style_data: Dict):
    collection = get_style_collection()
    style_text = str(style_data)
    
    collection.update(
        documents=[style_text],
        metadatas=[style_data],
        ids=[project_id]
    )
    collection.persist()


def delete_project_style(project_id: str):
    collection = get_style_collection()
    collection.delete(ids=[project_id])
    collection.persist()


def list_project_styles() -> list:
    collection = get_style_collection()
    result = collection.get()
    return [
        {"project_id": id, "style": meta}
        for id, meta in zip(result['ids'], result['metadatas'])
    ]
