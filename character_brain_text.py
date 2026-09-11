"""Pure text utilities for Character Brain reply normalization."""

from __future__ import annotations

import re


TOOL_META_MARKER = "[[TAFFY_TOOL_META]]"


def normalize_smart_punctuation(text) -> str:
    return (
        str(text or "")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201a", "'")
        .replace("\u201b", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u201e", '"')
        .replace("\u201f", '"')
        .replace("\u2010", "-")
        .replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )


def split_tool_meta_suffix(text: str) -> tuple[str, str]:
    safe = str(text or "")
    if TOOL_META_MARKER not in safe:
        return safe, ""
    visible, meta = safe.split(TOOL_META_MARKER, 1)
    return visible, TOOL_META_MARKER + meta


def normalize_reply_text_spacing(text: str) -> str:
    out = normalize_smart_punctuation(text).strip()
    if not out:
        return ""
    latin = bool(re.search(r"[A-Za-z]", out))
    if latin:
        out = (
            out.replace("\u3002", ".")
            .replace("\uff1f", "?")
            .replace("\uff01", "!")
            .replace("\uff0c", ",")
        )
    out = re.sub(r"\s+", " ", out).strip()
    out = re.sub(r"\s+([,.!?;:])", r"\1", out)
    out = re.sub(r"([,.!?;:])(?=[A-Za-z0-9])", r"\1 ", out)
    out = re.sub(r"([,.!?;:])\s+", r"\1 ", out)
    return re.sub(r"\s{2,}", " ", out).strip()


def split_reply_sentences(text: str) -> list[str]:
    safe = str(text or "").strip()
    if not safe:
        return []
    matches = re.findall(r"[^.!?\n]+[.!?]*", safe)
    parts = [part.strip() for part in matches if part and part.strip()]
    return parts or [safe]


def compact_one_liner(text: str, max_chars: int = 170) -> str:
    compact = normalize_reply_text_spacing(text)
    if len(compact) <= max_chars:
        return compact
    parts = re.split(r"(?<=[,;:])\s+", compact)
    out = ""
    for part in parts:
        candidate = f"{out} {part}".strip()
        if len(candidate) > max_chars:
            break
        out = candidate
    return out or compact[:max_chars].rstrip(" ,;:")


def repair_unbalanced_reply_punctuation(text: str) -> str:
    repaired = normalize_reply_text_spacing(text)
    if not repaired:
        return ""
    if repaired.count("(") > repaired.count(")"):
        repaired = repaired.replace("(", "", repaired.count("(") - repaired.count(")"))
    if repaired.count(")") > repaired.count("("):
        for _ in range(repaired.count(")") - repaired.count("(")):
            repaired = repaired.replace(")", "", 1)
    if repaired.count("[") > repaired.count("]"):
        repaired = repaired.replace("[", "", repaired.count("[") - repaired.count("]"))
    if repaired.count("]") > repaired.count("["):
        for _ in range(repaired.count("]") - repaired.count("[")):
            repaired = repaired.replace("]", "", 1)
    if repaired.count('"') % 2 == 1:
        repaired = repaired.replace('"', "")
    if (repaired.count("\u201c") + repaired.count("\u201d")) % 2 == 1:
        repaired = repaired.replace("\u201c", "").replace("\u201d", "")
    return normalize_reply_text_spacing(repaired)
