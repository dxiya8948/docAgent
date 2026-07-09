from typing import List, Tuple


def chunk_text(
    text: str,
    chunk_size: int = 1024,
    chunk_overlap: int = 100
) -> List[Tuple[str, int, int]]:
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        
        if end < text_length:
            last_period = text.rfind('.', start, end)
            last_newline = text.rfind('\n', start, end)
            
            if last_period > start + chunk_size // 2:
                end = last_period + 1
            elif last_newline > start + chunk_size // 2:
                end = last_newline + 1
        
        chunk = text[start:end].strip()
        
        if chunk:
            chunks.append((chunk, start, end))
        
        start = end - chunk_overlap
        
        if start >= end:
            start = end
    
    return chunks


def get_chunk_id(document_id: str, chunk_index: int) -> str:
    return f"{document_id}_chunk_{chunk_index}"
