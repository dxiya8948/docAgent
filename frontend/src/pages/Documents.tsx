import React, { useState, useEffect, useRef } from 'react';
import { uploadDocument, deleteDocument as deleteDocumentAPI, listDocuments as listDocumentsAPI, getDocumentStatus, getEmbeddingConfig, generateWiki, getWikiStatus } from '../api/client';
import { saveDocument, deleteDocument } from '../storage/documentStore';
import type { Document, EmbeddingConfig } from '../types';
import { UploadCloud, Trash2, FileText, FileCode, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Search, BrainCircuit, Sparkles, Type, Puzzle, Calendar, Info } from 'lucide-react';
import './Documents.scss';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMode, setUploadMode] = useState<'prompt' | 'rag'>('prompt');
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
  const [, setWikiUpdatedAt] = useState<number | null>(null);
  const [isGeneratingWiki, setIsGeneratingWiki] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
        setTimeout(() => setUploadSuccess(false), 5000);
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

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setUploadSuccess(false);
    setUploadError('');

    const validExts = ['.txt', '.md', '.markdown', '.docx', '.pdf'];
    let hasValid = false;

    for (const file of Array.from(files)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (validExts.includes(ext || '')) {
        hasValid = true;
        
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
        }
      }
    }

    if (hasValid) {
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 5000);
    } else {
      setUploadError('上传失败，请检查文件格式后重试');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    e.target.value = '';
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

  const formatCharCount = (charCount: number) => {
    return charCount.toLocaleString() + ' 字符';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.md') || filename.endsWith('.markdown')) {
      return FileText;
    } else if (filename.endsWith('.json') || filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.py')) {
      return FileCode;
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.csv')) {
      return FileSpreadsheet;
    }
    return FileText;
  };

  return (
    <div className="documents-page">
      <div className="bg-blobs" aria-hidden="true">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <main className="main-content">
        <div className="page-header">
          <h1>文档管理</h1>
          <p>上传和管理您的知识文档，支持 Prompt 检索与 RAG 向量化两种处理模式</p>
        </div>

        <div className="upload-mode-selector" role="radiogroup" aria-label="上传模式选择">
          <button
            className={`mode-btn ${uploadMode === 'prompt' ? 'active' : ''}`}
            role="radio"
            aria-checked={uploadMode === 'prompt'}
            onClick={() => setUploadMode('prompt')}
          >
            <Search />
            Prompt检索
          </button>
          <button
            className={`mode-btn ${uploadMode === 'rag' ? 'active' : ''}`}
            role="radio"
            aria-checked={uploadMode === 'rag'}
            onClick={() => {
              if (embeddingConfig && embeddingConfig.api_key) {
                setUploadMode('rag');
              }
            }}
            disabled={!embeddingConfig || !embeddingConfig.api_key}
          >
            <BrainCircuit />
            RAG向量化
          </button>
        </div>

        <div
          className={`upload-dropzone ${isDragging ? 'drag-over' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="点击或拖拽上传文档"
          onClick={() => document.getElementById('fileInput')?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              document.getElementById('fileInput')?.click();
            }
          }}
        >
          <input
            id="fileInput"
            type="file"
            accept=".txt,.md,.markdown,.docx,.pdf"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <div className="upload-icon-wrapper">
            <UploadCloud />
          </div>
          <div className="upload-title">拖拽文件到此处，或 <span>点击上传</span></div>
          <div className="upload-hint">支持 TXT、Markdown、Word、PDF 格式，单个文件不超过 20MB</div>
          <div className="upload-note">
            <Info className="note-icon" />
            <span>PDF 仅支持文本型文档，扫描件无法提取内容</span>
          </div>
        </div>

        {uploadSuccess && (
          <div className="message-area message-success">
            <CheckCircle2 />
            <span>文档上传成功，正在后台处理中...</span>
          </div>
        )}

        {uploadError && (
          <div className="message-area message-error">
            <AlertCircle />
            <span>{uploadError}</span>
          </div>
        )}

        <section className="doc-list-section" aria-label="已上传文档列表">
          <div className="doc-list-header">
            <h2>已上传文档</h2>
            <button className="wiki-btn" onClick={handleGenerateWiki} disabled={isGeneratingWiki || documents.length === 0} aria-label="Wiki生成">
              {isGeneratingWiki ? (
                <>
                  <Loader2 className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles />
                  Wiki生成
                </>
              )}
            </button>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="loading-icon" />
              <span>加载中...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <img src="/assets/empty-documents.jpg" alt="暂无文档" className="empty-state-image" />
              <h3>暂无文档</h3>
              <p>上传您的第一份文档，开始构建知识库</p>
            </div>
          ) : (
            <div className="doc-cards">
              {documents.map((doc) => {
                const Icon = getFileIcon(doc.filename);
                return (
                  <div key={doc.id} className="doc-card">
                    <button className="delete-btn" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }} aria-label="删除文档">
                      <Trash2 />
                    </button>
                    <div className="doc-card-icon">
                      <Icon />
                    </div>
                    <div className="doc-card-body">
                      <div className="doc-card-filename">{doc.filename}</div>
                      <div className="doc-card-meta">
                        <span><Type /> {formatCharCount(doc.char_count)}</span>
                        <span><Puzzle /> {doc.chunk_count} 分块</span>
                        <span><Calendar /> {formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <div className="doc-card-badges">
                      <span className={`badge ${doc.status === 'processed' ? 'badge-status-done' : doc.status === 'processing' ? 'badge-status-processing' : 'badge-status-error'}`}>
                        {doc.status === 'processed' ? (
                          <><CheckCircle2 /> 已完成</>
                        ) : doc.status === 'processing' ? (
                          <><Loader2 className="animate-spin" /> 处理中</>
                        ) : (
                          <><AlertCircle /> 处理失败</>
                        )}
                      </span>
                      <span className={`badge ${doc.mode === 'rag' ? 'badge-mode-rag' : 'badge-mode-prompt'}`}>
                        {doc.mode === 'rag' ? 'RAG' : 'Prompt'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Documents;