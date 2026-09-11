import json


def normalize_interaction_items(items, *, normalize_text, looks_garbled, looks_stagey):
    serializable = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        user = normalize_text(item.get("user", ""), max_len=240)
        assistant = normalize_text(item.get("assistant", ""), max_len=280)
        ts = str(item.get("ts", "")).strip()
        if not user or not assistant:
            continue
        if looks_garbled(user) or looks_garbled(assistant):
            continue
        if looks_stagey(assistant):
            continue
        serializable.append({"ts": ts, "user": user, "assistant": assistant})
    return serializable


def load_interaction_items(path, *, normalize_text, looks_garbled, looks_stagey):
    data = safe_load_json_file(path, [])
    if not isinstance(data, list):
        return []
    return normalize_interaction_items(
        data,
        normalize_text=normalize_text,
        looks_garbled=looks_garbled,
        looks_stagey=looks_stagey,
    )


def save_interaction_items(path, items, *, normalize_text, looks_garbled, looks_stagey, logger=None):
    serializable = normalize_interaction_items(
        items,
        normalize_text=normalize_text,
        looks_garbled=looks_garbled,
        looks_stagey=looks_stagey,
    )
    payload = json.dumps(serializable, ensure_ascii=False, indent=2)
    tmp_path = path.with_suffix(".tmp")
    bak_path = path.with_suffix(".bak")
    previous = None
    if path.exists():
        try:
            previous = path.read_bytes()
        except Exception:
            previous = None

    tmp_path.write_text(payload, encoding="utf-8")
    tmp_path.replace(path)

    if previous is not None:
        try:
            bak_path.write_bytes(previous)
        except Exception:
            if logger:
                logger.debug("write memory backup failed", exc_info=True)


def safe_load_json_file(path, fallback):
    candidates = (path, path.with_suffix(".bak"))
    for candidate in candidates:
        try:
            if not candidate.exists():
                continue
            data = json.loads(candidate.read_text(encoding="utf-8-sig"))
            if data is not None:
                return data
        except Exception:
            continue
    return fallback


def safe_save_json_file(path, payload, *, keep_backup=True):
    tmp_path = path.with_suffix(".tmp")
    bak_path = path.with_suffix(".bak")
    previous = None
    if keep_backup and path.exists():
        try:
            previous = path.read_bytes()
        except Exception:
            previous = None
    tmp_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(path)
    if previous is not None:
        try:
            bak_path.write_bytes(previous)
        except Exception:
            pass


def tail_jsonl(path, limit=5):
    try:
        if not path.exists():
            return []
        lines = path.read_text(encoding="utf-8-sig").splitlines()[-max(0, int(limit)):]
    except Exception:
        return []
    out = []
    for line in lines:
        line = str(line or "").strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except Exception:
            data = {"raw": line[:300]}
        out.append(data if isinstance(data, dict) else {"raw": str(data)[:300]})
    return out
