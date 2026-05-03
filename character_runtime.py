from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Callable, Deque, Dict, List, Optional
import threading
import time
import json
import ast
import re


@dataclass(frozen=True)
class RuntimeEvent:
    """Input event for the character runtime."""

    event_type: str
    payload: Dict[str, Any] = field(default_factory=dict)
    source: str = "system"
    ts: float = field(default_factory=time.monotonic)


@dataclass(frozen=True)
class RuntimeDirective:
    """Output command emitted by the runtime scheduler."""

    channel: str
    name: str
    payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CharacterState:
    """Minimal runtime state snapshot."""

    phase: str = "idle"
    emotion: str = "neutral"
    voice_style: str = "neutral"
    motion_state: str = "idle"
    last_user_text: str = ""
    last_reply_text: str = ""
    last_event_type: str = ""
    last_user_at: Optional[float] = None
    last_reply_at: Optional[float] = None
    last_spoken_at: Optional[float] = None
    next_proactive_at: Optional[float] = None
    proactive_block_reason: str = "proactive_disabled"


SUPPORTED_EMOTIONS = {
    "neutral",
    "happy",
    "playful",
    "sad",
    "anxious",
    "angry",
    "surprised",
    "annoyed",
    "thinking",
}

SUPPORTED_ACTIONS = {
    "none",
    "wave",
    "nod",
    "shake_head",
    "think",
    "happy_idle",
    "surprised",
}

SUPPORTED_INTENSITY = {"low", "normal", "high"}

RUNTIME_METADATA_KEYS = ("emotion", "action", "intensity", "voice_style", "live2d_hint")
RUNTIME_METADATA_PAIR_RE = re.compile(
    r"[\"']?\b(emotion|action|intensity|voice_style|live2d_hint)\b[\"']?\s*[:=]\s*[\"']?([A-Za-z][A-Za-z0-9_-]*)[\"']?",
    flags=re.IGNORECASE,
)
RUNTIME_METADATA_ONLY_RE = re.compile(
    r"^[\s,;|{}()\[\]\"'`:=_-]*"
    r"(?:[\"']?\b(?:emotion|action|intensity|voice_style|live2d_hint)\b[\"']?"
    r"\s*(?::|=)?\s*[\"']?[A-Za-z0-9_-]*[\"']?[\s,;|{}()\[\]\"'`:=_-]*)+$",
    flags=re.IGNORECASE,
)

EMOTION_TO_LIVE2D_HINT = {
    "neutral": "idle_relaxed",
    "happy": "smile_soft",
    "playful": "smile_grin",
    "sad": "eyes_down",
    "anxious": "brow_worried",
    "angry": "brow_tense",
    "surprised": "eyes_wide",
    "annoyed": "brow_tense",
    "thinking": "idle_relaxed",
}


def normalize_emotion(emotion: Any) -> str:
    safe = str(emotion or "").strip().lower()
    return safe if safe in SUPPORTED_EMOTIONS else "neutral"


def normalize_action(action: Any) -> str:
    safe = str(action or "").strip().lower()
    if safe == "shake-head":
        safe = "shake_head"
    elif safe in {"thinking", "ponder", "pondering"}:
        safe = "think"
    return safe if safe in SUPPORTED_ACTIONS else "none"


def normalize_intensity(level: Any) -> str:
    safe = str(level or "").strip().lower()
    return safe if safe in SUPPORTED_INTENSITY else "normal"


def emotion_to_live2d_hint(emotion: Any) -> str:
    return EMOTION_TO_LIVE2D_HINT.get(normalize_emotion(emotion), EMOTION_TO_LIVE2D_HINT["neutral"])


