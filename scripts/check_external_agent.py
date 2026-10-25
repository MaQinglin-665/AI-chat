"""Read-only doctor check: never installs a CLI or changes provider configuration."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import load_config
from external_agents.codex_cli import health

if __name__ == "__main__":
    result = health(load_config())
    print(json.dumps(result, ensure_ascii=True))
    raise SystemExit(0 if result["ok"] else 1)
