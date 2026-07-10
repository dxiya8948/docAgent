import json
import os
from typing import Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.json")

MODEL_CACHE_PATH = os.path.join(BASE_DIR, "models")
LLM_MODEL_PATH = os.path.join(MODEL_CACHE_PATH, "llm")
EMBEDDING_MODEL_PATH = os.path.join(MODEL_CACHE_PATH, "embedding")

os.makedirs(MODEL_CACHE_PATH, exist_ok=True)
os.makedirs(LLM_MODEL_PATH, exist_ok=True)
os.makedirs(EMBEDDING_MODEL_PATH, exist_ok=True)

DEFAULT_SETTINGS = {
    "current_provider": "openai",
    "providers": {
        "openai": {
            "api_key": "",
            "base_url": "",
            "model": "gpt-4o-mini",
            "enabled": True
        },
        "claude": {
            "api_key": "",
            "base_url": "",
            "model": "claude-3-sonnet-20240229",
            "enabled": False
        },
        "local": {
            "model_name": "Qwen/Qwen1.5-1.8B-Chat",
            "enabled": False
        },
        "ollama": {
            "base_url": "http://localhost:11434",
            "model": "qwen2.5:0.5b",
            "enabled": False
        }
    },
    "embedding": {
        "provider_type": "openai",
        "api_key": "",
        "base_url": "",
        "model": "text-embedding-3-small",
        "enabled": False
    },
    "chunk_size": 512,
    "chunk_overlap": 50,
    "top_k": 5,
    "stream": True,
    "max_history_messages": 10
}


def load_settings() -> Dict[str, Any]:
    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        
        for key, value in DEFAULT_SETTINGS.items():
            if key not in settings:
                settings[key] = value
        
        save_settings(settings)
        return settings
    except FileNotFoundError:
        save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS


def save_settings(settings: Dict[str, Any]):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)


def get_current_provider() -> str:
    settings = load_settings()
    return settings.get("current_provider", "local")


def set_current_provider(provider_type: str):
    settings = load_settings()
    settings["current_provider"] = provider_type
    save_settings(settings)


def get_provider_config(provider_type: str) -> Dict[str, Any]:
    settings = load_settings()
    return settings.get("providers", {}).get(provider_type, {})


def update_provider_config(provider_type: str, config: Dict[str, Any]):
    settings = load_settings()
    
    if "providers" not in settings:
        settings["providers"] = {}
    
    if provider_type not in settings["providers"]:
        settings["providers"][provider_type] = {}
    
    if provider_type == "ollama" and "base_url" not in config:
        config["base_url"] = "http://localhost:11434"
    
    settings["providers"][provider_type].update(config)
    save_settings(settings)


def get_all_settings() -> Dict[str, Any]:
    return load_settings()


def update_settings(settings: Dict[str, Any]):
    save_settings(settings)


def get_embedding_config() -> Dict[str, Any]:
    settings = load_settings()
    return settings.get("embedding", {})


def update_embedding_config(config: Dict[str, Any]):
    settings = load_settings()
    
    if "embedding" not in settings:
        settings["embedding"] = {}
    
    settings["embedding"].update(config)
    save_settings(settings)