def normalize_runtime_payload(payload: Any) -> Dict[str, Any]:
    """
    Normalize mixed payload inputs into a safe, predictable runtime payload.

    Supported inputs:
    - plain text string
    - JSON string (object only)
    - dict
    - None / empty / malformed JSON (safe fallback)
    """
    normalized: Dict[str, Any] = {
        "text": "",
        "emotion": "neutral",
        "action": "none",
        "intensity": "normal",
        "voice_style": "neutral",
    }

    if payload is None:
        return normalized

    raw: Any = payload
    if isinstance(payload, str):
        safe = payload.strip()
        if not safe:
            return normalized
        try:
            parsed = json.loads(safe)
            if isinstance(parsed, dict):
                raw = parsed
            else:
                raw = {"text": safe}
        except Exception:
            # Best-effort: tolerate JSON-like dict strings with trailing commas/single quotes.
            try:
                parsed = ast.literal_eval(safe)
                if isinstance(parsed, dict):
                    raw = parsed
                else:
                    raw = {"text": _extract_text_from_json_like(safe) or safe}
            except Exception:
                raw = {"text": _extract_text_from_json_like(safe) or safe}

    if isinstance(raw, dict):
        text = _extract_visible_text_from_dict(raw)
        text, inline_meta = _split_runtime_metadata_suffix(text)
        emotion = normalize_emotion(raw.get("emotion", "neutral"))
        action = normalize_action(raw.get("action", "none"))
        intensity = normalize_intensity(raw.get("intensity", "normal"))
        voice_style = str(raw.get("voice_style", "") or "").strip().lower() or emotion
        if inline_meta:
            emotion = normalize_emotion(raw.get("emotion", inline_meta.get("emotion", emotion)))
            if not raw.get("emotion"):
                emotion = normalize_emotion(inline_meta.get("emotion", emotion))
            if not raw.get("action"):
                action = normalize_action(inline_meta.get("action", action))
            if not raw.get("intensity"):
                intensity = normalize_intensity(inline_meta.get("intensity", intensity))
            if not raw.get("voice_style"):
                voice_style = str(inline_meta.get("voice_style", voice_style) or voice_style).strip().lower()
        normalized["text"] = text
        normalized["emotion"] = emotion
        normalized["action"] = action
        normalized["intensity"] = intensity
        normalized["voice_style"] = voice_style
        return normalized

    text, inline_meta = _split_runtime_metadata_suffix(str(raw).strip())
    normalized["text"] = text
    if inline_meta:
        normalized["emotion"] = normalize_emotion(inline_meta.get("emotion", "neutral"))
        normalized["action"] = normalize_action(inline_meta.get("action", "none"))
        normalized["intensity"] = normalize_intensity(inline_meta.get("intensity", "normal"))
        normalized["voice_style"] = str(
            inline_meta.get("voice_style") or normalized["emotion"] or "neutral"
        ).strip().lower()
    return normalized


def looks_like_runtime_metadata_only_text(text: str) -> bool:
    src = str(text or "").strip()
    if not src:
        return False
    visible, meta = _split_runtime_metadata_suffix(src)
    return not visible and (bool(meta) or _find_runtime_metadata_partial_tail_start(src) == 0)


def _split_runtime_metadata_suffix(text: str) -> tuple[str, Dict[str, str]]:
    src = str(text or "").strip()
    if not src:
        return "", {}

    matches = list(RUNTIME_METADATA_PAIR_RE.finditer(src))
    if not matches:
        partial_start = _find_runtime_metadata_partial_tail_start(src)
        if partial_start >= 0:
            return src[:partial_start].strip(), {}
        return src, {}

    for first in matches:
        start = _find_runtime_metadata_tail_start(src, first.start())
        tail = src[start:].strip()
        tail_pairs = list(RUNTIME_METADATA_PAIR_RE.finditer(tail))
        if not tail_pairs:
            continue
        remainder = RUNTIME_METADATA_PAIR_RE.sub("", tail)
        remainder = re.sub(
            r"\b(emotion|action|intensity|voice_style|live2d_hint)\b",
            "",
            remainder,
            flags=re.IGNORECASE,
        )
        remainder = re.sub(r"[\s,;|{}()\[\]\"'`。.!?！？:=-]+", "", remainder)
        if remainder:
            continue

        before = src[:start]
        starts_line = start == 0 or bool(re.search(r"[\r\n]\s*$", before))
        follows_sentence = bool(re.search(r"[.!?。！？]\s*$", before))
        if len(tail_pairs) < 2 and not starts_line and not follows_sentence:
            continue

        meta: Dict[str, str] = {}
        for pair in tail_pairs:
            key = str(pair.group(1) or "").strip().lower()
            value = str(pair.group(2) or "").strip().lower().replace("-", "_")
            if key in RUNTIME_METADATA_KEYS and value:
                meta[key] = value
        return before.strip(), meta

    return src, {}


def _find_runtime_metadata_tail_start(src: str, pair_start: int) -> int:
    safe_start = max(0, int(pair_start or 0))
    prev_newline = max(src.rfind("\n", 0, safe_start), src.rfind("\r", 0, safe_start))
    line_start = prev_newline + 1 if prev_newline >= 0 else 0
    if re.fullmatch(r"[\s,;|{}()\[\]\"'`:=_-]*", src[line_start:safe_start] or ""):
        return line_start

    before = src[:safe_start]
    sentence_tail = re.search(r"([.!?\u3002\uff01\uff1f])[\s,;|{}()\[\]\"'`:=_-]*$", before)
    if sentence_tail:
        return safe_start - len(sentence_tail.group(0)) + len(sentence_tail.group(1))
    return safe_start


