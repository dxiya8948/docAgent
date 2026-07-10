import os
import torch
from typing import List, Dict, AsyncGenerator
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel, TextStreamer
from .base import BaseProvider
from ..models.manager import ModelManager

os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"


class LocalProvider(BaseProvider):
    def __init__(self, model_name: str = "Qwen/Qwen1.5-1.8B-Chat", embedding_model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.embedding_model_name = embedding_model_name
        self.model_manager = None
        
        base_model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "models",
            "llm"
        )
        embed_model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "models",
            "embedding"
        )
        os.makedirs(base_model_path, exist_ok=True)
        os.makedirs(embed_model_path, exist_ok=True)
        
        self.embedding_tokenizer = None
        self.embedding_model = None
        self._embedding_model_path = embed_model_path

    async def ensure_model_manager(self):
        if self.model_manager is None:
            self.model_manager = await ModelManager.get_instance()

    async def ensure_loaded(self):
        await self.ensure_model_manager()
        if not self.model_manager.is_model_loaded():
            raise RuntimeError("本地模型未加载，请先在设置中加载模型")

    async def generate_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> str:
        await self.ensure_loaded()
        
        tokenizer = self.model_manager.get_tokenizer()
        model = self.model_manager.get_model()
        
        if context:
            user_prompt = f"使用以下上下文回答问题：\n\n{context}\n\n问题：{question}"
        else:
            user_prompt = question
        
        messages = [
            {"role": "system", "content": "你是一个专业的文档问答助手，请基于提供的上下文准确回答问题。"},
            {"role": "user", "content": user_prompt}
        ]
        
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = tokenizer([text], return_tensors="pt").to(model.device)
        
        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=1024,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        generated_ids = [
            output_ids[len(input_ids):]
            for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return response.strip()

    async def stream_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        await self.ensure_loaded()
        
        tokenizer = self.model_manager.get_tokenizer()
        model = self.model_manager.get_model()
        
        if context:
            user_prompt = f"使用以下上下文回答问题：\n\n{context}\n\n问题：{question}"
        else:
            user_prompt = question
        
        messages = [
            {"role": "system", "content": "你是一个专业的文档问答助手，请基于提供的上下文准确回答问题。"},
            {"role": "user", "content": user_prompt}
        ]
        
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = tokenizer([text], return_tensors="pt").to(model.device)
        
        streamer = TextStreamer(
            tokenizer,
            skip_prompt=True,
            skip_special_tokens=True
        )
        
        full_response = ""
        
        for output in model.generate(
            **model_inputs,
            max_new_tokens=1024,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            streamer=streamer,
        ):
            generated_ids = output[0][len(model_inputs.input_ids[0]):]
            response = tokenizer.decode(generated_ids, skip_special_tokens=True)
            
            new_part = response[len(full_response):]
            if new_part:
                yield new_part
                full_response = response

    async def embed_text(self, text: str) -> List[float]:
        await self._ensure_embedding_loaded()
        
        inputs = self.embedding_tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self.embedding_model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.embedding_model(**inputs)
        
        embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().cpu().numpy().tolist()
        return embeddings

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [await self.embed_text(text) for text in texts]

    async def _ensure_embedding_loaded(self):
        if self.embedding_tokenizer is None or self.embedding_model is None:
            await asyncio.to_thread(self._sync_load_embedding)

    def _sync_load_embedding(self):
        self.embedding_tokenizer = AutoTokenizer.from_pretrained(
            self.embedding_model_name,
            cache_dir=self._embedding_model_path
        )
        self.embedding_model = AutoModel.from_pretrained(
            self.embedding_model_name,
            cache_dir=self._embedding_model_path
        ).to("cuda" if torch.cuda.is_available() else "cpu")

    @property
    def provider_name(self) -> str:
        return "local"