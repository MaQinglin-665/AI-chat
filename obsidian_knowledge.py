"""A small, local-first Obsidian knowledge layer for the desktop companion.

The vault is deliberately the source of truth.  Its Markdown files stay easy to
inspect and edit in Obsidian; this module only builds a bounded local retrieval
view and never sends the whole vault to the chat prompt.
"""

from __future__ import annotations

import hashlib
import json
import logging
import random
import re
import threading
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from memory_store import safe_load_json_file, safe_save_json_file

logger = logging.getLogger(__name__)

DEFAULT_VAULT_PATH = r"D:\馨语记忆库"
INDEX_FILE = ".xinyu-knowledge-index.json"
MANIFEST_FILE = "00-系统/知识库说明.md"
CHANGELOG_FILE = "99-变更日志/自动同步.md"
VAULT_FOLDERS = (
    "00-系统",
    "01-关于用户",
    "02-共同经历",
    "03-关系与成长",
    "04-兴趣与观点",
    "04-兴趣与观点/个人观点",
    "05-外部知识",
    "05-外部知识/已验证事实",
    "06-待核实",
    "07-待处理",
    "08-内心日记",
    "09-社会关系",
    "90-已归档",
    "99-变更日志",
)
_LOCK = threading.RLock()
_TOKEN_RE = re.compile(r"[\u4e00-\u9fff]{1,4}|[a-z0-9_+-]{2,}", re.IGNORECASE)
_LEARNER_STARTED = False
_LEGACY_SYNC_PENDING = False
_EMBEDDER = None


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def get_settings(config: dict | None) -> dict[str, Any]:
    raw = config.get("knowledge_base", {}) if isinstance(config, dict) else {}
    raw = raw if isinstance(raw, dict) else {}
    try:
        prompt_max_items = max(1, min(6, int(raw.get("prompt_max_items", 4))))
    except (TypeError, ValueError):
        prompt_max_items = 4
    try:
        prompt_max_chars = max(160, min(900, int(raw.get("prompt_max_chars", 520))))
    except (TypeError, ValueError):
        prompt_max_chars = 520
    return {
        "enabled": bool(raw.get("enabled", False)),
        "vault_path": str(raw.get("vault_path", DEFAULT_VAULT_PATH) or DEFAULT_VAULT_PATH),
        "prompt_max_items": prompt_max_items,
        "prompt_max_chars": prompt_max_chars,
        "auto_sync": bool(raw.get("auto_sync", True)),
        "background_learning_enabled": bool(raw.get("background_learning_enabled", False)),
        "semantic_enabled": bool(raw.get("semantic_enabled", True)),
        "semantic_model": str(raw.get("semantic_model", "BAAI/bge-small-zh-v1.5") or "BAAI/bge-small-zh-v1.5"),
        "background_min_interval_hours": max(2, min(48, int(raw.get("background_min_interval_hours", 6) or 6))),
        "background_max_interval_hours": max(3, min(72, int(raw.get("background_max_interval_hours", 14) or 14))),
    }


def _vault(settings: dict[str, Any]) -> Path:
    return Path(settings["vault_path"]).expanduser()


def _safe_slug(value: str, fallback: str = "记忆") -> str:
    text = re.sub(r"[\\/:*?\"<>|\r\n]+", "-", str(value or "").strip())
    text = re.sub(r"\s+", " ", text).strip(" .-")[:72]
    return text or fallback


def _tokens(text: str) -> set[str]:
    raw = str(text or "").lower()
    tokens = {token.lower() for token in _TOKEN_RE.findall(raw) if len(token) > 1}
    # Regex chunks alone are position-dependent for CJK ("合作游戏" might be
    # split differently in the query and in a note).  Small overlapping grams
    # retain a cheap, model-free match for edited Chinese Markdown.
    for segment in re.findall(r"[\u4e00-\u9fff]{2,}", raw):
        for size in (2, 3, 4):
            tokens.update(segment[idx : idx + size] for idx in range(0, max(0, len(segment) - size + 1)))
    return tokens


