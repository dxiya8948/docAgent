import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, getAvailableProviders, testProviderConnection } from '../api/client';
import { saveSettings, loadSettings } from '../storage/configStore';
import type { Settings } from '../types';
import { Save, CheckCircle, AlertCircle, Server, Database, Zap } from 'lucide-react';
import './Settings.scss';

const DEFAULT_SETTINGS: Settings = {
  current_provider: 'openai',
  providers: {
    openai: {
      api_key: '',
      base_url: '',
      model: 'gpt-4o-mini',
      enabled: true
    },
    claude: {
      api_key: '',
      base_url: '',
      model: 'claude-3-sonnet-20240229',
      enabled: false
    },
    local: {
      model_name: 'Qwen/Qwen1.5-1.8B-Chat',
      enabled: false
    }
  },
  embedding: {
    provider_type: 'openai',
    api_key: '',
    base_url: '',
    model: 'text-embedding-3-small',
    enabled: false
  },
  chunk_size: 512,
  chunk_overlap: 50,
  top_k: 5,
  stream: true
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState('');
  const [testResponse, setTestResponse] = useState('');

  useEffect(() => {
    loadAllSettings();
    loadProviders();
  }, []);

  const loadAllSettings = async () => {
    let settingsData: Settings;
    
    try {
      settingsData = await getSettings();
      await saveSettings(settingsData);
    } catch {
      try {
        const localSettings = await loadSettings();
        if (localSettings) {
          settingsData = localSettings;
        } else {
          settingsData = DEFAULT_SETTINGS;
        }
      } catch {
        settingsData = DEFAULT_SETTINGS;
      }
    }

    setSettings(settingsData);
  };

  const loadProviders = async () => {
    const providersData = await getAvailableProviders();
    setAvailableProviders(providersData.providers);
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      await saveSettings(settings);
      await updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('保存失败: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings) return;

    setIsTesting(true);
    setTestSuccess(false);
    setTestError('');
    setTestResponse('');

    try {
      const providerType = settings.current_provider;
      const providerConfig = settings.providers[providerType];
      
      const result = await testProviderConnection(providerType, providerConfig);
      
      if (result.success) {
        setTestSuccess(true);
        setTestResponse(result.response || '');
        setTimeout(() => setTestSuccess(false), 5000);
      } else {
        setTestError(result.message);
      }
    } catch (error) {
      setTestError('测试连接失败: ' + (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleProviderChange = (providerType: string) => {
    if (!settings) return;
    setSettings({ ...settings, current_provider: providerType });
  };

  const handleConfigChange = (providerType: string, key: string, value: string | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      providers: {
        ...settings.providers,
        [providerType]: {
          ...settings.providers[providerType],
          [key]: value
        }
      }
    });
  };

  const handleChunkSizeChange = (value: string) => {
    if (!settings) return;
    setSettings({ ...settings, chunk_size: parseInt(value) || 512 });
  };

  const handleChunkOverlapChange = (value: string) => {
    if (!settings) return;
    setSettings({ ...settings, chunk_overlap: parseInt(value) || 50 });
  };

  const handleTopKChange = (value: string) => {
    if (!settings) return;
    setSettings({ ...settings, top_k: parseInt(value) || 5 });
  };

  const handleStreamChange = (value: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, stream: value });
  };

  const handleEmbeddingChange = (key: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      embedding: {
        ...settings.embedding,
        [key]: value
      }
    });
  };

  if (!settings) {
    return (
      <div className="settings-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const providerNames: Record<string, string> = {
    openai: 'OpenAI / 兼容API',
    claude: 'Claude',
    local: '本地模型'
  };

  return (
    <div className="settings-container">
      <div className="header">
        <h1>系统配置</h1>
        <p className="subtitle">管理 AI 服务提供方和系统参数</p>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Server className="section-icon" />
          <h2>AI 服务提供方</h2>
        </div>

        <div className="provider-selector">
          <p className="section-label">当前服务提供方</p>
          <div className="provider-options">
            {availableProviders.map((provider) => (
              <button
                key={provider}
                className={`provider-option ${settings.current_provider === provider ? 'active' : ''}`}
                onClick={() => handleProviderChange(provider)}
              >
                {providerNames[provider] || provider}
              </button>
            ))}
          </div>
        </div>

        <div className="provider-config">
          {(settings.current_provider === 'openai' || settings.current_provider === 'claude') && (
            <div className="config-group">
              <label className="config-label">API Base URL</label>
              <input
                type="text"
                className="config-input"
                value={settings.providers[settings.current_provider].base_url || ''}
                onChange={(e) => handleConfigChange(settings.current_provider, 'base_url', e.target.value)}
                placeholder="https://api.example.com/v1"
              />
              <label className="config-label">API Key</label>
              <input
                type="password"
                className="config-input"
                value={settings.providers[settings.current_provider].api_key || ''}
                onChange={(e) => handleConfigChange(settings.current_provider, 'api_key', e.target.value)}
                placeholder="输入您的 API Key"
              />
              <label className="config-label">模型名称</label>
              <input
                type="text"
                className="config-input"
                value={settings.providers[settings.current_provider].model || 'gpt-4o-mini'}
                onChange={(e) => handleConfigChange(settings.current_provider, 'model', e.target.value)}
              />
            </div>
          )}

          {settings.current_provider === 'local' && (
            <div className="config-group">
              <label className="config-label">模型名称</label>
              <input
                type="text"
                className="config-input"
                value={settings.providers.local.model_name || 'Qwen/Qwen1.5-1.8B-Chat'}
                onChange={(e) => handleConfigChange('local', 'model_name', e.target.value)}
              />
              <p className="config-hint">
                本地模型需要较大的内存和GPU资源，请确保您的环境满足要求。
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>文档处理参数</h2>

        <div className="sse-toggle">
          <div className="toggle-label">
            <Zap className="toggle-icon" />
            <span>启用流式响应 (Stream)</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.stream}
              onChange={(e) => handleStreamChange(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="config-grid">
          <div className="config-item">
            <label className="config-label">分块大小 (Chunk Size)</label>
            <input
              type="number"
              className="config-input"
              value={settings.chunk_size}
              onChange={(e) => handleChunkSizeChange(e.target.value)}
              min="100"
              max="2000"
            />
            <p className="config-hint">每个文本块的最大字符数，建议值：512</p>
          </div>

          <div className="config-item">
            <label className="config-label">分块重叠 (Chunk Overlap)</label>
            <input
              type="number"
              className="config-input"
              value={settings.chunk_overlap}
              onChange={(e) => handleChunkOverlapChange(e.target.value)}
              min="0"
              max="200"
            />
            <p className="config-hint">相邻文本块之间的重叠字符数，建议值：50</p>
          </div>

          <div className="config-item">
            <label className="config-label">检索数量 (Top K)</label>
            <input
              type="number"
              className="config-input"
              value={settings.top_k}
              onChange={(e) => handleTopKChange(e.target.value)}
              min="1"
              max="20"
            />
            <p className="config-hint">回答问题时检索的相关文档块数量，建议值：5</p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Database className="section-icon" />
          <h2>向量化模型配置</h2>
        </div>

        <div className="info-box">
          <p>配置线上向量化模型，用于文档上传时的向量化处理。为空时无法选择线上向量化模式。</p>
        </div>

        <div className="provider-config">
          <div className="config-group">
            <label className="config-label">服务提供方</label>
            <select
              className="config-input"
              value={settings.embedding.provider_type}
              onChange={(e) => handleEmbeddingChange('provider_type', e.target.value)}
            >
              <option value="openai">OpenAI / 兼容API</option>
              <option value="claude">Claude</option>
            </select>
            <label className="config-label">API Base URL</label>
            <input
              type="text"
              className="config-input"
              value={settings.embedding.base_url || ''}
              onChange={(e) => handleEmbeddingChange('base_url', e.target.value)}
              placeholder="https://api.example.com/v1"
            />
            <label className="config-label">API Key</label>
            <input
              type="password"
              className="config-input"
              value={settings.embedding.api_key || ''}
              onChange={(e) => handleEmbeddingChange('api_key', e.target.value)}
              placeholder="输入向量化模型的 API Key"
            />
            <label className="config-label">模型名称</label>
            <input
              type="text"
              className="config-input"
              value={settings.embedding.model || 'text-embedding-3-small'}
              onChange={(e) => handleEmbeddingChange('model', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="save-section">
        <div className="storage-info">
          <Database className="db-icon" />
          <span>配置将保存到本地 IndexedDB</span>
        </div>

        {saveSuccess && (
          <div className="success-message">
            <CheckCircle className="success-icon" />
            配置保存成功！
          </div>
        )}

        {saveError && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            {saveError}
          </div>
        )}

        {testSuccess && (
          <div className="success-message">
            <CheckCircle className="success-icon" />
            连接测试成功！{testResponse && <span className="response-preview">"${testResponse}..."</span>}
          </div>
        )}

        {testError && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            {testError}
          </div>
        )}

        <div className="button-group">
          <button className={`test-btn ${isTesting ? 'loading' : ''}`} onClick={handleTestConnection}>
            <Zap className="test-icon" />
            {isTesting ? '测试中...' : '测试连接'}
          </button>
          <button className={`save-btn ${isSaving ? 'loading' : ''}`} onClick={handleSave}>
            <Save className="save-icon" />
            {isSaving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
