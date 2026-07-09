import os
import re
from typing import Tuple


def parse_txt(content: str) -> Tuple[str, dict]:
    return content, {"type": "txt", "char_count": len(content)}


def parse_markdown(content: str) -> Tuple[str, dict]:
    text_content = re.sub(r'#+\s*', '', content)
    text_content = re.sub(r'\*\*([^*]+)\*\*', r'\1', text_content)
    text_content = re.sub(r'\*([^*]+)\*', r'\1', text_content)
    text_content = re.sub(r'`([^`]+)`', r'\1', text_content)
    text_content = re.sub(r'```[\s\S]*?```', '', text_content)
    text_content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text_content)
    text_content = re.sub(r'\n{2,}', '\n', text_content)
    
    return text_content.strip(), {
        "type": "markdown",
        "char_count": len(text_content),
        "original_char_count": len(content)
    }


def parse_document(file_content: str, filename: str) -> Tuple[str, dict]:
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.txt':
        return parse_txt(file_content)
    elif ext in ['.md', '.markdown']:
        return parse_markdown(file_content)
    else:
        return file_content, {"type": "unknown", "char_count": len(file_content)}
