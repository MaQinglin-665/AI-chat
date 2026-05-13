import re


def _compact_hotword(text):
    return re.sub(r"\s+", "", str(text or "")).strip()


def _has_cjk(text):
    return bool(re.search(r"[\u4e00-\u9fff]", str(text or "")))


def _flexible_hotword_pattern(text, force_flexible=False):
    compact = _compact_hotword(text)
    if not compact:
        return ""
    if not force_flexible and not _has_cjk(compact):
        return re.escape(str(text or "").strip())
    return r"\s*".join(re.escape(ch) for ch in compact)


def _compile_hotword_pattern(src, dst):
    source = _flexible_hotword_pattern(src)
    src_compact = _compact_hotword(src)
    dst_compact = _compact_hotword(dst)
    if (
        src_compact
        and dst_compact.lower().startswith(src_compact.lower())
        and len(dst_compact) > len(src_compact)
    ):
        suffix = dst_compact[len(src_compact) :]
        source += rf"(?!\s*{_flexible_hotword_pattern(suffix, force_flexible=True)})"
    return re.compile(source, flags=re.IGNORECASE)


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
        pattern = _compile_hotword_pattern(s, d)
        out = pattern.sub(d, out)
    return out