def _embed(settings, texts):
    global _EMBEDDER
    if not settings.get("semantic_enabled") or not texts:
        return []
    try:
        if _EMBEDDER is None:
            from sentence_transformers import SentenceTransformer
            _EMBEDDER = SentenceTransformer(settings["semantic_model"], device="cpu")
        return [list(map(float, row)) for row in _EMBEDDER.encode(texts, normalize_embeddings=True, show_progress_bar=False)]
    except Exception:
        logger.debug("local semantic embedding unavailable; using keyword fallback", exc_info=True)
        return []


def _quote_scalar(value: Any) -> str:
    return json.dumps(str(value or ""), ensure_ascii=False)


def _parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end < 0:
        return {}, text
    meta: dict[str, Any] = {}
    for line in text[4:end].splitlines():
        key, sep, value = line.partition(":")
        if not sep:
            continue
        key = key.strip()
        value = value.strip()
        if value.startswith("["):
            try:
                meta[key] = json.loads(value)
                continue
            except json.JSONDecodeError:
                pass
        if value in {"true", "false"}:
            meta[key] = value == "true"
        else:
            try:
                meta[key] = json.loads(value)
            except json.JSONDecodeError:
                meta[key] = value.strip('"')
    return meta, text[end + 5 :].lstrip("\n")


def _render_note(meta: dict[str, Any], body: str) -> str:
    ordered = (
        "id", "kind", "category", "status", "confidence", "importance", "pinned",
        "source", "origin", "importance_reason", "links", "superseded_by", "created_at", "updated_at", "last_used_at", "use_count", "tags",
    )
    lines = ["---"]
    for key in ordered:
        if key not in meta:
            continue
        value = meta[key]
        if isinstance(value, (list, dict)):
            rendered = json.dumps(value, ensure_ascii=False)
        elif isinstance(value, bool):
            rendered = "true" if value else "false"
        elif isinstance(value, (int, float)):
            rendered = str(value)
        else:
            rendered = _quote_scalar(value)
        lines.append(f"{key}: {rendered}")
    lines.extend(["---", "", body.strip(), ""])
    return "\n".join(lines)


def _folder_for(category: str, status: str = "active") -> str:
    if status in {"archived", "deleted", "rejected"}:
        return "90-已归档"
    return {
        "user_preference": "01-关于用户",
        "relationship": "03-关系与成长",
        "recent_event": "02-共同经历",
        "project_context": "02-共同经历",
    }.get(category, "04-兴趣与观点")


def ensure_vault(config: dict | None) -> dict[str, Any]:
    settings = get_settings(config)
    vault = _vault(settings)
    with _LOCK:
        for folder in VAULT_FOLDERS:
            (vault / folder).mkdir(parents=True, exist_ok=True)
        manifest = vault / MANIFEST_FILE
        if not manifest.exists():
            manifest.write_text(
                "# 馨语知识库\n\n"
                "这里是桌宠的本地长期知识与成长记录。你在 Obsidian 中的修改会成为权威内容；"
                "聊天时只会检索少量相关片段，不会把整个仓库发送给模型。\n\n"
                "- `06-待核实`：单一来源或未经确认的信息，不能作为确定事实回答。\n"
                "- `90-已归档`：可恢复的旧内容。\n"
                "- `99-变更日志`：自动迁移和同步记录。\n",
                encoding="utf-8",
            )
    return {"ok": True, "vault_path": str(vault), "enabled": settings["enabled"]}


def _note_identity(meta: dict[str, Any], body: str, relative: str) -> str:
    return str(meta.get("id") or "").strip() or hashlib.sha256(
        f"{relative}\n{body}".encode("utf-8", errors="replace")
    ).hexdigest()[:24]


def _iter_notes(vault: Path) -> list[dict[str, Any]]:
    notes: list[dict[str, Any]] = []
    if not vault.exists():
        return notes
    for path in vault.rglob("*.md"):
        relative = path.relative_to(vault).as_posix()
        if (
            ".obsidian" in path.parts
            or path.name == Path(MANIFEST_FILE).name
            or relative.startswith("00-系统/")
            or relative.startswith("99-变更日志/")
        ):
            continue
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        meta, body = _parse_frontmatter(raw)
        text = body.strip()
        if not text:
            continue
        notes.append({
            "id": _note_identity(meta, text, relative),
            "path": relative,
            "text": text[:2400],
            "meta": meta,
            "mtime_ns": path.stat().st_mtime_ns,
            "tokens": sorted(_tokens(f"{text} {' '.join(meta.get('tags', []) if isinstance(meta.get('tags'), list) else [])}")),
        })
    return notes


