import React, { useEffect, useState } from 'react';
import { X, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import './WelcomeModal.scss';

const WelcomeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenWelcome', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-overlay" onClick={handleClose}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button className="welcome-close" onClick={handleClose} aria-label="关闭">
          <X className="close-icon" />
        </button>

        <div className="welcome-header">
          <div className="welcome-icon">
            <Sparkles className="sparkles-icon" />
          </div>
          <h2 className="welcome-title">欢迎使用文档问答系统</h2>
          <p className="welcome-subtitle">基于 TareCN 和千问开发的智能文档问答平台</p>
        </div>

        <div className="welcome-content">
          <div className="feature-section">
            <h3 className="section-title">
              <CheckCircle2 className="section-icon" />
              支持的模型
            </h3>
            <ul className="feature-list">
              <li>OpenAI 系列模型（GPT-4、GPT-3.5）</li>
              <li>本地 Ollama 模型（需本地部署）</li>
            </ul>
          </div>

          <div className="feature-section">
            <h3 className="section-title">
              <Clock className="section-icon" />
              待完善功能
            </h3>
            <ul className="feature-list incomplete">
              <li>向量处理优化（当前使用 Agent 自主查询sitemap召回文档进行回答）</li>
              <li>账户系统</li>
              <li>上下文智能提炼（当前使用强制长度截断控制）</li>
            </ul>
          </div>
        </div>

        <div className="welcome-footer">
          <button className="welcome-button" onClick={handleClose}>
            开始使用
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
