#!/usr/bin/env python3
"""Run cyber-news-bot-main and expose its latest items to the website API."""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
BASE_DIR = Path(__file__).resolve().parents[1]
BOT_DIR = BASE_DIR / "cyber-news-bot-main"
ITEMS_PATH = BOT_DIR / "data" / "items.json"
SNAPSHOT_PATH = BASE_DIR / "storage" / "digests" / "latest.json"

def to_alert(item: dict) -> dict:
    extra = item.get("extra") or {}
    categories = item.get("categories") or ["general"]
    score = 90 if "kev" in categories else 75 if "cve" in categories else 50 if "breach" in categories else 30
    return {
        "title": item.get("title_vi") or item.get("title", "Không có tiêu đề"),
        "summary": item.get("summary", ""),
        "source": item.get("source", "Nguồn mở"),
        "severity": "critical" if score >= 90 else "high" if score >= 75 else "medium" if score >= 50 else "low",
        "threatType": "Vulnerability" if "cve" in categories else "Threat Intelligence",
        "ioc": [item.get("title", "").split(" — ")[0]] if "cve" in categories else [],
        "recommendation": extra.get("required_action", "Theo dõi nguồn và cập nhật biện pháp phòng vệ."),
        "riskScore": score,
        "url": item.get("link"),
        "published": item.get("published"),
    }

def write_snapshot() -> Path:
    items = json.loads(ITEMS_PATH.read_text(encoding="utf-8")) if ITEMS_PATH.exists() else []
    alerts = sorted((to_alert(item) for item in items), key=lambda value: value["published"] or "", reverse=True)[:50]
    data = {
        "morning_bulletin": {"publishTime": "07:00", "totalAlerts": len(alerts), "alerts": alerts},
        "afternoon_bulletin": {"publishTime": "12:00", "totalAlerts": 0, "alerts": []},
        "evening_bulletin": {"publishTime": "18:00", "totalAlerts": 0, "alerts": []},
        "generatedAt": datetime.now().isoformat(), "sources": len({item.get("source") for item in items}),
    }
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return SNAPSHOT_PATH

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--mode", default="morning")
    args = parser.parse_args()
    command = [sys.executable, "-m", "src.collect", "--no-site", "--no-translate"]
    if args.dry_run:
        command.append("--dry-run")
    elif args.mode == "startup" and os.environ.get("SEND_LATEST_ON_START", "true").lower() in ("1", "true", "yes"):
        command.append("--send-latest")
    result = subprocess.run(command, cwd=BOT_DIR, env=os.environ.copy(), check=False)
    snapshot = write_snapshot()
    print(json.dumps({"ok": result.returncode == 0, "snapshot": str(snapshot), "exitCode": result.returncode}, ensure_ascii=False))
    return result.returncode

if __name__ == "__main__":
    raise SystemExit(main())
