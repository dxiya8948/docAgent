import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import Report from './pages/Report';
import WelcomeModal from './components/WelcomeModal';
import { lazy, useState, useEffect } from 'react';
import { loadSettings } from './storage/configStore';
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  const [modelBadge, setModelBadge] = useState<string>('');

  useEffect(() => {
    const loadModelBadge = async () => {
      try {
        const settings = await loadSettings();
        if (settings) {
          const providerConfig = settings.providers[settings.current_provider];
          if (providerConfig) {
            setModelBadge(providerConfig.model || providerConfig.model_name || '');
          }
        }
      } catch (error) {
        console.error('Failed to load model badge:', error);
      }
    };
    loadModelBadge();
  }, []);

  return (
    <BrowserRouter>
      <Layout modelBadge={modelBadge || 'GLM-4-Plus'}>
        <Routes>
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/report" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<Navigate to="/documents" />} />
        </Routes>
      </Layout>
      <WelcomeModal />
    </BrowserRouter>
  );
}

export default App;
