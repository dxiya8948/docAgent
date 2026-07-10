import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Users, MessageSquare, FileText } from 'lucide-react';
import './Report.scss';

interface Conversation {
  id: string;
  user_id: number | null;
  title: string | null;
  message_count: number;
  last_message: string | null;
  created_at: number;
  updated_at: number;
}

interface Message {
  id: number;
  conversation_id: string;
  conversation_title: string | null;
  role: string;
  content: string;
  timestamp: number;
  query_type: string | null;
  response_time: number | null;
  feedback: number;
}

const Report: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const [convResponse, msgResponse] = await Promise.all([
        fetch('http://localhost:8000/api/conversations'),
        fetch('http://localhost:8000/api/messages')
      ]);

      if (convResponse.ok) {
        const convData = await convResponse.json();
        setConversations(convData.conversations || []);
      }

      if (msgResponse.ok) {
        const msgData = await msgResponse.json();
        setMessages(msgData.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserMessages = (convId: string) => {
    return messages.filter(m => m.conversation_id === convId && m.role === 'user');
  };

  const getAssistantMessages = (convId: string) => {
    return messages.filter(m => m.conversation_id === convId && m.role === 'assistant');
  };

  const stats = {
    totalConversations: conversations.length,
    totalMessages: messages.length,
    todayConversations: conversations.filter(c => {
      const today = new Date().toDateString();
      return new Date(c.created_at * 1000).toDateString() === today;
    }).length,
    avgResponseTime: messages
      .filter(m => m.role === 'assistant' && m.response_time)
      .reduce((sum, m) => sum + (m.response_time || 0), 0) /
      messages.filter(m => m.role === 'assistant' && m.response_time).length || 0
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="report-page">
      <div className="bg-blob bg-blob-1" aria-hidden="true"></div>
      <div className="bg-blob bg-blob-2" aria-hidden="true"></div>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">
            <BarChart3 className="section-icon" />
            对话记录
          </h1>
          <p className="page-subtitle">查看系统中的对话记录和统计信息，便于后续分析优化。</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-primary">
              <MessageSquare className="icon" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalConversations}</div>
              <div className="stat-label">总对话数</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-success">
              <TrendingUp className="icon" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.todayConversations}</div>
              <div className="stat-label">今日对话</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-warning">
              <Clock className="icon" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{Math.round(stats.avgResponseTime)}s</div>
              <div className="stat-label">平均响应时长</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-info">
              <Users className="icon" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalMessages}</div>
              <div className="stat-label">总消息数</div>
            </div>
          </div>
        </div>

        <section className="section-card" aria-labelledby="section-conversations">
          <h2 className="section-title" id="section-conversations">
            <FileText className="section-icon" />
            对话列表
          </h2>

          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>加载中...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <MessageSquare className="empty-icon" />
              <p>暂无对话记录</p>
            </div>
          ) : (
            <div className="conversation-list">
              {conversations.map((conv) => {
                const userMsgs = getUserMessages(conv.id);
                const assistantMsgs = getAssistantMessages(conv.id);
                
                return (
                  <div key={conv.id} className="conversation-item">
                    <div className="history-conv-header">
                      <div className="conv-title">
                        会话ID：{conv.id || '未命名对话'}
                      </div>
                      <div className="conv-time">
                        <Clock className="time-icon" />
                        {formatTime(conv.created_at)}
                      </div>
                    </div>

                    <div className="conv-messages">
                      {userMsgs.map((msg, idx) => {
                        const reply = assistantMsgs[idx];
                        return (
                          <div key={msg.id} className="message-pair">
                            <div className="user-message">
                              <span className="message-label">用户：</span>
                              <span className="message-text">{truncateText(msg.content, 100)}</span>
                            </div>
                            {reply && (
                              <div className="assistant-message">
                                <span className="message-label">AI：</span>
                                <span className="message-text">{truncateText(reply.content, 150)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="conv-footer">
                      <span className="message-count">共 {conv.message_count} 条消息</span>
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

export default Report;
