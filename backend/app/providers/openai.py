import os
from typing import List, Dict, AsyncGenerator
from openai import AsyncOpenAI
from .base import BaseProvider


class OpenAIProvider(BaseProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", embedding_model: str = "text-embedding-3-small", base_url: str = ""):
        client_params = {"api_key": api_key}
        if base_url:
            client_params["base_url"] = base_url
        self.client = AsyncOpenAI(**client_params)
        self.model = model
        self.embedding_model = embedding_model

    async def generate_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> str:
        messages = []
        
        if history:
            messages.extend(history)
        
        if context:
            messages.append({
                "role": "system",
                "content": f"使用以下上下文回答问题：\n\n{context}\n\n请基于上下文内容回答用户问题，如果上下文没有相关信息，请如实说明。"
            })
        
        messages.append({"role": "user", "content": question})
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        
        return response.choices[0].message.content or ""

    async def stream_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        messages = []
        
        if history:
            messages.extend(history)
        
        if context:
            messages.append({
                "role": "system",
                "content": f"使用以下上下文回答问题：\n\n{context}\n\n请基于上下文内容回答用户问题，如果上下文没有相关信息，请如实说明。"
            })
        
        messages.append({"role": "user", "content": question})
        
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True
        )
        
        async for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield content

    async def embed_text(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=texts
        )
        return [item.embedding for item in response.data]

    @property
    def provider_name(self) -> str:
        return "openai"