def _index_path(vault: Path) -> Path:
    return vault / INDEX_FILE


def sync_vault(config: dict | None) -> dict[str, Any]:
    settings = get_settings(config)
    if not settings["enabled"]:
        return {"ok": True, "enabled": False, "synced": 0}
    vault = _vault(settings)
    ensure_vault(config)
    notes = _iter_notes(vault)
    vectors = _embed(settings, [item["text"] for item in notes])
    if len(vectors) == len(notes):
        for item, vector in zip(notes, vectors):
            item["embedding"] = vector
    payload = {
        "schema_version": 1,
        "updated_at": _now(),
        "latest_mtime_ns": max((int(item.get("mtime_ns", 0)) for item in notes), default=0),
        "items": notes,
    }
    with _LOCK:
        safe_save_json_file(_index_path(vault), payload, keep_backup=False)
    return {"ok": True, "enabled": True, "vault_path": str(vault), "synced": len(notes)}


def _load_index(vault: Path) -> list[dict[str, Any]]:
    data = safe_load_json_file(_index_path(vault), {})
    items = data.get("items", []) if isinstance(data, dict) else []
    return [item for item in items if isinstance(item, dict)]


def _index_needs_refresh(vault: Path) -> bool:
    if not vault.exists():
        return False
    data = safe_load_json_file(_index_path(vault), {})
    indexed_mtime = int(data.get("latest_mtime_ns", 0) or 0) if isinstance(data, dict) else 0
    try:
        latest = max((path.stat().st_mtime_ns for path in vault.rglob("*.md")), default=0)
    except OSError:
        return False
    return latest > indexed_mtime


def _append_changelog(vault: Path, line: str) -> None:
    path = vault / CHANGELOG_FILE
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"- {_now()}：{line}\n")


def migrate_existing_memories(config: dict | None) -> dict[str, Any]:
    """Copy distilled memory into the vault.  It never removes legacy memory."""
    settings = get_settings(config)
    if not settings["enabled"]:
        return {"ok": False, "error": "knowledge_base_disabled", "migrated": 0}
    vault = _vault(settings)
    ensure_vault(config)
    from memory import (  # delayed: memory imports many optional services
        PROFILE_MEMORY_PATH,
        RELATIONSHIP_MEMORY_PATH,
        load_core_memory_items,
    )
    from relationship_state import load_relationship_state

    created = 0
    with _LOCK:
        for item in load_core_memory_items():
            memory_id = str(item.get("id") or "").strip()
            text = str(item.get("text") or "").strip()
            if not memory_id or not text:
                continue
            folder = _folder_for(str(item.get("category") or ""), str(item.get("status") or "active"))
            path = vault / folder / f"{_safe_slug(memory_id)}.md"
            if path.exists():
                continue
            meta = {key: item.get(key) for key in (
                "id", "kind", "category", "status", "confidence", "importance", "pinned", "source",
                "created_at", "updated_at", "last_used_at", "use_count", "tags",
            )}
            text_lower = text.lower()
            if item.get("pinned"):
                meta["importance_reason"] = "用户明确固定"
            elif item.get("category") in {"relationship", "recent_event", "project_context"}:
                meta["importance_reason"] = "共同经历或关系节点"
            elif "记住" in text or "remember" in text_lower:
                meta["importance_reason"] = "明确要求记住"
            else:
                meta["importance_reason"] = "长期提炼记忆"
            meta["origin"] = "legacy_core_memory"
            path.write_text(_render_note(meta, f"# {text}\n\n{text}"), encoding="utf-8")
            created += 1

        for summary_path, note_name, title, category in (
            (PROFILE_MEMORY_PATH, "profile-summary.md", "用户画像摘要", "user_preference"),
            (RELATIONSHIP_MEMORY_PATH, "relationship-summary.md", "关系摘要", "relationship"),
        ):
            summary_data = safe_load_json_file(summary_path, {})
            summary = str(summary_data.get("summary", "") or "").strip() if isinstance(summary_data, dict) else ""
            if not summary:
                continue
            folder = _folder_for(category)
            summary_note = vault / folder / note_name
            if summary_note.exists():
                continue
            summary_note.write_text(_render_note({
                "id": f"legacy_{note_name.replace('-', '_').replace('.md', '')}", "kind": "derived_summary",
                "category": category, "status": "active", "confidence": 0.7, "importance": 0.7,
                "pinned": False, "source": "legacy_summary", "origin": "migration", "created_at": _now(),
                "updated_at": _now(), "tags": ["迁移", "摘要"],
            }, f"# {title}\n\n{summary}"), encoding="utf-8")
            created += 1

        relation = load_relationship_state()
        if isinstance(relation, dict):
            relation_path = vault / "03-关系与成长" / "relationship-state.md"
            if not relation_path.exists():
                public = {key: relation.get(key) for key in ("familiarity", "eligible_turn_count", "preferences", "updated_at") if key in relation}
                body = "# 关系状态\n\n" + json.dumps(public, ensure_ascii=False, indent=2)
                relation_path.write_text(_render_note({
                    "id": "relationship_state", "kind": "relationship", "category": "relationship",
                    "status": "active", "confidence": 0.9, "importance": 0.8, "pinned": True,
                    "source": "legacy_relationship_state", "origin": "migration", "created_at": _now(),
                    "updated_at": _now(), "tags": ["关系", "迁移"],
                }, body), encoding="utf-8")
                created += 1
        if created:
            _append_changelog(vault, f"从桌宠现有提炼记忆迁移了 {created} 条；原始聊天记录未迁移。")
    result = sync_vault(config)
    result["migrated"] = created
    return result


