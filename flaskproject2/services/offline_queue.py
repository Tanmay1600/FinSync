"""Lightweight SQLite-backed offline queue for media tasks."""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class QueuedTask:
    """Represents a queued unit of work."""

    id: int
    kind: str
    payload: Dict[str, Any]
    attempts: int


class OfflineQueue:
    """Simple persistent queue to survive restarts and connectivity drops."""

    def __init__(self, db_path: str) -> None:
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self.conn.execute("PRAGMA synchronous=NORMAL;")
        self._lock = threading.Lock()
        self._init_schema()

    def _init_schema(self) -> None:
        with self.conn:
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    kind TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    attempts INTEGER NOT NULL DEFAULT 0,
                    last_error TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
                """
            )

    def enqueue(self, kind: str, payload: Dict[str, Any]) -> int:
        now = time.time()
        with self._lock, self.conn:
            cur = self.conn.execute(
                "INSERT INTO tasks (kind, payload, status, attempts, created_at, updated_at) VALUES (?, ?, 'pending', 0, ?, ?)",
                (kind, json.dumps(payload), now, now),
            )
            task_id = cur.lastrowid
            logger.info("Queued task %s (%s)", task_id, kind)
            return task_id

    def fetch_batch(self, limit: int = 5) -> List[QueuedTask]:
        with self._lock:
            rows = self.conn.execute(
                "SELECT id, kind, payload, attempts FROM tasks WHERE status IN ('pending','retry') ORDER BY created_at ASC LIMIT ?",
                (limit,),
            ).fetchall()

        tasks: List[QueuedTask] = []
        for task_id, kind, payload_json, attempts in rows:
            try:
                payload = json.loads(payload_json)
            except json.JSONDecodeError:
                payload = {}
            tasks.append(QueuedTask(id=task_id, kind=kind, payload=payload, attempts=attempts))
        return tasks

    def mark_done(self, task_id: int) -> None:
        with self._lock, self.conn:
            self.conn.execute(
                "UPDATE tasks SET status='done', updated_at=? WHERE id=?",
                (time.time(), task_id),
            )
            logger.info("Task %s marked done", task_id)

    def mark_failed(self, task_id: int, error: str, max_attempts: int = 5) -> None:
        with self._lock, self.conn:
            row = self.conn.execute(
                "SELECT attempts FROM tasks WHERE id=?",
                (task_id,),
            ).fetchone()
            attempts = (row[0] if row else 0) + 1
            status = "retry" if attempts < max_attempts else "failed"
            self.conn.execute(
                "UPDATE tasks SET status=?, attempts=?, last_error=?, updated_at=? WHERE id=?",
                (status, attempts, error[:500], time.time(), task_id),
            )
            logger.warning("Task %s failed (%s/%s): %s", task_id, attempts, max_attempts, error)

    def count_pending(self) -> int:
        with self._lock:
            row = self.conn.execute(
                "SELECT COUNT(*) FROM tasks WHERE status IN ('pending','retry')",
            ).fetchone()
        return int(row[0]) if row else 0


# Factory helper
_def_queue: Optional[OfflineQueue] = None

def get_queue(db_path: str) -> OfflineQueue:
    global _def_queue
    if _def_queue is None:
        _def_queue = OfflineQueue(db_path)
    return _def_queue
