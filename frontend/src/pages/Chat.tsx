import React, { useState, useEffect, useRef } from 'react';
import { streamQA, queryQA, listConversations, getConversationHistory, deleteConversation, getCurrentProvider, getAvailableProviders } from '../api/client';
import { loadSettings } from '../storage/configStore';
import type { Message, Conversation, QARequest } from '../types';
import { Send, Trash2, MessageCircle, Bot, User, Loader2, ChevronDown, X, Sparkles } from 'lucide-react';
import './Chat.scss';

const providerNames: Record<string, string> = {
  openai: 'OpenAI / 兼容API',
  claude: 'Claude',
  local: '本地模型'
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedDocuments] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>('openai');
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o-mini');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [providersConfig, setProvidersConfig] = useState<Record<string, { model?: string; model_name?: string; base_url?: string }>>({});
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadProviderInfo();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const convs = await listConversations();
    setConversations(convs);
  };

  const loadProviderInfo = async () => {
    try {
      const localSettings = await loadSettings();
      if (localSettings) {
        setCurrentProvider(localSettings.current_provider);
        const providerConfig = localSettings.providers[localSettings.current_provider];
        if (providerConfig) {
          setCurrentModel(providerConfig.model || providerConfig.model_name || '');
        }
        setProvidersConfig(localSettings.providers);
        setStreamEnabled(localSettings.stream !== undefined ? localSettings.stream : true);
      }

      const providersData = await getAvailableProviders();
      setAvailableProviders(providersData.providers);
    } catch {
      const providerData = await getCurrentProvider();
      setCurrentProvider(providerData.provider);
      if (providerData.config) {
        setCurrentModel((providerData.config.model || providerData.config.model_name || '') as string);
      }
    }
  };

  const loadConversation = async (convId: string) => {
    const history = await getConversationHistory(convId);
    setMessages(history);
    setConversationId(convId);
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!window.confirm('确定要删除这个对话吗？')) return;
    await deleteConversation(convId);
    await loadConversations();
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
    }
  };

  const handleProviderChange = (providerType: string) => {
    setCurrentProvider(providerType);
    const config = providersConfig[providerType];
    if (config) {
      setCurrentModel(config.model || config.model_name || '');
    }
    setShowProviderModal(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);
    setInput('');

    try {
      const request: QARequest & { stream?: boolean } = {
        query: input,
        conversation_id: conversationId || undefined,
        document_ids: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        provider_type: currentProvider,
        stream: streamEnabled
      };

      if (streamEnabled) {
        let assistantContent = '';
        const assistantMessageRef = { current: null as number | null };

        const updateMessage = (text: string) => {
          if (assistantMessageRef.current === null) {
            setMessages(prev => {
              const newMsg: Message = {
                role: 'assistant',
                content: text,
                timestamp: Date.now()
              };
              assistantMessageRef.current = prev.length;
              return [...prev, newMsg];
            });
          } else {
            const idx = assistantMessageRef.current;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[idx] = {
                ...newMessages[idx],
                content: text
              };
              return newMessages;
            });
          }
        };

        let pendingChars: string[] = [];
        let isProcessing = false;

        const processChars = async () => {
          if (pendingChars.length === 0) {
            isProcessing = false;
            return;
          }
          isProcessing = true;
          const char = pendingChars.shift()!;
          assistantContent += char;
          updateMessage(assistantContent);
          await new Promise(resolve => setTimeout(resolve, 30));
          await processChars();
        };

        const onChunk = (chunk: string) => {
          pendingChars.push(...chunk.split(''));
          if (!isProcessing) {
            processChars();
          }
        };

        await streamQA(request, onChunk);
      } else {
        const response = await queryQA(request);
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.answer,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      if (!conversationId) {
        const convs = await listConversations();
        if (convs.length > 0) {
          setConversationId(convs[0].id);
        }
      }

      await loadConversations();
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `抱歉，发生错误：${(error as Error).message}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatPreview = (text: string) => {
    return text.length > 30 ? text.substring(0, 30) + '...' : text;
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>对话历史</h3>
          <button className="new-chat-btn" onClick={startNewConversation}>
            <MessageCircle className="icon" />
            新对话
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="empty-conversations">
            <MessageCircle className="empty-icon" />
            <p>暂无对话</p>
          </div>
        ) : (
          <div className="conversation-list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${conversationId === conv.id ? 'active' : ''}`}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="conversation-content">
                  <p className="conversation-preview">{formatPreview(conv.last_message)}</p>
                  <span className="conversation-meta">
                    {conv.message_count} 条消息
                  </span>
                </div>
                <button
                  className="delete-conv-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="trash-icon" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <div className="model-selector" onClick={() => setShowProviderModal(true)}>
            <Sparkles className="model-icon" />
            <div className="model-info">
              <span className="model-name">{providerNames[currentProvider] || currentProvider}</span>
              <span className="model-version">{currentModel}</span>
            </div>
            <ChevronDown className="chevron-icon" />
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="welcome-screen">
            <Bot className="welcome-icon" />
            <h2>欢迎使用智能问答</h2>
            <p>上传文档后，您可以通过自然语言提问获取答案</p>
            <div className="current-model-display">
              <Sparkles className="small-icon" />
              <span>当前模型：{providerNames[currentProvider] || currentProvider} - {currentModel}</span>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? (
                    <User className="avatar-icon user" />
                  ) : (
                    <Bot className="avatar-icon bot" />
                  )}
                </div>
                <div className="message-content">
                  <span className="role-label">{msg.role === 'user' ? '您' : 'AI'}</span>
                  <div className="message-text">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="message assistant">
                <div className="message-avatar">
                  <Bot className="avatar-icon bot" />
                </div>
                <div className="message-content">
                  <span className="role-label">AI</span>
                  <div className="typing-indicator">
                    <Loader2 className="typing-dot" />
                    <Loader2 className="typing-dot" />
                    <Loader2 className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="input-area">
          <textarea
            className="message-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题...（Ctrl+Enter 发送）"
            disabled={isGenerating}
          />
          <button
            className={`send-btn ${isGenerating ? 'loading' : ''}`}
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="spinner" />
            ) : (
              <Send className="send-icon" />
            )}
          </button>
        </div>
      </div>

      {showProviderModal && (
        <div className="modal-overlay" onClick={() => setShowProviderModal(false)}>
          <div className="provider-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择模型</h3>
              <button className="modal-close" onClick={() => setShowProviderModal(false)}>
                <X className="close-icon" />
              </button>
            </div>
            <div className="provider-list">
              {availableProviders.map((provider) => (
                <div
                  key={provider}
                  className={`provider-item ${currentProvider === provider ? 'selected' : ''}`}
                  onClick={() => handleProviderChange(provider)}
                >
                  <div className="provider-radio">
                    {currentProvider === provider && <div className="radio-dot" />}
                  </div>
                  <div className="provider-info">
                    <span className="provider-name">{providerNames[provider] || provider}</span>
                    <span className="provider-model">
                      {providersConfig[provider]?.model || providersConfig[provider]?.model_name || '未配置'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setShowProviderModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