def schedule_legacy_memory_sync(config: dict | None, *, delay_sec: float = 10.0) -> None:
    """Debounce legacy-core -> vault copying after async memory extraction."""
    global _LEGACY_SYNC_PENDING
    settings = get_settings(config)
    if not settings["enabled"] or not settings["auto_sync"]:
        return
    with _LOCK:
        if _LEGACY_SYNC_PENDING:
            return
        _LEGACY_SYNC_PENDING = True

    def _worker() -> None:
        global _LEGACY_SYNC_PENDING
        try:
            time.sleep(max(1.0, min(60.0, float(delay_sec))))
            migrate_existing_memories(config)
        except Exception:
            logger.debug("legacy memory -> Obsidian sync failed", exc_info=True)
        finally:
            with _LOCK:
                _LEGACY_SYNC_PENDING = False

    threading.Thread(target=_worker, daemon=True, name="xinyu-knowledge-memory-sync").start()


def search_knowledge(config: dict | None, query: str, *, limit: int | None = None) -> list[dict[str, Any]]:
    settings = get_settings(config)
    if not settings["enabled"] or not str(query or "").strip():
        return []
    vault = _vault(settings)
    if _index_needs_refresh(vault):
        # Manual Obsidian edits become visible on the next relevant turn.  The
        # scan reads filenames/mtimes only until an edit is detected.
        sync_vault(config)
    with _LOCK:
        items = _load_index(vault)
    query_tokens = _tokens(query)
    if not query_tokens:
        return []
    query_vectors = _embed(settings, [query])
    query_vector = query_vectors[0] if query_vectors else []
    scored = []
    for item in items:
        meta = item.get("meta") if isinstance(item.get("meta"), dict) else {}
        if str(meta.get("status", "active")) in {"archived", "deleted", "rejected"}:
            continue
        if str(meta.get("superseded_by", "")).strip():
            continue
        item_tokens = set(item.get("tokens") or [])
        overlap = len(query_tokens & item_tokens)
        vector = item.get("embedding") if isinstance(item.get("embedding"), list) else []
        semantic = sum(a * b for a, b in zip(query_vector, vector)) if query_vector and vector else 0.0
        if overlap <= 0 and semantic < 0.42:
            continue
        try:
            importance = float(meta.get("importance", 0.5))
            confidence = float(meta.get("confidence", 0.5))
        except (TypeError, ValueError):
            importance, confidence = 0.5, 0.5
        score = overlap * 4 + semantic * 5 + importance + confidence + (1.0 if meta.get("pinned") else 0.0)
        scored.append((score, item))
    scored.sort(key=lambda row: (row[0], row[1].get("mtime_ns", 0)), reverse=True)
    return [item for _score, item in scored[: limit or settings["prompt_max_items"]]]


