import React, { useState, useEffect } from 'react';
import { uploadDocument, listDocuments, deleteDocument } from '../api/client';
import type { Document } from '../types';
import { Upload, FileText, Trash2, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import './DocumentManager.scss';

const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const docs = await listDocuments();
    setDocuments(docs);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'md', 'markdown'].includes(ext || '')) {
      setUploadError('仅支持 TXT 和 Markdown 格式');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const response = await uploadDocument(file);
      if (response.success) {
        setUploadSuccess(true);
        await loadDocuments();
      } else {
        setUploadError(response.error || '上传失败');
      }
    } catch (error) {
      setUploadError('上传失败: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('确定要删除这个文档吗？')) return;

    setIsDeleting(documentId);

    try {
      await deleteDocument(documentId);
      await loadDocuments();
    } catch (error) {
      alert('删除失败: ' + (error as Error).message);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const formatSize = (chars: number) => {
    if (chars < 1024) return `${chars} 字符`;
    return `${(chars / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="document-manager">
      <div className="header">
        <h1>文档管理</h1>
        <p className="subtitle">上传和管理您的文档，支持 TXT 和 Markdown 格式</p>
      </div>

      <div className="upload-section">
        <label className="upload-btn">
          <input
            type="file"
            accept=".txt,.md,.markdown"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <Upload className="upload-icon" />
          <span>{isUploading ? '上传中...' : '上传文档'}</span>
        </label>

        {isUploading && (
          <div className="loading-indicator">
            <Loader2 className="spinner" />
            <span>正在处理文档...</span>
          </div>
        )}

        {uploadError && (
          <div className="error-message">
            <XCircle className="error-icon" />
            {uploadError}
          </div>
        )}

        {uploadSuccess && (
          <div className="success-message">
            <CheckCircle className="success-icon" />
            文档上传成功！
          </div>
        )}
      </div>

      <div className="document-list">
        <h2>已上传文档</h2>

        {documents.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-icon" />
            <p>暂无文档，请上传文档开始使用</p>
          </div>
        ) : (
          <table className="document-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>状态</th>
                <th>分块数</th>
                <th>大小</th>
                <th>上传时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="filename-cell">
                    <FileText className="file-icon" />
                    {doc.filename}
                  </td>
                  <td>
                    <span className={`status-badge ${doc.status}`}>
                      {doc.status === 'processed' ? '已处理' : doc.status}
                    </span>
                  </td>
                  <td>{doc.chunk_count}</td>
                  <td>{formatSize(doc.char_count)}</td>
                  <td>{formatDate(doc.created_at)}</td>
                  <td className="actions-cell">
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(doc.id)}
                      disabled={isDeleting === doc.id}
                    >
                      {isDeleting === doc.id ? (
                        <Loader2 className="spinner-small" />
                      ) : (
                        <Trash2 className="trash-icon" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;
