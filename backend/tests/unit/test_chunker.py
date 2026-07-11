import pytest
from app.documents.chunker import chunk_text, get_chunk_id


class TestChunker:
    def test_chunk_text_small(self):
        text = "Hello World"
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=10)
        
        assert len(chunks) == 1
        assert chunks[0][0] == text
        assert chunks[0][1] == 0
        assert chunks[0][2] == len(text)

    def test_chunk_text_empty(self):
        text = ""
        chunks = chunk_text(text)
        
        assert len(chunks) == 0

    def test_chunk_text_single_sentence(self):
        text = "This is a single sentence."
        chunks = chunk_text(text, chunk_size=50, chunk_overlap=10)
        
        assert len(chunks) >= 1

    def test_get_chunk_id(self):
        doc_id = "test-doc-123"
        chunk_index = 5
        
        result = get_chunk_id(doc_id, chunk_index)
        
        assert result == "test-doc-123_chunk_5"

    def test_get_chunk_id_zero_index(self):
        doc_id = "doc-0"
        chunk_index = 0
        
        result = get_chunk_id(doc_id, chunk_index)
        
        assert result == "doc-0_chunk_0"

    def test_chunk_text_basic_split(self):
        text = "A" * 200
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=0)
        
        assert len(chunks) >= 2

    def test_chunk_text_overlap(self):
        text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        chunks = chunk_text(text, chunk_size=10, chunk_overlap=3)
        
        assert len(chunks) > 1
        for chunk, start, end in chunks:
            assert len(chunk) > 0
