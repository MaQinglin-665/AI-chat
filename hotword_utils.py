import re


def apply_hotword_replacements(text, replacements):
    safe = str(text or "")
    if not safe or not isinstance(replacements, dict) or not replacements:
        return safe
    # Replace longer sources first to avoid partial replacement conflicts.
    ordered = sorted(replacements.items(), key=lambda kv: len(str(kv[0])), reverse=True)
    out = safe
    for src, dst in ordered:
        s = str(src or "")
        d = str(dst or "")
        if not s or not d:
            continue
        pattern = re.compile(re.escape(s), flags=re.IGNORECASE)
        out = pattern.sub(d, out)
    return out
