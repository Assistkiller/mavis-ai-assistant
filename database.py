import sqlite3
from typing import List, Optional, Dict
from langchain_core.messages import BaseMessage, message_to_dict, messages_from_dict
import ast

class Database:
    def __init__(self, db_path: str = "chat_history.db"):
        self.db_path = db_path
        self._initialize_db()

    def _initialize_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    workflow_id TEXT PRIMARY KEY,
                    history TEXT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workflow (
                    uuid TEXT PRIMARY KEY,
                    name TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    name TEXT NOT NULL,
                    censored BOOLEAN NOT NULL
                )
            """)
            conn.commit()

    def save_history(self, workflow_id: str, history: List[BaseMessage]):
        history_json = [message_to_dict(msg) for msg in history]
        history_str = str(history_json)

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO chat_history (workflow_id, history)
                VALUES (?, ?)
            """, (workflow_id, history_str))
            conn.commit()

    def load_history(self, workflow_id: str) -> List[BaseMessage]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT history FROM chat_history WHERE workflow_id = ?
            """, (workflow_id,))
            result = cursor.fetchone()

        if result:
            history_str = result[0]
            try:
                history_json = ast.literal_eval(history_str)
                return messages_from_dict(history_json)
            except (ValueError, SyntaxError) as e:
                print(f"Error parsing history: {e}")
                return []
        return []

    def delete_history(self, workflow_id: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM chat_history WHERE workflow_id = ?
            """, (workflow_id,))
            conn.commit()

    def create_workflow(self, uuid: str, name: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO workflow (uuid, name)
                VALUES (?, ?)
            """, (uuid, name))
            conn.commit()

    def get_workflow(self, uuid: str) -> Optional[dict]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT uuid, name FROM workflow WHERE uuid = ?
            """, (uuid,))
            result = cursor.fetchone()

        if result:
            return {"uuid": result[0], "name": result[1]}
        return None

    def get_all_workflows(self) -> List[dict]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT uuid, name FROM workflow
            """)
            results = cursor.fetchall()

        return [{"uuid": row[0], "name": row[1]} for row in results]

    def delete_workflow(self, uuid: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM workflow WHERE uuid = ?
            """, (uuid,))
            conn.commit()

    def save_model(self, provider: str, name: str, censored: bool) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO models (provider, name, censored)
                VALUES (?, ?, ?)
            """, (provider, name, censored))
            conn.commit()
            return cursor.lastrowid

    def load_models(self) -> List[Dict[str, str | bool]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, provider, name, censored FROM models
            """)
            results = cursor.fetchall()

        return [
            {"id": row[0], "provider": row[1], "name": row[2], "censored": bool(row[3])}
            for row in results
        ]

    def delete_model(self, model_id: int):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM models WHERE id = ?
            """, (model_id,))
            conn.commit()

    def update_model_order(self, models: List[Dict[str, str | bool]]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM models")
            for model in models:
                cursor.execute("""
                    INSERT INTO models (provider, name, censored)
                    VALUES (?, ?, ?)
                """, (model["provider"], model["name"], model["censored"]))
            conn.commit()