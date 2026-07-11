import json
import asyncio
from typing import List, Dict, AsyncGenerator
import httpx
from .base import BaseProvider


class OllamaProvider(BaseProvider):
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.base_url = self.config.get("base_url", "http://localhost:11434")
        self.model = self.config.get("model", "qwen2.5:0.5b")
        self._supports_chat = None
    
    @property
    def provider_name(self) -> str:
        return "ollama"

    async def _check_chat_support(self) -> bool:
        if self._supports_chat is not None:
            return self._supports_chat
        
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
                response = await client.get("/api/tags")
                response.raise_for_status()
                data = response.json()
                models = data.get("models", [])
                
                for model_info in models:
                    if model_info.get("name") == self.model:
                        capabilities = model_info.get("capabilities", [])
                        if isinstance(capabilities, list):
                            self._supports_chat = "chat" in capabilities
                        elif isinstance(capabilities, str):
                            self._supports_chat = "chat" in capabilities.lower()
                        else:
                            self._supports_chat = True
                        return self._supports_chat
        except Exception:
            pass
        
        self._supports_chat = True
        return self._supports_chat

    async def generate_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> str:
        supports_chat = await self._check_chat_support()
        
        if supports_chat:
            messages = []
            
            if context:
                messages.append({
                    "role": "system",
                    "content": f"基于以下文档内容回答问题：\n\n{context}"
                })
            
            if history:
                for msg in history:
                    messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", "")
                    })
            
            messages.append({
                "role": "user",
                "content": question
            })

            async with httpx.AsyncClient(base_url=self.base_url, timeout=120.0) as client:
                response = await client.post(
                    "/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "")
        else:
            prompt = ""
            if context:
                prompt += f"基于以下文档内容回答问题：\n\n{context}\n\n"
            if history:
                for msg in history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        prompt += f"用户：{content}\n"
                    else:
                        prompt += f"助手：{content}\n"
            prompt += f"用户：{question}\n助手："

            async with httpx.AsyncClient(base_url=self.base_url, timeout=120.0) as client:
                response = await client.post(
                    "/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data.get("response", "")

    async def stream_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        supports_chat = await self._check_chat_support()
        
        if supports_chat:
            messages = []
            
            if context:
                messages.append({
                    "role": "system",
                    "content": f"基于以下文档内容回答问题：\n\n{context}"
                })
            
            if history:
                for msg in history:
                    messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", "")
                    })
            
            messages.append({
                "role": "user",
                "content": question
            })

            async with httpx.AsyncClient(base_url=self.base_url, timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    "/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": True
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                content = data.get("message", {}).get("content", "")
                                if content:
                                    yield content
                                if data.get("done"):
                                    break
                            except json.JSONDecodeError:
                                continue
        else:
            prompt = ""
            if context:
                prompt += f"基于以下文档内容回答问题：\n\n{context}\n\n"
            if history:
                for msg in history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        prompt += f"用户：{content}\n"
                    else:
                        prompt += f"助手：{content}\n"
            prompt += f"用户：{question}\n助手："

            async with httpx.AsyncClient(base_url=self.base_url, timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    "/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": True
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                content = data.get("response", "")
                                if content:
                                    yield content
                                if data.get("done"):
                                    break
                            except json.JSONDecodeError:
                                continue

    async def embed_text(self, text: str) -> List[float]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=60.0) as client:
            response = await client.post(
                "/api/embeddings",
                json={
                    "model": self.model,
                    "prompt": text
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("embedding", [])

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        results = []
        for text in texts:
            embedding = await self.embed_text(text)
            results.append(embedding)
        return results

    async def list_models(self) -> List[Dict]:
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
                response = await client.get("/api/tags")
                response.raise_for_status()
                data = response.json()
                return data.get("models", [])
        except Exception:
            return []

    async def check_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
                response = await client.get("/api/tags")
                return response.status_code == 200
        except Exception:
            return False