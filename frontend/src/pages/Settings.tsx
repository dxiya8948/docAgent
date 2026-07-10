import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, testProviderConnection, getOllamaModels } from '../api/client';
import { saveSettings, loadSettings } from '../storage/configStore';
import type { Settings } from '../types';
import { Cpu, SlidersHorizontal, Database, Info, Lightbulb, HardDrive, CheckCircle, AlertCircle, Loader2, Zap, Shield, RefreshCw } from 'lucide-react';
import './Settings.scss';

const providerIcons: Record<string, React.ReactNode> = {
  openai: <Zap className="provider-icon" />,
  claude: <Shield className="provider-icon" />,
  local: <Cpu className="provider-icon" />
};

const providerNames: Record<string, string> = {
  openai: 'OpenAI / 兼容API',
  claude: 'Claude',
  local: '本地模型'
};

const DEFAULT_SETTINGS: Settings = {
  current_provider: 'openai',
  providers: {
    openai: {
      api_key: '',
      base_url: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      enabled: true
    },
    claude: {
      api_key: '',
      base_url: 'https://api.anthropic.com',
      model: 'claude-sonnet-4-20250514',
      enabled: false
    },
    local: {
      base_url: 'http://localhost:11434',
      model: '',
      enabled: false
    }
  },
  embedding: {
    provider_type: 'openai',
    api_key: '',
    base_url: 'https://api.openai.com/v1',
    model: 'text-embedding-3-small',
    enabled: false
  },
  chunk_size: 512,
  chunk_overlap: 64,
  top_k: 5,
  stream: true
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; model: string; details: Record<string, unknown> }>>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState(false);

  useEffect(() => {
    loadAllSettings();
    loadOllamaModels();
  }, []);

  const loadOllamaModels = async () => {
    setIsLoadingOllamaModels(true);
    try {
      const result = await getOllamaModels();
      setOllamaModels(result.models || []);
    } catch {
      setOllamaModels([]);
    } finally {
      setIsLoadingOllamaModels(false);
    }
  };

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

    const validProviders = Object.keys(providerNames);
    if (!validProviders.includes(settingsData.current_provider)) {
      settingsData.current_provider = validProviders[0];
    }

    setSettings(settingsData);
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
      setTimeout(() => setSaveSuccess(false), 4000);
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
    setSettings({ ...settings, chunk_overlap: parseInt(value) || 64 });
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
      <div className="settings-page">
        <div className="loading-state">
          <Loader2 className="loading-icon" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  const getProviderInfoText = () => {
    const provider = settings.current_provider;
    if (provider === 'openai') {
      return '当前使用 <strong>OpenAI 兼容 API</strong> 模式。支持 OpenAI、DeepSeek、通义千问等兼容 OpenAI 接口格式的服务。';
    } else if (provider === 'claude') {
      return '当前使用 <strong>Claude (Anthropic)</strong> 模式。请确保已在 Anthropic 控制台获取有效 API Key。Claude 模型在长文本理解和代码生成方面表现优异。';
    } else if (provider === 'local') {
      return '当前使用 <strong>本地模型 (Ollama)</strong> 模式。连接到本地运行的 Ollama 服务，使用已安装的模型进行问答。';
    }
    return '';
  };

  return (
    <div className="settings-page">
      <div className="bg-blob bg-blob-1" aria-hidden="true"></div>
      <div className="bg-blob bg-blob-2" aria-hidden="true"></div>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">模型配置</h1>
          <p className="page-subtitle">管理 AI 模型提供商、文档处理参数及向量化设置，确保系统正常运行。</p>
        </div>

        <section className="section-card" aria-labelledby="section-provider">
          <h2 className="section-title" id="section-provider">
            <Cpu className="section-icon" />
            AI 提供方
          </h2>

          <div className="provider-pills" role="radiogroup" aria-label="选择AI提供方">
                {Object.keys(providerNames).map((provider) => (
                  <button
                    key={provider}
                    className={`provider-pill ${settings.current_provider === provider ? 'active' : ''}`}
                    role="radio"
                    aria-checked={settings.current_provider === provider}
                    onClick={() => handleProviderChange(provider)}
                  >
                    {providerIcons[provider]}
                    {providerNames[provider] || provider}
                  </button>
                ))}
              </div>

          {(settings.current_provider === 'openai' || settings.current_provider === 'claude') && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="base-url">Base URL</label>
                <input
                  type="url"
                  id="base-url"
                  className="form-input"
                  value={settings.providers[settings.current_provider].base_url || ''}
                  onChange={(e) => handleConfigChange(settings.current_provider, 'base_url', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
                <p className="form-hint">API 服务的基础地址，兼容 API 可填写第三方地址。</p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="api-key">API Key</label>
                <input
                  type="password"
                  id="api-key"
                  className="form-input password"
                  value={settings.providers[settings.current_provider].api_key || ''}
                  onChange={(e) => handleConfigChange(settings.current_provider, 'api_key', e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
                <p className="form-hint">密钥仅保存在本地浏览器中，不会上传至任何服务器。</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="model-name">模型名称</label>
                <input
                  type="text"
                  id="model-name"
                  className="form-input"
                  value={settings.providers[settings.current_provider].model || ''}
                  onChange={(e) => handleConfigChange(settings.current_provider, 'model', e.target.value)}
                  placeholder="例如 gpt-4o"
                />
              </div>
            </>
          )}

          {settings.current_provider === 'local' && (
            <div className="ollama-section">
              <div className="section-card">
                <h3 className="ollama-title">本地模型配置</h3>
                <p className="ollama-desc">通过 Ollama 在本地运行模型，无需联网即可进行问答。</p>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="local-base-url">API 地址</label>
                  <input
                    type="text"
                    id="local-base-url"
                    className="form-input"
                    value={settings.providers.local?.base_url || 'http://localhost:11434'}
                    onChange={(e) => handleConfigChange('local', 'base_url', e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="local-model">已安装模型</label>
                  <div className="select-wrapper">
                    <select
                      id="local-model"
                      className="form-select"
                      value={settings.providers.local?.model || ''}
                      onChange={(e) => handleConfigChange('local', 'model', e.target.value)}
                    >
                      <option value="">-- 选择模型 --</option>
                      {isLoadingOllamaModels ? (
                        <option value="">加载中...</option>
                      ) : ollamaModels.length > 0 ? (
                        ollamaModels.map((m) => (
                          <option key={m.name} value={m.name}>
                            {m.name} ({((m.details as Record<string, unknown>)?.parameter_size as string) || ''})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>未检测到 Ollama 模型，请先安装 Ollama 并拉取模型</option>
                      )}
                    </select>
                    <button
                      type="button"
                      className="refresh-btn"
                      onClick={loadOllamaModels}
                      aria-label="刷新模型列表"
                    >
                      <RefreshCw className="refresh-icon" />
                    </button>
                  </div>
                </div>

                <div className="info-box" style={{ marginTop: 16 }}>
                  <Lightbulb className="info-icon" />
                  <div>
                    <p>首次使用？请先安装 Ollama：</p>
                    <p className="hint-steps">
                      1. 下载安装：<a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">ollama.com/download</a><br />
                      2. 拉取模型：<code>ollama pull qwen2.5:0.5b</code><br />
                      3. 启动服务（安装后自动启动）
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          

          <div className="info-box">
            <Info className="info-icon" />
            <p dangerouslySetInnerHTML={{ __html: getProviderInfoText() }} />
          </div>
        </section>

        <section className="section-card" aria-labelledby="section-params">
          <h2 className="section-title" id="section-params">
            <SlidersHorizontal className="section-icon" />
            文档处理参数
          </h2>

          <div className="toggle-row">
            <div className="toggle-label-group">
              <span className="toggle-label">流式输出</span>
              <span className="toggle-desc">启用后，AI 回答将逐字流式显示，提升交互体验。</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.stream}
                onChange={(e) => handleStreamChange(e.target.checked)}
                aria-label="启用流式输出"
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="param-grid">
            <div className="param-card">
              <div className="param-card-label">Chunk Size</div>
              <div className="param-card-value">{settings.chunk_size}</div>
              <input
                type="range"
                className="param-card-range"
                min="128"
                max="2048"
                step="128"
                value={settings.chunk_size}
                onChange={(e) => handleChunkSizeChange(e.target.value)}
                aria-label="Chunk Size"
              />
            </div>
            <div className="param-card">
              <div className="param-card-label">Chunk Overlap</div>
              <div className="param-card-value">{settings.chunk_overlap}</div>
              <input
                type="range"
                className="param-card-range"
                min="0"
                max="512"
                step="32"
                value={settings.chunk_overlap}
                onChange={(e) => handleChunkOverlapChange(e.target.value)}
                aria-label="Chunk Overlap"
              />
            </div>
            <div className="param-card">
              <div className="param-card-label">Top K</div>
              <div className="param-card-value">{settings.top_k}</div>
              <input
                type="range"
                className="param-card-range"
                min="1"
                max="20"
                step="1"
                value={settings.top_k}
                onChange={(e) => handleTopKChange(e.target.value)}
                aria-label="Top K"
              />
            </div>
          </div>
        </section>

        <section className="section-card" aria-labelledby="section-embedding">
          <h2 className="section-title" id="section-embedding">
            <Database className="section-icon" />
            向量化模型
          </h2>

          <div className="info-box" style={{ marginTop: 0, marginBottom: 20 }}>
            <Lightbulb className="info-icon" />
            <p>向量化模型（Embedding Model）用于将文档内容转换为向量表示，是文档检索与智能问答的核心组件。选择合适的模型直接影响检索准确度。</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="embedding-provider">Embedding 提供方</label>
            <div className="provider-select-wrapper">
              <select
                id="embedding-provider"
                className="provider-select"
                value={settings.embedding.provider_type}
                onChange={(e) => handleEmbeddingChange('provider_type', e.target.value)}
              >
                <option value="openai">OpenAI (text-embedding-3-small)</option>
                <option value="cohere">Cohere (embed-v3)</option>
                <option value="local">本地模型 (sentence-transformers)</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="embedding-url">Embedding API 地址</label>
            <input
              type="url"
              id="embedding-url"
              className="form-input"
              value={settings.embedding.base_url || 'https://api.openai.com/v1'}
              onChange={(e) => handleEmbeddingChange('base_url', e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="embedding-key">Embedding API Key</label>
            <input
              type="password"
              id="embedding-key"
              className="form-input password"
              value={settings.embedding.api_key || ''}
              onChange={(e) => handleEmbeddingChange('api_key', e.target.value)}
              placeholder="与主模型相同，或填入专用密钥"
              autoComplete="off"
            />
          </div>
        </section>

        <section className="action-section" aria-labelledby="section-actions">
          <div className="storage-notice">
            <HardDrive className="storage-icon" />
            <p>所有配置信息均保存在本地浏览器的 localStorage 中，不会传输到外部服务器。清除浏览器数据将导致配置丢失。</p>
          </div>

          <div className="action-buttons">
            <button className="btn btn-outlined" id="btn-test" onClick={handleTestConnection} disabled={isTesting}>
              <Zap className="btn-icon" />
              {isTesting ? (
                <>
                  <Loader2 className="animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </button>
            <button className="btn btn-primary" id="btn-save" onClick={handleSave} disabled={isSaving}>
              <CheckCircle className="btn-icon" />
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" />
                  保存中...
                </>
              ) : (
                '保存配置'
              )}
            </button>
          </div>

          <div className={`message-area ${saveSuccess || testSuccess || saveError || testError ? 'visible' : 'hidden'}`}>
            {(saveSuccess || testSuccess) && (
              <div className="message message-success">
                <CheckCircle className="message-icon" />
                {saveSuccess ? '配置已保存至本地存储。' : `连接成功！${testResponse && `响应时间 ${testResponse}`}`}
              </div>
            )}
            {(saveError || testError) && (
              <div className="message message-error">
                <AlertCircle className="message-icon" />
                {saveError || testError}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;