def _find_runtime_metadata_partial_tail_start(src: str) -> int:
    key_re = re.compile(
        r"[\"']?\b(?:emotion|action|intensity|voice_style|live2d_hint)\b",
        flags=re.IGNORECASE,
    )
    for match in key_re.finditer(src):
        start = _find_runtime_metadata_tail_start(src, match.start())
        before = src[:start]
        starts_line = start == 0 or bool(re.search(r"[\r\n]\s*$", before))
        follows_sentence = bool(re.search(r"[.!?\u3002\uff01\uff1f]\s*$", before))
        if not starts_line and not follows_sentence:
            continue
        tail = src[start:].strip()
        if RUNTIME_METADATA_ONLY_RE.fullmatch(tail):
            return start
    return -1


def _extract_text_from_json_like(safe: str) -> str:
    src = str(safe or "").strip()
    if not src:
        return ""
    keys = ("text", "message", "content")
    for key in keys:
        # "text": "..."
        m = re.search(rf'"{key}"\s*:\s*"((?:\\.|[^"\\])*)"', src, flags=re.IGNORECASE)
        if m:
            raw = m.group(1)
            try:
                return str(json.loads(f"\"{raw}\"") or "").strip()
            except Exception:
                return raw.strip()
        # 'text': '...'
        m = re.search(rf"'{key}'\s*:\s*'((?:\\.|[^'\\])*)'", src, flags=re.IGNORECASE)
        if m:
            raw = m.group(1)
            try:
                return str(raw.encode("utf-8").decode("unicode_escape") or "").strip()
            except Exception:
                return raw.strip()
    return ""


def _extract_visible_text_from_dict(raw: Dict[str, Any]) -> str:
    for key in ("text", "message", "content", "output_text"):
        value = raw.get(key)
        text = _coerce_text_value(value)
        if text:
            return text

    # Responses-style payloads: {"output":[{"content":[{"text":"..."}]}]}
    output = raw.get("output")
    if isinstance(output, list):
        for item in output:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            text = _coerce_text_value(content)
            if text:
                return text
    return ""


def _coerce_text_value(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float, bool)):
        return str(value).strip()
    if isinstance(value, dict):
        for key in ("text", "content", "message"):
            nested = _coerce_text_value(value.get(key))
            if nested:
                return nested
        return ""
    if isinstance(value, list):
        parts: List[str] = []
        for item in value:
            text = _coerce_text_value(item)
            if text:
                parts.append(text)
        return " ".join(parts).strip()
    return ""


