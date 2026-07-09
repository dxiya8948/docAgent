from typing import Dict, Any
from .base import BaseProvider
from .openai import OpenAIProvider
from .claude import ClaudeProvider
from .local import LocalProvider


class ProviderFactory:
    _providers: Dict[str, BaseProvider] = {}
    
    @classmethod
    def get_provider(cls, provider_type: str, config: Dict[str, Any] = None) -> BaseProvider:
        if provider_type in cls._providers:
            return cls._providers[provider_type]
        
        config = config or {}
        
        if provider_type == "openai":
            provider = OpenAIProvider(
                api_key=config.get("api_key", ""),
                model=config.get("model", "gpt-4o-mini"),
                base_url=config.get("base_url", "")
            )
        elif provider_type == "claude":
            provider = ClaudeProvider(
                api_key=config.get("api_key", ""),
                model=config.get("model", "claude-3-sonnet-20240229"),
                base_url=config.get("base_url", "")
            )
        elif provider_type == "local":
            provider = LocalProvider(
                model_name=config.get("model_name", "Qwen/Qwen1.5-1.8B-Chat")
            )
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
        
        cls._providers[provider_type] = provider
        return provider
    
    @classmethod
    def clear_providers(cls):
        cls._providers.clear()
    
    @classmethod
    def get_available_providers(cls) -> list:
        return ["openai", "claude", "local"]
