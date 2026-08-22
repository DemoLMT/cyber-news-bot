import os
import sqlite3
from pathlib import Path


def ensure_database_dir(base_dir: str | Path) -> Path:
    base_path = Path(base_dir)
    base_path.mkdir(parents=True, exist_ok=True)
    return base_path


def get_database_path(config: dict) -> Path:
    base_dir = config.get('storage', {}).get('db_dir', 'storage/database')
    return ensure_database_dir(base_dir) / 'history.db'


def initialize_database(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.execute('PRAGMA foreign_keys = ON;')
    conn.execute(
        '''CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY,
            target_date TEXT NOT NULL,
            mode TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            tokens_used INTEGER,
            error_log TEXT
        )'''
    )
    conn.execute(
        '''CREATE TABLE IF NOT EXISTS dedupe_registry (
            content_hash TEXT PRIMARY KEY,
            source_id TEXT NOT NULL,
            topic TEXT NOT NULL,
            first_seen_at TEXT NOT NULL
        )'''
    )
    conn.commit()
    return conn


def add_run(conn: sqlite3.Connection, run_record: dict) -> None:
    conn.execute(
        'INSERT OR REPLACE INTO runs (id, target_date, mode, status, started_at, finished_at, tokens_used, error_log) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (
            run_record.get('id'),
            run_record.get('target_date'),
            run_record.get('mode'),
            run_record.get('status'),
            run_record.get('started_at'),
            run_record.get('finished_at'),
            run_record.get('tokens_used'),
            run_record.get('error_log'),
        ),
    )
    conn.commit()


def register_item_hash(conn: sqlite3.Connection, content_hash: str, source_id: str, topic: str, first_seen_at: str) -> None:
    conn.execute(
        'INSERT OR IGNORE INTO dedupe_registry (content_hash, source_id, topic, first_seen_at) VALUES (?, ?, ?, ?)',
        (content_hash, source_id, topic, first_seen_at),
    )
    conn.commit()


def is_duplicate(conn: sqlite3.Connection, content_hash: str) -> bool:
    cur = conn.execute('SELECT 1 FROM dedupe_registry WHERE content_hash = ?', (content_hash,))
    return cur.fetchone() is not None


def cleanup_old_dedupes(conn: sqlite3.Connection, retention_days: int) -> None:
    conn.execute(
        'DELETE FROM dedupe_registry WHERE first_seen_at < datetime("now", ?)',
        (f'-{retention_days} days',),
    )
    conn.commit()
