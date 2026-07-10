import json
import os
import re
from typing import List, Dict, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITEMAP_FILE = os.path.join(BASE_DIR, "sitemap.json")


def load_sitemap() -> Dict[str, Dict]:
    try:
        with open(SITEMAP_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_sitemap(sitemap: Dict[str, Dict]):
    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        json.dump(sitemap, f, indent=2, ensure_ascii=False)


def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    import re
    text = text.lower()
    
    word_pattern = re.compile(r'[\u4e00-\u9fff]{2,}|[a-zA-Z]+')
    words = word_pattern.findall(text)
    
    stop_words = {
        '的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个', '没有', '我们', '你们', '他们',
        '什么', '怎么', '如何', '为什么', '因为', '所以', '但是', '然而', '如果', '可以', '应该', '需要',
        '能够', '可能', '应该', '必须', '已经', '正在', '将要', '曾经', '可能', '应该', '必须', '已经',
        'this', 'that', 'these', 'those', 'it', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might'
    }
    
    word_count = {}
    for word in words:
        if word not in stop_words and len(word) >= 2:
            word_count[word] = word_count.get(word, 0) + 1
    
    sorted_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
    return [word for word, count in sorted_words[:max_keywords]]


def generate_sitemap_entry(document_id: str, filename: str, content: str) -> Dict:
    keywords = extract_keywords(content)
    summary = content[:200] + "..." if len(content) > 200 else content
    
    return {
        "document_id": document_id,
        "filename": filename,
        "keywords": keywords,
        "summary": summary,
        "content_length": len(content)
    }


def add_to_sitemap(document_id: str, filename: str, content: str):
    sitemap = load_sitemap()
    sitemap[document_id] = generate_sitemap_entry(document_id, filename, content)
    save_sitemap(sitemap)


def remove_from_sitemap(document_id: str):
    sitemap = load_sitemap()
    if document_id in sitemap:
        del sitemap[document_id]
        save_sitemap(sitemap)


def find_relevant_documents(query: str, top_k: int = 5) -> List[str]:
    sitemap = load_sitemap()
    if not sitemap:
        return []
    
    query_keywords = extract_keywords(query)
    
    scores = {}
    for doc_id, entry in sitemap.items():
        if doc_id == "updated_at":
            continue
        
        score = 0
        doc_keywords = set(entry.get('keywords', []))
        
        for keyword in query_keywords:
            if keyword in doc_keywords:
                score += 1
            
            for doc_kw in doc_keywords:
                if doc_kw in keyword or keyword in doc_kw:
                    score += 0.5
        
        summary = entry.get('summary', '')
        for keyword in query_keywords:
            if keyword in summary:
                score += 0.5
        
        if score > 0:
            scores[doc_id] = score
    
    sorted_docs = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [doc_id for doc_id, score in sorted_docs[:top_k]]


async def find_relevant_documents_with_agent(
    query: str,
    provider_type: str,
    provider_config: Dict,
    top_k: int = 3
) -> List[str]:
    sitemap = load_sitemap()
    if not sitemap:
        return []
    
    docs_info = []
    for doc_id, entry in sitemap.items():
        if doc_id == "updated_at":
            continue
        
        docs_info.append({
            "document_id": entry.get("document_id", doc_id),
            "filename": entry.get("filename", ""),
            "summary": entry.get("summary", ""),
            "keywords": entry.get("keywords", [])
        })
    
    if not docs_info:
        return []
    
    docs_text = "\n\n".join([
        f"文档ID: {doc['document_id']}\n文件名: {doc['filename']}\n内容提要: {doc['summary']}\n关键词: {', '.join(doc['keywords'])}"
        for doc in docs_info
    ])
    
    from ..providers.factory import ProviderFactory
    provider = ProviderFactory.get_provider(provider_type, provider_config)
    
    prompt = f"""用户问题：{query}

请根据以下文档信息，判断哪些文档与用户问题最相关：

{docs_text}

请只输出最相关的文件名，每行一个，最多输出{top_k}个。不要输出任何其他文字。

示例输出：
document1.md
document2.txt
document3.md"""
    
    response = await provider.generate_answer(prompt, "")
    
    lines = response.strip().split('\n')
    relevant_ids = []
    doc_filenames = {doc['filename']: doc['document_id'] for doc in docs_info}
    
    for line in lines:
        line = line.strip()
        if line in doc_filenames:
            relevant_ids.append(doc_filenames[line])
            if len(relevant_ids) >= top_k:
                break
    
    if not relevant_ids:
        for line in lines:
            line = line.strip()
            for filename, doc_id in doc_filenames.items():
                if line in filename or filename in line:
                    relevant_ids.append(doc_id)
                    if len(relevant_ids) >= top_k:
                        break
            if len(relevant_ids) >= top_k:
                break
    
    return relevant_ids


def get_sitemap_entry(document_id: str) -> Optional[Dict]:
    sitemap = load_sitemap()
    return sitemap.get(document_id)


async def generate_sitemap_entry_with_agent(
    document_id: str, 
    filename: str, 
    content: str,
    provider_type: str,
    provider_config: Dict
) -> Dict:
    from ..providers.factory import ProviderFactory
    
    provider = ProviderFactory.get_provider(provider_type, provider_config)
    
    prompt = f"""请分析以下文档内容，并按照固定格式提取信息：

文档名称：{filename}
文档ID：{document_id}

文档内容：
{content}

请按照以下JSON格式输出，不要包含任何其他文字：
{{
  "document_id": "{document_id}",
  "filename": "{filename}",
  "summary": "内容提要，不超过300字，简明扼要地概括文档核心内容",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "content_length": {len(content)}
}}

注意事项：
1. summary必须是中文，不超过300字
2. keywords必须是数组形式，包含5-10个最能代表文档内容的关键词
3. 不要输出任何解释性文字，只输出JSON格式"""
    
    response = await provider.generate_answer(prompt, "")
    
    try:
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            result = json.loads(json_match.group())
            return result
    except Exception as e:
        print(f"JSON解析失败，使用默认方法: {e}")
    
    keywords = extract_keywords(content)
    summary = content[:300] + "..." if len(content) > 300 else content
    
    return {
        "document_id": document_id,
        "filename": filename,
        "summary": summary,
        "keywords": keywords,
        "content_length": len(content)
    }


async def generate_full_sitemap_with_agent(
    documents: List[Dict],
    provider_type: str,
    provider_config: Dict
) -> Dict:
    sitemap = {}
    
    for doc in documents:
        if doc.get('mode') == 'prompt':
            content = doc.get('metadata', {}).get('content', '')
            if content:
                entry = await generate_sitemap_entry_with_agent(
                    doc['id'],
                    doc['filename'],
                    content,
                    provider_type,
                    provider_config
                )
                sitemap[doc['id']] = entry
    
    sitemap["updated_at"] = int(__import__('time').time())
    save_sitemap(sitemap)
    
    return sitemap


def get_sitemap_updated_at() -> Optional[int]:
    sitemap = load_sitemap()
    return sitemap.get("updated_at")