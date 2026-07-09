from abc import ABC, abstractmethod
from typing import List, Dict, AsyncGenerator


class BaseProvider(ABC):
    @abstractmethod
    async def generate_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> str:
        pass

    @abstractmethod
    async def stream_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        pass

    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
