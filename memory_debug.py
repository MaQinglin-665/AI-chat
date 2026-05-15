def normalize_debug_snapshot(snapshot):
    return snapshot if isinstance(snapshot, dict) else {}


def compact_list(values, limit=8):
    if not isinstance(values, list):
        return []
    return values[: max(0, int(limit))]
