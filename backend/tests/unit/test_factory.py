import pytest
from unittest.mock import patch, MagicMock
from app.providers.factory import ProviderFactory
from app.providers.openai import OpenAIProvider
from app.providers.claude import ClaudeProvider
from app.providers.ollama import OllamaProvider


class TestProviderFactory:
    def setup_method(self):
        ProviderFactory.clear_providers()

    def teardown_method(self):
        ProviderFactory.clear_providers()

    @patch('app.providers.openai.OpenAIProvider.__init__', return_value=None)
    def test_get_provider_openai(self, mock_init):
        config = {"api_key": "test-key", "model": "gpt-4", "base_url": "https://api.openai.com/v1"}
        
        provider = ProviderFactory.get_provider("openai", config)
        
        assert isinstance(provider, OpenAIProvider)
        mock_init.assert_called_with(api_key="test-key", model="gpt-4", base_url="https://api.openai.com/v1")

    @patch('app.providers.claude.ClaudeProvider.__init__', return_value=None)
    def test_get_provider_claude(self, mock_init):
        config = {"api_key": "test-key", "model": "claude-3-opus"}
        
        provider = ProviderFactory.get_provider("claude", config)
        
        assert isinstance(provider, ClaudeProvider)
        mock_init.assert_called_with(api_key="test-key", model="claude-3-opus", base_url="")

    @patch('app.providers.ollama.OllamaProvider.__init__', return_value=None)
    def test_get_provider_ollama(self, mock_init):
        config = {"base_url": "http://localhost:11434", "model": "qwen"}
        
        provider = ProviderFactory.get_provider("ollama", config)
        
        assert isinstance(provider, OllamaProvider)

    @patch('app.providers.ollama.OllamaProvider.__init__', return_value=None)
    def test_get_provider_local(self, mock_init):
        config = {"base_url": "http://localhost:11434", "model": "qwen"}
        
        provider = ProviderFactory.get_provider("local", config)
        
        assert isinstance(provider, OllamaProvider)

    @patch('app.providers.openai.OpenAIProvider.__init__', return_value=None)
    def test_get_provider_caching(self, mock_init):
        config = {"api_key": "test-key"}
        
        provider1 = ProviderFactory.get_provider("openai", config)
        provider2 = ProviderFactory.get_provider("openai", config)
        
        assert provider1 is provider2
        assert mock_init.call_count == 1

    @patch('app.providers.openai.OpenAIProvider.__init__', return_value=None)
    def test_clear_providers(self, mock_init):
        ProviderFactory.get_provider("openai", {"api_key": "test"})
        
        ProviderFactory.clear_providers()
        
        provider = ProviderFactory.get_provider("openai", {"api_key": "test"})
        
        assert provider is not None
        assert mock_init.call_count == 2

    def test_get_available_providers(self):
        providers = ProviderFactory.get_available_providers()
        
        assert isinstance(providers, list)
        assert "openai" in providers
        assert "claude" in providers
        assert "local" in providers

    def test_get_provider_unknown(self):
        with pytest.raises(ValueError, match="Unknown provider type"):
            ProviderFactory.get_provider("unknown", {})

    @patch('app.providers.openai.OpenAIProvider.__init__', return_value=None)
    def test_get_provider_without_config(self, mock_init):
        provider = ProviderFactory.get_provider("openai")
        
        assert isinstance(provider, OpenAIProvider)
        mock_init.assert_called_with(api_key="", model="gpt-4o-mini", base_url="")

    @patch('app.providers.claude.ClaudeProvider.__init__', return_value=None)
    def test_get_provider_claude_default_model(self, mock_init):
        provider = ProviderFactory.get_provider("claude", {"api_key": "test"})
        
        assert isinstance(provider, ClaudeProvider)
        mock_init.assert_called_with(api_key="test", model="claude-3-sonnet-20240229", base_url="")
