def _clamp_int(value, default, min_value, max_value):
    try:
        ivalue = int(value)
    except (TypeError, ValueError):
        ivalue = int(default)
    return max(min_value, min(max_value, ivalue))


def _clamp_float(value, default, min_value, max_value):
    try:
        fvalue = float(value)
    except (TypeError, ValueError):
        fvalue = float(default)
    return max(min_value, min(max_value, fvalue))


def _truncate_text(text, max_chars):
    safe = str(text or "")
    limit = max(128, int(max_chars))
    if len(safe) <= limit:
        return safe
    return safe[:limit] + "\n...[truncated]"
