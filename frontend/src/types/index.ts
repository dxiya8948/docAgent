export interface Document {
  id: string;
  filename: string;
  status: string;
  chunk_count: number;
  char_count: number;
  created_at: number;
  mode?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadResponse {
  success: boolean;
  document?: Document;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface QARequest {
  query: string;
  conversation_id?: string;
  document_ids?: string[];
  provider_type?: string;
}

export interface QAResponse {
  answer: string;
  conversation_id: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  last_message: string;
  last_role: string;
  message_count: number;
  updated_at: number;
}

export interface Settings {
  current_provider: string;
  providers: Record<string, {
    api_key?: string;
    base_url?: string;
    model?: string;
    model_name?: string;
    enabled: boolean;
  }>;
  embedding: EmbeddingConfig;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  stream: boolean;
}

export interface EmbeddingConfig {
  provider_type: string;
  api_key: string;
  base_url: string;
  model: string;
  enabled: boolean;
}

export interface ProviderConfig {
  provider_type: string;
  config: Record<string, unknown>;
}

export interface LocalModelInfo {
  model_id: string;
  name: string;
  repo_id: string;
  size: string;
  description: string;
  requires_gpu: boolean;
  status: string;
}
