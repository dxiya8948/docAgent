from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class DocumentResponse(BaseModel):
    id: str
    filename: str
    status: str
    chunk_count: int
    char_count: int
    created_at: int
    mode: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class UploadResponse(BaseModel):
    success: bool
    document: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DeleteResponse(BaseModel):
    success: bool
    message: str


class QARequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    provider_type: Optional[str] = None
    stream: Optional[bool] = None


class QAResponse(BaseModel):
    answer: str
    conversation_id: str


class ConversationHistoryResponse(BaseModel):
    messages: List[Dict[str, Any]]


class ConversationListResponse(BaseModel):
    conversations: List[Dict[str, Any]]


class EmbeddingConfigResponse(BaseModel):
    provider_type: str
    api_key: str
    base_url: str
    model: str
    enabled: bool


class SettingsResponse(BaseModel):
    current_provider: str
    providers: Dict[str, Any]
    chunk_size: int
    chunk_overlap: int
    top_k: int
    stream: bool
    max_history_messages: int
    embedding: EmbeddingConfigResponse


class ProviderConfigRequest(BaseModel):
    provider_type: str
    config: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
