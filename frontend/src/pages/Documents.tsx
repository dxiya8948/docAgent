import React, { useState, useEffect, useRef } from 'react';
import { uploadDocument, deleteDocument as deleteDocumentAPI, listDocuments as listDocumentsAPI, getDocumentStatus, getEmbeddingConfig, generateWiki, getWikiStatus } from '../api/client';
import { saveDocument, deleteDocument } from '../storage/documentStore';
import type { Document, EmbeddingConfig } from '../types';
import { Upload, Trash2, FileText, File, CheckCircle, AlertCircle, Loader2, Database, MessageSquare, BookOpen, RefreshCw } from 'lucide-react';
import './Documents.scss';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMode, setUploadMode] = useState<'prompt' | 'rag'>('prompt');
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
  const [wikiUpdatedAt, setWikiUpdatedAt] = useState<number | null>(null);
  const [isGeneratingWiki, setIsGeneratingWiki] = useState(false);
  const pollingRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    loadDocuments();
    loadEmbeddingConfig();
    loadWikiStatus();
    
    return () => {
      pollingRefs.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  const loadEmbeddingConfig = async () => {
    try {
      const config = await getEmbeddingConfig();
      setEmbeddingConfig(config);
    } catch (error) {
      console.error('Failed to load embedding config:', error);
    }
  };

  const loadWikiStatus = async () => {
    try {
      const status = await getWikiStatus();
      setWikiUpdatedAt(status.updated_at || null);
    } catch (error) {
      console.error('Failed to load wiki status:', error);
    }
  };

  const handleGenerateWiki = async () => {
    if (isGeneratingWiki) return;
    
    setIsGeneratingWiki(true);
    setUploadError('');
    
    try {
      const response = await generateWiki();
      
      if (response.success) {
        setWikiUpdatedAt(response.updated_at || null);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setUploadError(response.message || 'Wiki生成失败');
      }
    } catch (error) {
      setUploadError('Wiki生成失败: ' + (error as Error).message);
    } finally {
      setIsGeneratingWiki(false);
    }
  };

  useEffect(() => {
    documents.forEach((doc) => {
      if (doc.status === 'processing' && !pollingRefs.current.has(doc.id)) {
        const interval = setInterval(async () => {
          try {
            const updatedDoc = await getDocumentStatus(doc.id);
            await saveDocument(updatedDoc);
            await loadDocuments();
            
            if (updatedDoc.status !== 'processing') {
              const existingInterval = pollingRefs.current.get(doc.id);
              if (existingInterval) {
                clearInterval(existingInterval);
                pollingRefs.current.delete(doc.id);
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
            const existingInterval = pollingRefs.current.get(doc.id);
            if (existingInterval) {
              clearInterval(existingInterval);
              pollingRefs.current.delete(doc.id);
            }
          }
        }, 2000);
        pollingRefs.current.set(doc.id, interval);
      }
    });
  }, [documents]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const apiDocs = await listDocumentsAPI();
      for (const doc of apiDocs) {
        await saveDocument(doc);
      }
      setDocuments(apiDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['txt', 'md', 'markdown'].includes(ext)) {
      setUploadError('仅支持 TXT 和 Markdown 格式');
      return;
    }

    setUploadSuccess(false);
    setUploadError('');

    try {
      if (uploadMode === 'rag' && (!embeddingConfig || !embeddingConfig.api_key)) {
        setUploadError('请先在设置页面配置向量化模型API Key');
        return;
      }
      
      const response = await uploadDocument(file, uploadMode);
      
      if (response.success && response.document) {
        await saveDocument(response.document);
        await loadDocuments();
      } else {
        setUploadError(response.error || '上传失败');
      }
    } catch (error) {
      setUploadError('上传失败: ' + (error as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('确定要删除这个文档吗？')) return;

    try {
      await deleteDocumentAPI(documentId);
      await deleteDocument(documentId);
      await loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const formatFileSize = (charCount: number) => {
    if (charCount < 1024) return charCount + ' 字符';
    return (charCount / 1024).toFixed(1) + ' KB';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  return (
    <div className="documents-container">
      <div className="header">
        <h1>文档管理</h1>
        <p className="subtitle">上传和管理您的文档</p>
      </div>

      <div className="upload-section">
        <div className="mode-selector">
          <p className="mode-label">上传模式</p>
          <div className="mode-options">
            <button
              className={`mode-option ${uploadMode === 'prompt' ? 'active' : ''}`}
              onClick={() => setUploadMode('prompt')}
            >
              <MessageSquare className="mode-icon" />
              <span>Prompt检索</span>
            </button>
            <button
              className={`mode-option ${uploadMode === 'rag' ? 'active' : ''} ${(!embeddingConfig || !embeddingConfig.api_key) ? 'disabled' : ''}`}
              onClick={() => {
                if (embeddingConfig && embeddingConfig.api_key) {
                  setUploadMode('rag');
                }
              }}
            >
              <Database className="mode-icon" />
              <span>RAG向量化</span>
            </button>
          </div>
          {uploadMode === 'rag' && (!embeddingConfig || !embeddingConfig.api_key) && (
            <p className="mode-hint">请先在设置页面配置向量化模型API Key</p>
          )}
        </div>

        <div className="upload-area" onClick={() => document.getElementById('file-input')?.click()}>
          <input
            id="file-input"
            type="file"
            accept=".txt,.md,.markdown"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <Upload className="upload-icon" />
          <div className="upload-text">
            <p className="upload-title">点击或拖拽上传文件</p>
            <p className="upload-hint">支持 TXT 和 Markdown 格式</p>
          </div>
        </div>

        {uploadSuccess && (
          <div className="success-message">
            <CheckCircle className="success-icon" />
            文件上传成功！
          </div>
        )}

        {uploadError && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            {uploadError}
          </div>
        )}
      </div>

      <div className="documents-section">
        <div className="section-header-row">
          <h2>已上传文档</h2>
          <div className="wiki-controls">
            <button
              className="wiki-btn"
              onClick={handleGenerateWiki}
              disabled={isGeneratingWiki || documents.length === 0}
            >
              {isGeneratingWiki ? (
                <>
                  <RefreshCw className="wiki-icon spinning" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <BookOpen className="wiki-icon" />
                  <span>Wiki生成</span>
                </>
              )}
            </button>
            {wikiUpdatedAt && (
              <span className="wiki-time">
                上次更新: {formatDate(wikiUpdatedAt)}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="loading">
            <Loader2 className="loading-icon" />
            加载中...
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-documents">
            <FileText className="empty-icon" />
            <p>暂无文档</p>
            <p className="empty-hint">上传文档后，您可以在聊天页面基于文档内容提问</p>
          </div>
        ) : (
          <div className="documents-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="document-icon">
                  {doc.filename.endsWith('.md') || doc.filename.endsWith('.markdown') ? (
                    <FileText className="icon markdown" />
                  ) : (
                    <File className="icon txt" />
                  )}
                </div>
                <div className="document-info">
                  <h3 className="document-name">{doc.filename}</h3>
                  <div className="document-meta">
                    <span className="meta-item">
                      <File className="meta-icon" />
                      {formatFileSize(doc.char_count)}
                    </span>
                    <span className="meta-item">
                      <FileText className="meta-icon" />
                      {doc.chunk_count} 个片段
                    </span>
                    <span className="meta-item">{formatDate(doc.created_at)}</span>
                  </div>
                </div>
                <div className="document-actions">
                  <span className={`status-badge ${doc.status}`}>
                    {doc.status === 'processed' ? '已处理' : 
                     doc.status === 'processing' ? '处理中...' : 
                     doc.status === 'error' ? '处理失败' : doc.status}
                  </span>
                  {doc.mode && (
                    <span className={`mode-badge ${doc.mode}`}>
                      {doc.mode === 'rag' ? 'RAG' : 'Prompt'}
                    </span>
                  )}
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="删除文档"
                  >
                    <Trash2 className="delete-icon" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
