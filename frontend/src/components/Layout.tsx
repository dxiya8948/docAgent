import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, MessageCircle, Settings, BookOpen, BarChart3 } from 'lucide-react';
import './Layout.scss';

const navItems = [
  { path: '/documents', label: '文档管理', icon: FileText },
  { path: '/chat', label: '智能问答', icon: MessageCircle },
  { path: '/reports', label: '对话记录', icon: BarChart3 },
  { path: '/settings', label: '系统配置', icon: Settings },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <BookOpen className="logo-icon" />
          <span className="logo-text">文档问答系统</span>
        </div>
        
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
