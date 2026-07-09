from typing import List, Dict, AsyncGenerator
from anthropic import AsyncAnthropic
from .base import BaseProvider


class ClaudeProvider(BaseProvider):
    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229", base_url: str = ""):
        client_params = {"api_key": api_key}
        if base_url:
            client_params["base_url"] = base_url
        self.client = AsyncAnthropic(**client_params)
        self.model = model

    async def generate_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> str:
        system_prompt = ""
        if context:
            system_prompt = f"使用以下上下文回答问题：\n\n{context}\n\n请基于上下文内容回答用户问题，如果上下文没有相关信息，请如实说明。"
        
        messages = []
        if history:
            for msg in history:
                role = "user" if msg.get("role") == "user" else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })
        
        messages.append({"role": "user", "content": question})
        
        response = await self.client.messages.create(
            model=self.model,
            system=system_prompt,
            messages=messages,
            max_tokens=4096
        )
        
        return response.content[0].text if response.content else ""

    async def stream_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        system_prompt = ""
        if context:
            system_prompt = f"使用以下上下文回答问题：\n\n{context}\n\n请基于上下文内容回答用户问题，如果上下文没有相关信息，请如实说明。"
        
        messages = []
        if history:
            for msg in history:
                role = "user" if msg.get("role") == "user" else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })
        
        messages.append({"role": "user", "content": question})
        
        stream = await self.client.messages.create(
            model=self.model,
            system=system_prompt,
            messages=messages,
            max_tokens=4096,
            stream=True
        )
        
        async with stream as stream_response:
            async for chunk in stream_response:
                if chunk.type == "content_block_delta":
                    yield chunk.delta.text

    async def embed_text(self, text: str) -> List[float]:
        response = await self.client.messages.create(
            model="claude-3-sonnet-20240229",
            messages=[
                {
                    "role": "user",
                    "content": f"请为以下文本生成嵌入向量：\n\n{text}"
                }
            ],
            max_tokens=2048
        )
        
        import re
        content = response.content[0].text
        match = re.search(r'\[([^\]]+)\]', content)
        if match:
            return [float(x.strip()) for x in match.group(1).split(',')]
        
        raise ValueError("无法从Claude响应中提取嵌入向量")

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [await self.embed_text(text) for text in texts]

    @property
    def provider_name(self) -> str:
        return "claude"