def build_prompt_block(config: dict | None, user_message: str, safe_history: list[dict[str, Any]] | None = None) -> str:
    settings = get_settings(config)
    history = safe_history if isinstance(safe_history, list) else []
    query = " ".join([str(user_message or "")] + [
        str(row.get("content", "")) for row in history[-3:] if isinstance(row, dict) and row.get("role") == "user"
    ])
    chosen = search_knowledge(config, query)
    if not chosen:
        return ""
    remaining = settings["prompt_max_chars"]
    lines = []
    for item in chosen:
        meta = item.get("meta") if isinstance(item.get("meta"), dict) else {}
        status = str(meta.get("status", "active"))
        prefix = "待核实资料" if status == "unverified" or "待核实" in str(item.get("path", "")) else "本地知识"
        text = re.sub(r"\s+", " ", str(item.get("text", ""))).strip()
        text = re.sub(r"^#[^\r\n]*(?:\r?\n)+", "", text, count=1).strip()
        if not text:
            continue
        take = min(150, remaining)
        line = f"- {prefix}：{text[:take]}"
        if len(line) > remaining + 12:
            line = line[: remaining + 12]
        lines.append(line)
        remaining -= min(len(text), take)
        if remaining <= 0:
            break
    if not lines:
        return ""
    return "与当前话题相关的本地知识（待核实内容不可当作确定事实）：\n" + "\n".join(lines)


def status(config: dict | None) -> dict[str, Any]:
    settings = get_settings(config)
    vault = _vault(settings)
    indexed = _load_index(vault) if vault.exists() else []
    return {
        "ok": True,
        "enabled": settings["enabled"],
        "vault_path": str(vault),
        "exists": vault.exists(),
        "indexed_items": len(indexed),
        "background_learning_enabled": settings["background_learning_enabled"],
        "search_mode": "local_semantic_plus_keyword" if any(item.get("embedding") for item in indexed) else "local_keyword_index",
    }


def save_desktop_observation(
    config: dict | None,
    *,
    text: str,
    importance: float = 0.8,
) -> dict[str, Any]:
    """Persist one model-selected durable observation, never a raw screenshot."""
    settings = get_settings(config)
    if not settings["enabled"]:
        return {"ok": False, "error": "knowledge_base_disabled"}
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip()[:600]
    if len(cleaned) < 12:
        return {"ok": False, "error": "observation_too_short"}
    if re.search(
        r"(?i)(password|passwd|api[_-]?key|access[_-]?token|secret|验证码|密码|密钥)\s*[:=：]",
        cleaned,
    ):
        return {"ok": False, "error": "sensitive_observation"}
    try:
        score = max(0.0, min(1.0, float(importance)))
    except (TypeError, ValueError):
        score = 0.8
    vault = _vault(settings)
    ensure_vault(config)
    digest = hashlib.sha256(cleaned.lower().encode("utf-8")).hexdigest()[:16]
    folder = _folder_for("project_context")
    path = vault / folder / f"desktop-{digest}-{_safe_slug(cleaned[:36], '桌面经历')}.md"
    created = False
    with _LOCK:
        if not path.exists():
            now = _now()
            meta = {
                "id": f"desktop_{digest}",
                "kind": "episodic",
                "category": "project_context",
                "status": "active",
                "confidence": 0.72,
                "importance": round(score, 3),
                "pinned": False,
                "source": "desktop_observation",
                "origin": "model_selected_visual_memory",
                "importance_reason": "selected_by_companion_from_screen_context",
                "created_at": now,
                "updated_at": now,
                "tags": ["桌面观察", "自主记忆"],
            }
            path.write_text(
                _render_note(meta, f"# 桌面经历\n\n{cleaned}"),
                encoding="utf-8",
            )
            created = True
    sync_vault(config)
    return {"ok": True, "created": created, "path": str(path)}


