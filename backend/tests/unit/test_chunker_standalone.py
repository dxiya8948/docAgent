import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.documents.chunker import chunk_text, get_chunk_id


class TestChunker(unittest.TestCase):
    def test_chunk_text_small(self):
        text = "Hello World"
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=10)
        
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0][0], text)
        self.assertEqual(chunks[0][1], 0)
        self.assertEqual(chunks[0][2], len(text))

    def test_chunk_text_empty(self):
        text = ""
        chunks = chunk_text(text)
        
        self.assertEqual(len(chunks), 0)

    def test_chunk_text_single_sentence(self):
        text = "This is a single sentence."
        chunks = chunk_text(text, chunk_size=50, chunk_overlap=10)
        
        self.assertGreaterEqual(len(chunks), 1)

    def test_get_chunk_id(self):
        doc_id = "test-doc-123"
        chunk_index = 5
        
        result = get_chunk_id(doc_id, chunk_index)
        
        self.assertEqual(result, "test-doc-123_chunk_5")

    def test_get_chunk_id_zero_index(self):
        doc_id = "doc-0"
        chunk_index = 0
        
        result = get_chunk_id(doc_id, chunk_index)
        
        self.assertEqual(result, "doc-0_chunk_0")

    def test_chunk_text_basic_split(self):
        text = "A" * 200
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=0)
        
        self.assertGreaterEqual(len(chunks), 2)

    def test_chunk_text_overlap(self):
        text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        chunks = chunk_text(text, chunk_size=10, chunk_overlap=3)
        
        self.assertGreater(len(chunks), 1)
        for chunk, start, end in chunks:
            self.assertGreater(len(chunk), 0)


if __name__ == "__main__":
    unittest.main()
