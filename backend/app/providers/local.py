import os
import torch
from typing import List, Dict, AsyncGenerator
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel
from .base import BaseProvider

os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"


class LocalProvider(BaseProvider):
    def __init__(self, model_name: str = "Qwen/Qwen1.5-1.8B-Chat", embedding_model_name: str = "all-MiniLM-L6-v2"):
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
        
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            trust_remote_code=True,
            cache_dir=base_model_path
        )
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            device_map="auto",
            trust_remote_code=True,
            cache_dir=base_model_path
        )
        
        self.embedding_tokenizer = AutoTokenizer.from_pretrained(
            embedding_model_name,
            cache_dir=embed_model_path
        )
        self.embedding_model = AutoModel.from_pretrained(
            embedding_model_name,
            cache_dir=embed_model_path
        ).to("cuda" if torch.cuda.is_available() else "cpu")

    async def generate_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> str:
        if context:
            user_prompt = f"使用以下上下文回答问题：\n\n{context}\n\n问题：{question}"
        else:
            user_prompt = question
        
        messages = [
            {"role": "system", "content": "你是一个专业的文档问答助手，请基于提供的上下文准确回答问题。"},
            {"role": "user", "content": user_prompt}
        ]
        
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)
        
        generated_ids = self.model.generate(
            **model_inputs,
            max_new_tokens=1024,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id
        )
        
        generated_ids = [
            output_ids[len(input_ids):]
            for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        
        response = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return response.strip()

    async def stream_answer(
        self,
        question: str,
        context: str = "",
        history: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        if context:
            user_prompt = f"使用以下上下文回答问题：\n\n{context}\n\n问题：{question}"
        else:
            user_prompt = question
        
        messages = [
            {"role": "system", "content": "你是一个专业的文档问答助手，请基于提供的上下文准确回答问题。"},
            {"role": "user", "content": user_prompt}
        ]
        
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)
        
        for output in self.model.generate(
            **model_inputs,
            max_new_tokens=1024,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id,
            streamer=None,
        ):
            generated_ids = output[len(model_inputs.input_ids[0]):]
            response = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
            yield response

    async def embed_text(self, text: str) -> List[float]:
        inputs = self.embedding_tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self.embedding_model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.embedding_model(**inputs)
        
        embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().cpu().numpy().tolist()
        return embeddings

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [await self.embed_text(text) for text in texts]

    @property
    def provider_name(self) -> str:
        return "local"
