import React, { useState, useEffect, useRef } from 'react';
import { streamQA, queryQA, listConversations, getConversationHistory, deleteConversation, setCurrentProvider as updateProvider, getOllamaModels } from '../api/client';
import { loadSettings, saveSettings } from '../storage/configStore';
import type { Message, Conversation, QARequest } from '../types';
import { Trash2, MessageCircle, Bot, User, Loader2, ChevronDown, X, Sparkles, Search, MoreHorizontal, Plus, Paperclip, ArrowUp, FileText, Code2, GraduationCap } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import './Chat.scss';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  desc: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedDocuments] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>('openai');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
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
        setStreamEnabled(localSettings.stream !== undefined ? localSettings.stream : true);
        
        const providers = localSettings.providers || {};
        const options: ModelOption[] = [];
        
        if (providers.openai && providers.openai.model) {
          options.push({
            id: `openai-${providers.openai.model}`,
            name: providers.openai.model,
            provider: 'openai',
            desc: 'OpenAI / 兼容API · 已配置'
          });
        }
        
        if (providers.claude && providers.claude.model) {
          options.push({
            id: `claude-${providers.claude.model}`,
            name: providers.claude.model,
            provider: 'claude',
            desc: 'Claude · 已配置'
          });
        }
        
        try {
          const ollamaResult = await getOllamaModels();
          if (ollamaResult.models && ollamaResult.models.length > 0) {
            ollamaResult.models.forEach((m) => {
              options.push({
                id: `local-${m.name}`,
                name: m.name,
                provider: 'local',
                desc: `本地模型 · ${(m.details as Record<string, unknown>)?.parameter_size || ''}`
              });
            });
          }
        } catch {
        }
        
        setModelOptions(options);
        
        const currentProviderConfig = providers[localSettings.current_provider];
        if (currentProviderConfig && currentProviderConfig.model) {
          setSelectedModel(`${localSettings.current_provider}-${currentProviderConfig.model}`);
        }
      }
    } catch (error) {
      console.error('Failed to load provider info:', error);
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

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const confirmModelSelect = async () => {
    const model = modelOptions.find(m => m.id === selectedModel);
    if (model) {
      setCurrentProvider(model.provider);
      
      try {
        const localSettings = await loadSettings();
        if (localSettings) {
          const providerConfig = localSettings.providers?.[model.provider];
          
          if (providerConfig) {
            await updateProvider({ provider_type: model.provider, config: providerConfig });
            
            const modelName = providerConfig.model || providerConfig.model_name || model.name;
            setCurrentModel(modelName);
            
            const updatedSettings = {
              ...localSettings,
              current_provider: model.provider
            };
            await saveSettings(updatedSettings);
          }
        }
      } catch (error) {
        console.error('Failed to switch provider:', error);
      }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSend();
      }
    }
  };

  const formatPreview = (text: string) => {
    return text.length > 40 ? text.substring(0, 40) + '...' : text;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getConvIcon = (index: number) => {
    const icons = [MessageCircle, FileText, Sparkles, Code2, GraduationCap];
    return icons[index % icons.length];
  };

  const suggestions = [
    '什么是 RAG 检索增强生成？',
    '如何优化文档切片策略？',
    '向量检索的常见方法有哪些？'
  ];

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="chat-page">
      <div className="blob-extra" aria-hidden="true"></div>

      <div className="chat-container">
      <aside className="conv-panel" aria-label="对话记录">
        <div className="conv-header">
          <h2>对话记录</h2>
          <button className="btn-new-conv" onClick={startNewConversation} aria-label="新对话">
            <Plus className="plus-icon" />
            新对话
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="empty-conversations">
            <img src="/assets/empty-conversations.jpg" alt="暂无对话" className="empty-icon" />
            <p>暂无对话</p>
          </div>
        ) : (
          <div className="conv-list" role="list">
            {conversations.map((conv, index) => {
              const Icon = getConvIcon(index);
              return (
                <div
                  key={conv.id}
                  className={`conv-item ${conversationId === conv.id ? 'active' : ''}`}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="conv-icon">
                    <Icon className="conv-icon-inner" />
                  </div>
                  <div className="conv-body">
                    <div className="conv-title">{formatPreview(conv.last_message)}</div>
                    <div className="conv-preview">{conv.last_message || '未命名对话'}</div>
                    <div className="conv-meta">
                      <span>{conv.message_count || 0} 条消息</span>
                      <span>·</span>
                      <span>{formatTime(conv.updated_at || Date.now())}</span>
                    </div>
                  </div>
                  <button
                    className="conv-delete"
                    aria-label="删除对话"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="trash-icon" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <main className="chat-area">
        <div className="chat-subheader">
          <button className="model-selector" onClick={() => setShowProviderModal(true)} aria-haspopup="dialog">
            <Bot className="bot-icon" />
            <span>{currentModel || 'GLM-4-Plus'}</span>
            <ChevronDown className="chevron-icon" />
          </button>
          <div className="chat-subheader-actions">
            <button className="btn-icon" aria-label="搜索对话">
              <Search className="icon" />
            </button>
            <button className="btn-icon" aria-label="更多选项">
              <MoreHorizontal className="icon" />
            </button>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="chat-content">
            <div className="welcome-state">
              <img src="/assets/welcome-illustration.jpg" alt="欢迎使用智能问答" className="welcome-illustration" />
              <h1 className="welcome-title">欢迎使用智能问答</h1>
              <p className="welcome-subtitle">
                基于检索增强生成技术（RAG），为您提供精准的文档智能问答服务。上传您的文档，开始高效的AI对话体验。
              </p>
              <div className="welcome-model-badge">
                <Sparkles className="badge-icon" />
                当前模型：{currentModel || 'GLM-4-Plus'}
              </div>
              <div className="welcome-suggestions">
                {suggestions.map((text, index) => (
                  <button
                    key={index}
                    className="suggestion-btn"
                    onClick={() => handleSuggestionClick(text)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-content">
            <div className="messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`message-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}>
                  <div className={`msg-avatar ${msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}`}>
                    {msg.role === 'user' ? (
                      <User className="avatar-icon" />
                    ) : (
                      <Bot className="avatar-icon" />
                    )}
                  </div>
                  <div>
                    <div className={`msg-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                      {msg.role === 'assistant' ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <span className="plain-text">{msg.content}</span>
                      )}
                    </div>
                    <div className="msg-time">
                      {formatTime(msg.timestamp)}
                      {msg.role === 'assistant' && ` · ${currentModel || 'GLM-4-Plus'}`}
                    </div>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="typing-indicator">
                  <div className="msg-avatar ai-avatar">
                    <Bot className="avatar-icon" />
                  </div>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        <div className="input-area">
          <div className="input-wrapper">
            <button className="btn-attach" aria-label="添加附件">
              <Paperclip className="attach-icon" />
            </button>
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
              placeholder="输入您的问题，按 Enter 发送..."
              aria-label="消息输入"
              disabled={isGenerating}
            />
            <button
              className="btn-send"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              aria-label="发送消息"
            >
              {isGenerating ? (
                <Loader2 className="send-loader" />
              ) : (
                <ArrowUp className="send-icon" />
              )}
            </button>
          </div>
          <div className="input-hint">
            <span><kbd>Enter</kbd> 发送</span>
            <span><kbd>Shift + Enter</kbd> 换行</span>
          </div>
        </div>
      </main>

      {showProviderModal && (
      <div className="modal-overlay open" onClick={() => setShowProviderModal(false)} role="dialog" aria-modal="true" aria-label="选择模型">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择模型</h3>
              <button className="modal-close" onClick={() => setShowProviderModal(false)} aria-label="关闭">
                <X className="close-icon" />
              </button>
            </div>
            <div className="modal-body">
              {modelOptions.map((model) => (
                <div
                  key={model.id}
                  className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                  onClick={() => handleModelSelect(model.id)}
                  data-model={model.id}
                >
                  <div className="model-radio"></div>
                  <div className="model-option-info">
                    <div className="model-option-name">{model.name}</div>
                    <div className="model-option-desc">{model.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowProviderModal(false)}>取消</button>
              <button className="btn-confirm" onClick={confirmModelSelect}>确认选择</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Chat;