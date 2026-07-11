import pytest
import json
import os
from app.config.settings import (
    load_settings,
    save_settings,
    get_current_provider,
    set_current_provider,
    get_provider_config,
    update_provider_config,
    get_all_settings,
    update_settings,
    get_embedding_config,
    update_embedding_config,
    SETTINGS_FILE,
    DEFAULT_SETTINGS
)


class TestSettings:
    def setup_method(self):
        if os.path.exists(SETTINGS_FILE):
            os.remove(SETTINGS_FILE)

    def teardown_method(self):
        if os.path.exists(SETTINGS_FILE):
            os.remove(SETTINGS_FILE)

    def test_load_settings_default(self):
        settings = load_settings()
        
        assert settings["current_provider"] == "openai"
        assert "providers" in settings
        assert "embedding" in settings
        assert os.path.exists(SETTINGS_FILE)

    def test_save_settings(self):
        test_settings = {"test_key": "test_value"}
        save_settings(test_settings)
        
        assert os.path.exists(SETTINGS_FILE)
        
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            loaded = json.load(f)
        
        assert loaded["test_key"] == "test_value"

    def test_get_current_provider(self):
        assert get_current_provider() == "openai"

    def test_set_current_provider(self):
        set_current_provider("ollama")
        
        settings = load_settings()
        assert settings["current_provider"] == "ollama"

    def test_get_provider_config(self):
        config = get_provider_config("openai")
        
        assert config["model"] == "gpt-4o-mini"
        assert "api_key" in config

    def test_get_provider_config_nonexistent(self):
        config = get_provider_config("nonexistent")
        
        assert config == {}

    def test_update_provider_config(self):
        update_provider_config("openai", {"api_key": "test-key", "model": "test-model"})
        
        config = get_provider_config("openai")
        assert config["api_key"] == "test-key"
        assert config["model"] == "test-model"

    def test_update_provider_config_ollama_default_base_url(self):
        update_provider_config("ollama", {"model": "test-model"})
        
        config = get_provider_config("ollama")
        assert config["base_url"] == "http://localhost:11434"
        assert config["model"] == "test-model"

    def test_get_all_settings(self):
        settings = get_all_settings()
        
        assert "current_provider" in settings
        assert "providers" in settings
        assert "embedding" in settings

    def test_update_settings(self):
        new_settings = DEFAULT_SETTINGS.copy()
        new_settings["stream"] = False
        
        update_settings(new_settings)
        
        settings = load_settings()
        assert settings["stream"] == False

    def test_get_embedding_config(self):
        config = get_embedding_config()
        
        assert "provider_type" in config
        assert "model" in config

    def test_update_embedding_config(self):
        update_embedding_config({"api_key": "embed-key", "model": "test-embed-model"})
        
        config = get_embedding_config()
        assert config["api_key"] == "embed-key"
        assert config["model"] == "test-embed-model"

    def test_load_settings_missing_keys(self):
        incomplete_settings = {"current_provider": "openai"}
        save_settings(incomplete_settings)
        
        settings = load_settings()
        
        assert "providers" in settings
        assert "embedding" in settings
        assert settings["chunk_size"] == 512
