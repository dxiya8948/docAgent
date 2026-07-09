import os
from typing import List, Dict, AsyncGenerator
from .base import BaseProvider

os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"


class LocalEmbedProvider(BaseProvider):
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        from fastembed import TextEmbedding
        
        self.model_name = model
        
        model_cache_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "models",
            "embedding"
        )
        os.makedirs(model_cache_path, exist_ok=True)
        
        self.embedding_model = TextEmbedding(
            model_name=model,
            cache_dir=model_cache_path
        )

    async def generate_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> str:
        return "本地模型仅支持向量化，不支持生成回答。请在设置中选择其他 Provider。"

    async def stream_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        yield "本地模型仅支持向量化，不支持生成回答。"

    async def embed_text(self, text: str) -> List[float]:
        embeddings = self.embedding_model.embed([text])
        return embeddings[0]

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return self.embedding_model.embed(texts)

    @property
    def provider_name(self) -> str:
        return "local"
