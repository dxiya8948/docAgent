import os
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

import json
import asyncio
from enum import Enum
from typing import Dict, Any, List, AsyncGenerator


class ModelStatus(Enum):
    NOT_DOWNLOADED = "not_downloaded"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    LOADING = "loading"
    LOADED = "loaded"
    ERROR = "error"


class ModelManager:
    _instance = None
    _lock = asyncio.Lock()

    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.model_cache_path = os.path.join(base_dir, "models", "llm")
        self.status_file = os.path.join(self.model_cache_path, "model_status.json")
        
        os.makedirs(self.model_cache_path, exist_ok=True)
        
        self._current_model = None
        self._tokenizer = None
        self._model = None
        self._model_status: Dict[str, str] = {}
        self._loading_model_id = None
        
        self._load_status()

    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = ModelManager()
        return cls._instance

    def _load_status(self):
        try:
            if os.path.exists(self.status_file):
                with open(self.status_file, 'r', encoding='utf-8') as f:
                    self._model_status = json.load(f)
        except Exception:
            self._model_status = {}

    def _save_status(self):
        try:
            with open(self.status_file, 'w', encoding='utf-8') as f:
                json.dump(self._model_status, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    def get_supported_models(self) -> List[Dict[str, Any]]:
        return []

    def get_model_status(self, model_id: str) -> Dict[str, Any]:
        return {
            "model_id": model_id,
            "name": model_id,
            "status": ModelStatus.ERROR.value,
            "is_loaded": False,
            "message": "本地模型下载功能已禁用，请使用 Ollama 运行本地模型"
        }

    async def download_model(self, model_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"status": "error", "message": "本地模型下载已禁用，请使用 Ollama 运行本地模型"}

    async def load_model(self, model_id: str) -> Dict[str, Any]:
        return {"status": "error", "message": "本地模型加载已禁用，请使用 Ollama 运行本地模型"}

    async def unload_model(self) -> Dict[str, Any]:
        return {"status": "error", "message": "没有已加载的模型"}

    def get_current_model(self) -> Dict[str, Any]:
        return {"model_id": None, "name": None}

    def is_model_loaded(self) -> bool:
        return False

    def get_tokenizer(self):
        return None

    def get_model(self):
        return None

    def get_device(self) -> str:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"
