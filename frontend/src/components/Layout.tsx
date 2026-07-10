import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, MessageSquare, Settings, Cpu } from 'lucide-react';
import './Layout.scss';

const navItems = [
  { path: '/documents', label: '文档管理', icon: FileText },
  { path: '/chat', label: '智能问答', icon: MessageSquare },
  { path: '/settings', label: '模型配置', icon: Settings },
];

const Layout: React.FC<{ children: React.ReactNode; modelBadge?: string }> = ({ children, modelBadge }) => {
  const location = useLocation();

  return (
    <div className="layout">
      <header className="top-bar">
        <Link to="/chat" className="logo" aria-label="文档问答系统">
          <img src="/assets/logo-icon.jpg" alt="Logo" className="logo-icon" />
          文档问答系统
        </Link>

        <nav className="tab-nav" role="tablist">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`tab-link ${isActive ? 'active' : ''}`}
                role="tab"
                aria-selected={isActive}
              >
                <Icon className="tab-icon" />
                <span className="tab-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {modelBadge ? (
          <div className="model-badge">
            <Cpu className="badge-cpu" />
            {modelBadge}
          </div>
        ) : (
          <div className="top-bar-spacer"></div>
        )}
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;