def save_external_note(
    config: dict | None,
    *,
    title: str,
    text: str,
    source_url: str,
    verified: bool = False,
) -> dict[str, Any]:
    """Store a bounded, provenance-tagged external fact without trusting it blindly."""
    settings = get_settings(config)
    if not settings["enabled"]:
        return {"ok": False, "error": "knowledge_base_disabled"}
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip()[:1800]
    if len(cleaned) < 24 or not re.fullmatch(r"https://[^\s]+", str(source_url or "").strip()):
        return {"ok": False, "error": "invalid_external_note"}
    vault = _vault(settings)
    ensure_vault(config)
    status_value = "active" if verified else "unverified"
    folder = "05-外部知识" if verified else "06-待核实"
    digest = hashlib.sha256(f"{source_url}\n{cleaned}".encode("utf-8")).hexdigest()[:16]
    path = vault / folder / f"web-{digest}-{_safe_slug(title, '网络资料')}.md"
    if not path.exists():
        meta = {
            "id": f"web_{digest}", "kind": "external_knowledge", "category": "external",
            "status": status_value, "confidence": 0.75 if verified else 0.35,
            "importance": 0.45, "pinned": False, "source": "web_learning",
            "origin": source_url, "created_at": _now(), "updated_at": _now(), "tags": ["网络学习"],
        }
        path.write_text(_render_note(meta, f"# {_safe_slug(title, '网络资料')}\n\n{cleaned}\n\n来源：{source_url}"), encoding="utf-8")
        _append_changelog(vault, f"后台学习保存了待核实网络资料：{_safe_slug(title, '网络资料')}。")
    return sync_vault(config)


def run_background_learning_once(config: dict | None) -> dict[str, Any]:
    """Fetch one small public learning item.  No search key and no user data leave the PC."""
    settings = get_settings(config)
    if not settings["enabled"] or not settings["background_learning_enabled"]:
        return {"ok": False, "error": "background_learning_disabled"}
    sources = [
        "https://zh.wikipedia.org/api/rest_v1/page/random/summary",
        "https://api.openalex.org/works?sample=1&per-page=1",
    ]
    source_url = sources[int(time.time() // 3600) % len(sources)]
    request = urllib.request.Request(
        source_url,
        headers={"User-Agent": "XinyuDesktopPetKnowledge/1.0"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read(128 * 1024)
        payload = json.loads(raw.decode("utf-8", errors="replace"))
    except Exception as exc:
        logger.info("background knowledge fetch failed: %s", exc)
        return {"ok": False, "error": "public_source_unavailable"}
    if "results" in payload:
        work = (payload.get("results") or [{}])[0]
        title = str(work.get("title") or "OpenAlex 资料").strip()
        extract = str(work.get("abstract_inverted_index") or "").strip()[:1200]
        page = str(work.get("doi") or work.get("id") or "").strip()
        page = page if page.startswith("https://") else "https://api.openalex.org/works"
    else:
        title = str(payload.get("title") or "网络资料").strip(); extract = str(payload.get("extract") or "").strip()
        page = str(((payload.get("content_urls") or {}).get("desktop") or {}).get("page") or "").strip()
    return save_external_note(config, title=title, text=extract, source_url=page, verified=False)


def start_background_learner(config: dict | None) -> None:
    """Start a deliberately low-frequency learner only after explicit opt-in."""
    global _LEARNER_STARTED
    settings = get_settings(config)
    if not settings["enabled"] or not settings["background_learning_enabled"]:
        return
    with _LOCK:
        if _LEARNER_STARTED:
            return
        _LEARNER_STARTED = True

    def _worker() -> None:
        while True:
            run_background_learning_once(config)
            low = min(settings["background_min_interval_hours"], settings["background_max_interval_hours"])
            high = max(settings["background_min_interval_hours"], settings["background_max_interval_hours"])
            time.sleep(random.uniform(low, high) * 3600)

    threading.Thread(target=_worker, daemon=True, name="xinyu-knowledge-learner").start()
