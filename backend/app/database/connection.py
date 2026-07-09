import sqlite3
import os
from typing import Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "data", "doc_agent.db")

_connection: Optional[sqlite3.Connection] = None


def get_db_connection() -> sqlite3.Connection:
    global _connection
    
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    if _connection is None:
        _connection = sqlite3.connect(DB_PATH, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
        init_tables()
    
    return _connection


def init_tables():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
            updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            title TEXT,
            created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
            updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER DEFAULT CURRENT_TIMESTAMP,
            query_type TEXT,
            relevant_docs TEXT,
            response_time REAL,
            feedback INTEGER DEFAULT 0,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
        ON messages(conversation_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
        ON messages(timestamp)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
        ON conversations(updated_at)
    ''')
    
    conn.commit()


def close_db_connection():
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None