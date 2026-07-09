import json
from typing import List, Dict, Optional
from datetime import datetime
from .connection import get_db_connection


def save_conversation(conversation_id: str, user_id: Optional[int] = None, title: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR IGNORE INTO conversations (id, user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (conversation_id, user_id, title, int(datetime.now().timestamp()), int(datetime.now().timestamp())))
    
    conn.commit()


def update_conversation(conversation_id: str, title: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if title:
        cursor.execute('''
            UPDATE conversations 
            SET title = ?, updated_at = ?
            WHERE id = ?
        ''', (title, int(datetime.now().timestamp()), conversation_id))
    
    conn.commit()


def save_message(
    conversation_id: str,
    role: str,
    content: str,
    query_type: Optional[str] = None,
    relevant_docs: Optional[List[str]] = None,
    response_time: Optional[float] = None,
    feedback: int = 0
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO messages 
        (conversation_id, role, content, timestamp, query_type, relevant_docs, response_time, feedback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        conversation_id,
        role,
        content,
        int(datetime.now().timestamp()),
        query_type,
        json.dumps(relevant_docs) if relevant_docs else None,
        response_time,
        feedback
    ))
    
    cursor.execute('''
        UPDATE conversations 
        SET updated_at = ?
        WHERE id = ?
    ''', (int(datetime.now().timestamp()), conversation_id))
    
    conn.commit()


def get_conversation_messages(conversation_id: str) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY timestamp ASC
    ''', (conversation_id,))
    
    rows = cursor.fetchall()
    
    result = []
    for row in rows:
        relevant_docs = row['relevant_docs']
        result.append({
            'id': row['id'],
            'conversation_id': row['conversation_id'],
            'role': row['role'],
            'content': row['content'],
            'timestamp': row['timestamp'],
            'query_type': row['query_type'],
            'relevant_docs': json.loads(relevant_docs) if relevant_docs else None,
            'response_time': row['response_time'],
            'feedback': row['feedback']
        })
    
    return result


def get_all_conversations() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT c.*, 
               COUNT(m.id) as message_count,
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY c.id
        ORDER BY c.updated_at DESC
    ''')
    
    rows = cursor.fetchall()
    
    result = []
    for row in rows:
        result.append({
            'id': row['id'],
            'user_id': row['user_id'],
            'title': row['title'],
            'message_count': row['message_count'],
            'last_message': row['last_message'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
    
    return result


def get_all_messages() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT m.*, c.title as conversation_title
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        ORDER BY m.timestamp DESC
    ''')
    
    rows = cursor.fetchall()
    
    result = []
    for row in rows:
        relevant_docs = row['relevant_docs']
        result.append({
            'id': row['id'],
            'conversation_id': row['conversation_id'],
            'conversation_title': row['conversation_title'],
            'role': row['role'],
            'content': row['content'],
            'timestamp': row['timestamp'],
            'query_type': row['query_type'],
            'relevant_docs': json.loads(relevant_docs) if relevant_docs else None,
            'response_time': row['response_time'],
            'feedback': row['feedback']
        })
    
    return result


def delete_conversation(conversation_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM conversations WHERE id = ?', (conversation_id,))
    if not cursor.fetchone():
        return False
    
    cursor.execute('DELETE FROM messages WHERE conversation_id = ?', (conversation_id,))
    cursor.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
    
    conn.commit()
    return True


def get_conversation_stats() -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM conversations')
    conversation_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM messages')
    message_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM messages WHERE role = ?', ('user',))
    user_message_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM messages WHERE role = ?', ('assistant',))
    assistant_message_count = cursor.fetchone()[0]
    
    cursor.execute('''
        SELECT AVG(response_time) FROM messages 
        WHERE role = 'assistant' AND response_time IS NOT NULL
    ''')
    avg_response_time = cursor.fetchone()[0]
    
    cursor.execute('''
        SELECT COUNT(*) FROM messages 
        WHERE feedback = 1
    ''')
    positive_feedback = cursor.fetchone()[0]
    
    cursor.execute('''
        SELECT COUNT(*) FROM messages 
        WHERE feedback = -1
    ''')
    negative_feedback = cursor.fetchone()[0]
    
    cursor.execute('''
        SELECT strftime('%Y-%m-%d', timestamp, 'unixepoch') as date, 
               COUNT(*) as count
        FROM messages
        WHERE role = 'user'
        GROUP BY date
        ORDER BY date DESC
        LIMIT 7
    ''')
    daily_queries = []
    for row in cursor.fetchall():
        daily_queries.append({
            'date': row['date'],
            'count': row['count']
        })
    
    return {
        'conversation_count': conversation_count,
        'message_count': message_count,
        'user_message_count': user_message_count,
        'assistant_message_count': assistant_message_count,
        'avg_response_time': avg_response_time if avg_response_time else 0,
        'positive_feedback': positive_feedback,
        'negative_feedback': negative_feedback,
        'daily_queries': daily_queries
    }


def update_message_feedback(message_id: int, feedback: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM messages WHERE id = ?', (message_id,))
    if not cursor.fetchone():
        return False
    
    cursor.execute('''
        UPDATE messages 
        SET feedback = ?
        WHERE id = ?
    ''', (feedback, message_id))
    
    conn.commit()
    return True