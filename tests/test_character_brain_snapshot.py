import importlib
import importlib.util


def _clean_text(value, max_len=180):
    text = " ".join(str(value or "").split())
    if len(text) > max_len:
        return text[: max(0, max_len - 3)].rstrip() + "..."
    return text


def _norm_choice(value, fallback):
    return _clean_text(value, 40).lower() or fallback


def _deps():
    return {
        "clean_text": _clean_text,
        "safe_int": lambda value, default=0: int(float(value)) if str(value or "").strip() else default,
        "experience_flags": lambda _profile: {
            "prefer_short": True,
            "avoid_generic": True,
            "lower_motion": False,
            "raise_motion": False,
            "voice_care": True,
        },
        "normalize_opening_move": lambda value: _norm_choice(value, "answer_first"),
        "normalize_reply_shape": lambda value: _norm_choice(value, "two_beat"),
        "normalize_question_policy": lambda value: _norm_choice(value, "none"),
        "input_modality": lambda _config: "voice",
        "public_asr_status": lambda _config: {"active": True, "needs_confirmation": True, "reason": "very_short"},
        "normalize_emotion": lambda value: _norm_choice(value, "neutral"),
        "normalize_action": lambda value: _norm_choice(value, "none"),
        "normalize_intensity": lambda value: _norm_choice(value, "normal"),
        "public_reply_quality": lambda value: value if isinstance(value, dict) else {"score": 100, "passed": True},
        "public_output_constraints": (
            lambda value: value if isinstance(value, dict) else {"allow_motion": True, "clarify_only_when_needed": False}
        ),
        "public_topic_reference": lambda value: value if isinstance(value, dict) else {},
        "public_barge_in_policy": lambda value: value if isinstance(value, dict) else {},
        "public_topic_stack": lambda value: value.get("topic_stack", []) if isinstance(value, dict) else [],
        "public_conversation_director": lambda value: value if isinstance(value, dict) else {},
        "public_improv_director": lambda value: value if isinstance(value, dict) else {},
        "public_stage_memory": lambda value: value if isinstance(value, dict) else {},
        "public_safety_clamp": lambda value: value if isinstance(value, dict) else {},
        "public_motion_director": lambda value: value if isinstance(value, dict) else {},
        "public_voice_director": lambda value: value if isinstance(value, dict) else {},
        "public_continuity_state": lambda value: value if isinstance(value, dict) else {},
        "constraints_for_intent": lambda _intent: {"allow_motion": True},
    }


def test_character_brain_snapshot_module_builds_safe_public_snapshot():
    assert importlib.util.find_spec("character_brain_snapshot") is not None
    snapshot_mod = importlib.import_module("character_brain_snapshot")

    snapshot = snapshot_mod.build_public_snapshot(
        {
            "intent": "task_help",
            "reply_style": "task",
            "style_beat": "one_tiny_step",
            "reaction_mode": "task_snap",
            "banter_level": 9,
            "opening_move": "answer_first",
            "reply_shape": "answer_then_bit",
            "spontaneity": 4,
            "question_policy": "clarify_only",
            "performance_bit": "clipboard_supervisor",
            "energy": "focused",
            "attention": "user",
            "relationship": "steady",
            "max_sentences": 99,
            "input_modality": "voice",
            "asr_status": {"raw_text": "secret", "final_text": "secret", "reason": "very_short"},
            "emotion": "thinking",
            "action": "think",
            "intensity": "high",
            "voice_style": "serious",
            "thought_burst": {"thought_type": "tiny_rant", "max_sentences": 4, "min_sentences": 2},
            "performance_execution": {
                "reply_shape": "one_liner",
                "question_policy": "none",
                "removed_followup": True,
                "quality_score": 120,
                "quality_issues": ["too long", "secret"],
            },
            "reply_quality": {"score": 100, "passed": True},
            "output_constraints": {"allow_motion": False, "clarify_only_when_needed": True},
            "conversation_director": {"mode": "voice_free_chat"},
            "directive": "private prompt text",
            "history_tail": "raw history",
            "intent_scores": {"task_help": 10},
        },
        experience_profile={"recent_feedback": [{"rating": "bad"}]},
        session_state={"topic_stack": [{"topic_id": "runtime"}], "stage_current_bit": "cursor_side_eye"},
        deps=_deps(),
    )

    assert snapshot["intent"] == "task_help"
    assert snapshot["banter_level"] == 3
    assert snapshot["spontaneity"] == 3
    assert snapshot["max_sentences"] == 8
    assert snapshot["performance_execution"]["quality_score"] == 100
    assert "shorter_replies" in snapshot["feedback_effects"]
    assert "less_generic_tone" in snapshot["feedback_effects"]
    assert "voice_style_care" in snapshot["feedback_effects"]
    assert "directive" not in snapshot
    assert "history_tail" not in snapshot
    assert "intent_scores" not in snapshot


def test_character_brain_snapshot_merges_runtime_metadata_with_brain_rules():
    assert importlib.util.find_spec("character_brain_snapshot") is not None
    snapshot_mod = importlib.import_module("character_brain_snapshot")

    merged = snapshot_mod.merge_runtime_metadata(
        {
            "emotion": "happy",
            "action": "happy_idle",
            "intensity": "high",
            "voice_style": "cheerful",
            "live2d_hint": "smile_soft",
        },
        {
            "intent": "comfort",
            "emotion": "sad",
            "action": "none",
            "intensity": "low",
            "voice_style": "soft",
            "output_constraints": {"allow_motion": False},
        },
        deps=_deps(),
        live2d_hints={"sad": "eyes_down", "neutral": "idle_relaxed"},
    )

    assert merged["emotion"] == "sad"
    assert merged["action"] == "none"
    assert merged["intensity"] == "low"
    assert merged["voice_style"] == "soft"
    assert merged["live2d_hint"] == "eyes_down"
    assert merged["brain_intent"] == "comfort"
