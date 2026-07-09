import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import { lazy } from 'react';
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<Navigate to="/documents" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
