import os
import json
from datetime import datetime
from typing import List, Optional

DECISIONS_FILE = os.path.join(os.path.dirname(__file__), "decisions.json")


def _load() -> List[dict]:
    if os.path.exists(DECISIONS_FILE):
        with open(DECISIONS_FILE, "r") as f:
            return json.load(f)
    return []


def _dump(decisions: List[dict]):
    with open(DECISIONS_FILE, "w") as f:
        json.dump(decisions, f, indent=2)


def save_decision(decision_data: dict) -> dict:
    decisions = _load()
    entry = {
        "id": len(decisions) + 1,
        "timestamp": datetime.utcnow().isoformat(),
        **decision_data,
    }
    decisions.append(entry)
    _dump(decisions)
    return entry


def get_all_decisions() -> List[dict]:
    return _load()


def get_decision_by_id(decision_id: int) -> Optional[dict]:
    for d in _load():
        if d.get("id") == decision_id:
            return d
    return None
