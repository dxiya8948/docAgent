import { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, TrendingUp, Clock, ThumbsUp, ThumbsDown, Calendar, Search, RefreshCw } from 'lucide-react';
import { getMessages, getStats } from '../api/client';
import './Reports.scss';

interface Message {
    id: number;
    conversation_id: string;
    conversation_title: string;
    role: string;
    content: string;
    timestamp: number;
    query_type: string;
    relevant_docs: string[];
    response_time: number;
    feedback: number;
}

interface Stats {
    conversation_count: number;
    message_count: number;
    user_message_count: number;
    assistant_message_count: number;
    avg_response_time: number;
    positive_feedback: number;
    negative_feedback: number;
    daily_queries: { date: string; count: number }[];
}

function Reports() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stats' | 'messages'>('stats');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [messagesRes, statsRes] = await Promise.all([
                getMessages(),
                getStats()
            ]);
            setMessages(messagesRes.messages);
            setStats(statsRes);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadData();
    };

    const filteredMessages = messages.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString('zh-CN');
    };

    const formatResponseTime = (seconds: number) => {
        if (!seconds) return '-';
        return `${seconds.toFixed(2)}s`;
    };

    if (loading) {
        return (
            <div className="reports-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="reports-container">
            <div className="reports-header">
                <div className="header-left">
                    <BarChart3 className="page-icon" />
                    <h1>对话记录分析</h1>
                </div>
                <button className="refresh-btn" onClick={handleRefresh}>
                    <RefreshCw className="icon" />
                    刷新
                </button>
            </div>

            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    <TrendingUp className="tab-icon" />
                    统计概览
                </button>
                <button 
                    className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('messages')}
                >
                    <MessageSquare className="tab-icon" />
                    消息记录
                </button>
            </div>

            {activeTab === 'stats' && stats && (
                <div>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon conversations">
                                <MessageSquare className="icon" />
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{stats.conversation_count}</p>
                                <p className="stat-label">对话总数</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon messages">
                                <MessageSquare className="icon" />
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{stats.message_count}</p>
                                <p className="stat-label">消息总数</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon queries">
                                <Search className="icon" />
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{stats.user_message_count}</p>
                                <p className="stat-label">用户提问</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon responses">
                                <MessageSquare className="icon" />
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{stats.assistant_message_count}</p>
                                <p className="stat-label">系统回答</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon time">
                                <Clock className="icon" />
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{formatResponseTime(stats.avg_response_time)}</p>
                                <p className="stat-label">平均响应时间</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon feedback">
                                <ThumbsUp className="icon" />
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{stats.positive_feedback}</p>
                                <p className="stat-label">正面反馈</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon feedback-negative">
                                <ThumbsDown className="icon" />
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{stats.negative_feedback}</p>
                                <p className="stat-label">负面反馈</p>
                            </div>
                        </div>
                    </div>

                    {stats.daily_queries && stats.daily_queries.length > 0 && (
                        <div className="section">
                            <h2>近7天提问趋势</h2>
                            <div className="chart-container">
                                <div className="bar-chart">
                                    {stats.daily_queries.map((item) => (
                                        <div key={item.date} className="bar-item">
                                            <div 
                                                className="bar" 
                                                style={{ height: `${(item.count / Math.max(...stats.daily_queries.map(d => d.count), 1)) * 100}%` }}
                                            />
                                            <span className="bar-label">{item.date.slice(5)}</span>
                                            <span className="bar-count">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'messages' && (
                <div className="section">
                    <div className="search-bar">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder="搜索消息内容..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="messages-list">
                        {filteredMessages.length === 0 ? (
                            <div className="empty-state">
                                <MessageSquare className="empty-icon" />
                                <p>暂无消息记录</p>
                            </div>
                        ) : (
                            filteredMessages.map((msg) => (
                                <div key={msg.id} className={`message-item ${msg.role}`}>
                                    <div className="message-header">
                                        <span className={`role-badge ${msg.role}`}>
                                            {msg.role === 'user' ? '用户' : '系统'}
                                        </span>
                                        <span className="conversation-title">
                                            {msg.conversation_title || msg.conversation_id.slice(0, 8)}
                                        </span>
                                        <span className="message-time">
                                            <Calendar className="time-icon" />
                                            {formatTime(msg.timestamp)}
                                        </span>
                                    </div>
                                    <div className="message-content">
                                        {msg.content.length > 500 ? (
                                            <p>{msg.content.slice(0, 500)}...</p>
                                        ) : (
                                            <p>{msg.content}</p>
                                        )}
                                    </div>
                                    <div className="message-meta">
                                        {msg.response_time && (
                                            <span className="meta-item">
                                                <Clock className="meta-icon" />
                                                响应时间: {formatResponseTime(msg.response_time)}
                                            </span>
                                        )}
                                        {msg.relevant_docs && msg.relevant_docs.length > 0 && (
                                            <span className="meta-item">
                                                相关文档: {msg.relevant_docs.length}
                                            </span>
                                        )}
                                        {msg.feedback !== 0 && (
                                            <span className={`meta-item feedback ${msg.feedback === 1 ? 'positive' : 'negative'}`}>
                                                {msg.feedback === 1 ? <ThumbsUp className="meta-icon" /> : <ThumbsDown className="meta-icon" />}
                                                {msg.feedback === 1 ? '满意' : '不满意'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reports;