class CharacterRuntime:
    """
    Character runtime skeleton.

    This module is intentionally standalone and not wired into the main flow yet.
    It provides:
    - event queue
    - unified state transitions
    - low-interruption proactive gating
    - directive dispatch hooks for future integration
    """

    def __init__(
        self,
        *,
        low_interruption: bool = True,
        proactive_enabled: bool = False,
        proactive_cooldown_sec: float = 300.0,
        proactive_user_idle_sec: float = 120.0,
        proactive_assistant_idle_sec: float = 180.0,
        max_queue_size: int = 128,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._state = CharacterState()
        self._low_interruption = bool(low_interruption)
        self._proactive_enabled = bool(proactive_enabled)
        self._proactive_cooldown_sec = max(5.0, float(proactive_cooldown_sec))
        self._proactive_user_idle_sec = max(5.0, float(proactive_user_idle_sec))
        self._proactive_assistant_idle_sec = max(5.0, float(proactive_assistant_idle_sec))
        self._queue: Deque[RuntimeEvent] = deque(maxlen=max(8, int(max_queue_size)))
        self._hooks: Dict[str, List[Callable[[RuntimeDirective], None]]] = {}
        self._clock = clock
        self._lock = threading.Lock()

    def set_low_interruption(self, enabled: bool) -> None:
        with self._lock:
            self._low_interruption = bool(enabled)

    def set_proactive_enabled(self, enabled: bool) -> None:
        with self._lock:
            self._proactive_enabled = bool(enabled)
            if not self._proactive_enabled:
                self._state.proactive_block_reason = "proactive_disabled"

    def enqueue(self, event_type: str, payload: Optional[Dict[str, Any]] = None, source: str = "system") -> None:
        event = RuntimeEvent(event_type=event_type, payload=dict(payload or {}), source=source)
        with self._lock:
            self._queue.append(event)

    def register_hook(self, channel: str, callback: Callable[[RuntimeDirective], None]) -> None:
        safe_channel = str(channel or "").strip().lower()
        if not safe_channel:
            return
        with self._lock:
            self._hooks.setdefault(safe_channel, []).append(callback)

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "phase": self._state.phase,
                "emotion": self._state.emotion,
                "voice_style": self._state.voice_style,
                "motion_state": self._state.motion_state,
                "last_user_text": self._state.last_user_text,
                "last_reply_text": self._state.last_reply_text,
                "last_event_type": self._state.last_event_type,
                "last_user_at": self._state.last_user_at,
                "last_reply_at": self._state.last_reply_at,
                "last_spoken_at": self._state.last_spoken_at,
                "next_proactive_at": self._state.next_proactive_at,
                "low_interruption": self._low_interruption,
                "proactive_enabled": self._proactive_enabled,
                "proactive_block_reason": self._state.proactive_block_reason,
                "pending_events": len(self._queue),
            }

    def run_once(self) -> List[RuntimeDirective]:
        """
        Process one event from queue.
        If queue is empty, run a tick for proactive scheduling.
        """
        with self._lock:
            event = self._queue.popleft() if self._queue else RuntimeEvent(event_type="tick")
            directives = self._reduce_event_locked(event)
            hooks = {k: list(v) for k, v in self._hooks.items()}

        for directive in directives:
            for hook in hooks.get(directive.channel, []):
                try:
                    hook(directive)
                except Exception:
                    # Keep runtime resilient; integration errors should not break scheduler loop.
                    continue
        return directives

    def _reduce_event_locked(self, event: RuntimeEvent) -> List[RuntimeDirective]:
        self._state.last_event_type = event.event_type
        name = event.event_type.strip().lower()
        now = self._clock()

        if name == "user_message":
            text = str(event.payload.get("text", "")).strip()
            self._state.last_user_text = text
            self._state.last_user_at = now
            self._state.phase = "thinking"
            self._state.motion_state = "listening"
            self._state.proactive_block_reason = "recent_user_activity"
            return [RuntimeDirective("motion", "listen_ack", {"intensity": 0.3})]

        if name == "assistant_reply":
            normalized = normalize_runtime_payload(event.payload)
            text = normalized["text"]
            emotion = normalized["emotion"]
            voice_style = normalized["voice_style"]

            self._state.last_reply_text = text
            self._state.last_reply_at = now
            self._state.phase = "speaking"
            self._state.emotion = emotion
            self._state.voice_style = voice_style
            self._state.motion_state = "talking"
            self._state.proactive_block_reason = "phase_not_idle"
            return [
                RuntimeDirective("voice", "set_style", {"style": voice_style}),
                RuntimeDirective(
                    "motion",
                    "play_expression",
                    {"emotion": emotion, "live2d_hint": emotion_to_live2d_hint(emotion)},
                ),
            ]

        if name == "tts_finished":
            self._state.phase = "idle"
            self._state.motion_state = "idle"
            self._state.last_spoken_at = now
            self._state.next_proactive_at = now + self._proactive_cooldown_sec
            self._state.proactive_block_reason = "cooldown_active"
            return [RuntimeDirective("motion", "return_idle", {})]

        if name == "emotion_hint":
            emotion = normalize_emotion(event.payload.get("emotion", "neutral"))
            if emotion:
                self._state.emotion = emotion
                return [
                    RuntimeDirective(
                        "motion",
                        "play_expression",
                        {"emotion": emotion, "live2d_hint": emotion_to_live2d_hint(emotion)},
                    )
                ]
            return []

        if name == "tick":
            block_reason = self._get_proactive_block_reason(now)
            if block_reason:
                self._state.proactive_block_reason = block_reason
                return []
            next_at = self._state.next_proactive_at
            if next_at is not None and now < next_at:
                self._state.proactive_block_reason = "cooldown_active"
                return []
            self._state.next_proactive_at = now + self._proactive_cooldown_sec
            self._state.proactive_block_reason = ""
            return [RuntimeDirective("initiative", "proactive_checkin", {"reason": "cooldown_elapsed"})]

        return []

    def _get_proactive_block_reason(self, now: float) -> str:
        if not self._proactive_enabled:
            return "proactive_disabled"
        if self._low_interruption:
            return "low_interruption_enabled"
        if self._state.phase != "idle":
            return "phase_not_idle"
        last_user_at = self._state.last_user_at
        if last_user_at is not None and now - last_user_at < self._proactive_user_idle_sec:
            return "recent_user_activity"
        last_reply_at = self._state.last_reply_at
        if last_reply_at is not None and now - last_reply_at < self._proactive_assistant_idle_sec:
            return "recent_assistant_activity"
        next_at = self._state.next_proactive_at
        if next_at is not None and now < next_at:
            return "cooldown_active"
        return ""
