import type {
  Document,
  UploadResponse,
  DeleteResponse,
  QARequest,
  QAResponse,
  Message,
  Conversation,
  Settings,
  ProviderConfig,
  EmbeddingConfig
} from '../types';

const BASE_URL = 'http://localhost:8000/api';

export const uploadDocument = async (file: File, mode: string = 'prompt'): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const response = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData
  });

  return response.json();
};

export const listDocuments = async (): Promise<Document[]> => {
  const response = await fetch(`${BASE_URL}/documents`);
  return response.json();
};

export const getDocumentStatus = async (documentId: string): Promise<Document> => {
  const response = await fetch(`${BASE_URL}/documents/${documentId}/status`);
  return response.json();
};

export const deleteDocument = async (documentId: string): Promise<DeleteResponse> => {
  const response = await fetch(`${BASE_URL}/documents/${documentId}`, {
    method: 'DELETE'
  });
  return response.json();
};

export const streamQA = async (
  request: QARequest & { stream?: boolean },
  onChunk: (chunk: string) => void
): Promise<string> => {
  const response = await fetch(`${BASE_URL}/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error('Streaming request failed');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No readable stream');
  }

  const decoder = new TextDecoder();
  let fullAnswer = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const chunk = line.slice(6);
        if (chunk === '[END]') {
          return fullAnswer;
        }
        fullAnswer += chunk;
        onChunk(chunk);
      }
    }
  }

  return fullAnswer;
};

export const queryQA = async (request: QARequest & { stream?: boolean }): Promise<QAResponse> => {
  const response = await fetch(`${BASE_URL}/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  return response.json();
};

export const listConversations = async (): Promise<Conversation[]> => {
  const response = await fetch(`${BASE_URL}/conversations`);
  const result = await response.json();
  return result.conversations || [];
};

export const getConversationHistory = async (conversationId: string): Promise<Message[]> => {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}`);
  const result = await response.json();
  return result.messages;
};

export const deleteConversation = async (conversationId: string): Promise<DeleteResponse> => {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
    method: 'DELETE'
  });
  return response.json();
};

export const getSettings = async (): Promise<Settings> => {
  const response = await fetch(`${BASE_URL}/settings`);
  return response.json();
};

export const updateSettings = async (settings: Settings): Promise<{ success: boolean }> => {
  const response = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  return response.json();
};

export const getCurrentProvider = async (): Promise<{ provider: string; config: Record<string, unknown> }> => {
  const response = await fetch(`${BASE_URL}/settings/provider`);
  return response.json();
};

export const setCurrentProvider = async (config: ProviderConfig): Promise<{ success: boolean; provider: string }> => {
  const response = await fetch(`${BASE_URL}/settings/provider`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  return response.json();
};

export const getAvailableProviders = async (): Promise<{ providers: string[] }> => {
  const response = await fetch(`${BASE_URL}/settings/providers`);
  return response.json();
};

export const testProviderConnection = async (providerType: string, config: Record<string, unknown>): Promise<{ success: boolean; message: string; response?: string }> => {
  const response = await fetch(`${BASE_URL}/settings/provider/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ provider_type: providerType, config })
  });
  return response.json();
};

export const checkHealth = async (): Promise<{ status: string }> => {
  const response = await fetch(`${BASE_URL}/health`);
  return response.json();
};

export const getEmbeddingConfig = async (): Promise<EmbeddingConfig> => {
  const response = await fetch(`${BASE_URL}/settings/embedding`);
  return response.json();
};

export const updateEmbeddingConfig = async (config: EmbeddingConfig): Promise<{ success: boolean }> => {
  const response = await fetch(`${BASE_URL}/settings/embedding`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  return response.json();
};

export const generateWiki = async (): Promise<{ success: boolean; message?: string; updated_at?: number }> => {
  const response = await fetch(`${BASE_URL}/documents/wiki/generate`, {
    method: 'POST'
  });
  return response.json();
};

export const getWikiStatus = async (): Promise<{ updated_at?: number; prompt_docs_count?: number; rag_docs_count?: number }> => {
  const response = await fetch(`${BASE_URL}/documents/wiki/status`);
  return response.json();
};

export const getMessages = async (): Promise<{ messages: Message[] }> => {
  const response = await fetch(`${BASE_URL}/messages`);
  return response.json();
};

export const getStats = async (): Promise<{
  conversation_count: number;
  message_count: number;
  user_message_count: number;
  assistant_message_count: number;
  avg_response_time: number;
  positive_feedback: number;
  negative_feedback: number;
  daily_queries: { date: string; count: number }[];
}> => {
  const response = await fetch(`${BASE_URL}/stats`);
  return response.json();
};
