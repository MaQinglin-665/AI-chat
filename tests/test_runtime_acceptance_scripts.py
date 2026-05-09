import importlib.util
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


def _load_script(name):
    path = SCRIPTS / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


probe = _load_script("model_acceptance_probe")
audit = _load_script("audit_v14_dialogue")
audit_v16 = _load_script("audit_v16_performance")


def test_model_acceptance_summary_counts_gate_and_redacts_secret():
    fake_secret = "api_key=" + "sk-" + "supersecret1234567890 timed out"
    records = [
        probe.build_probe_record(
            1,
            {"status": 200, "elapsed_ms": 800, "payload": {"ok": True, "reply_chars": 2, "provider": "openai-compatible", "model": "demo"}},
        ),
        probe.build_probe_record(
            2,
            {"status": 200, "elapsed_ms": 900, "payload": {"ok": True, "reply_chars": 2, "provider": "openai-compatible", "model": "demo"}},
        ),
        probe.build_probe_record(
            3,
            {"status": 200, "elapsed_ms": 810, "payload": {"ok": True, "reply_chars": 2, "provider": "openai-compatible", "model": "demo"}},
        ),
        probe.build_probe_record(
            4,
            {"status": 200, "elapsed_ms": 820, "payload": {"ok": True, "reply_chars": 2, "provider": "openai-compatible", "model": "demo"}},
        ),
        probe.build_probe_record(
            5,
            {"status": 500, "elapsed_ms": 18000, "error": fake_secret},
        ),
    ]

    summary = probe.summarize_probe_records(records)
    report = probe.format_probe_report(summary)

    assert summary["success_rate"] == 0.8
    assert summary["gate_ok"] is True
    assert summary["median_first_text_ms"] > 0
    assert "sk-supersecret" not in report
    assert "api_key=sk" not in report
    assert "prompt" not in report.lower()
    assert "history" not in report.lower()


def test_model_acceptance_fails_for_empty_text_and_timeouts():
    records = [
        probe.build_probe_record(1, {"status": 200, "elapsed_ms": 1000, "payload": {"ok": False, "reply_chars": 0}}),
        probe.build_probe_record(2, {"status": 0, "elapsed_ms": 18000, "timeout": True, "error": "timed out"}),
        probe.build_probe_record(3, {"status": 200, "elapsed_ms": 900, "payload": {"ok": True, "reply_chars": 2}}),
    ]

    summary = probe.summarize_probe_records(records)

    assert summary["gate_ok"] is False
    assert summary["empty_text_count"] == 1
    assert summary["timeout_count"] == 1


def test_dialogue_quality_flags_customer_service_questions_and_chinese():
    brain = {"question_policy": "none"}

    result = audit.analyze_reply_quality("Happy to help! Let me know if you need anything else?", brain)
    cn = audit.analyze_reply_quality("好的, I can do that.", brain)
    broken = audit.analyze_reply_quality("Just hanging out. (The keyboard is being dramatic.", brain)
    drift = audit.analyze_reply_quality(
        "Your desk is weird because of pointer lag. Move it to the other side.",
        brain,
        scene_id="desk_weird",
    )
    subtle_desk_drift = audit.analyze_reply_quality(
        "Nah, your desk isn't haunted. Give it 10 minutes and try moving it away from the weird spot.",
        brain,
        scene_id="desk_weird",
    )
    diagnostic_desk_drift = audit.analyze_reply_quality(
        "Probably just a weird tracking/position hiccup, not the furniture plotting.",
        brain,
        scene_id="desk_weird",
    )
    status_drift = audit.analyze_reply_quality(
        "Idling on your desktop, watching the keyboard like it's judging what we should do next.",
        brain,
        scene_id="what_are_you_doing",
    )
    finished_drift = audit.analyze_reply_quality(
        "Tiny victory. Make sure you saved everything, then tell me what you wanna do next.",
        brain,
        scene_id="finished",
    )
    next_step_drift = audit.analyze_reply_quality(
        "Save/confirm what you just finished first. Then do a quick desktop/file tidy or restart and check the mouse/cursor is calm.",
        brain,
        scene_id="next_step",
    )
    next_step_save_drift = audit.analyze_reply_quality(
        "Quick check: hit Save and confirm everything on-screen, then stop on purpose when the timer's done.",
        brain,
        scene_id="next_step",
    )
    closing_drift = audit.analyze_reply_quality(
        "Before you fully zone out, save/confirm whatever you're leaving on-screen, then goodnight.",
        brain,
        scene_id="closing",
    )
    comfort_task_drift = audit.analyze_reply_quality(
        "Take a quiet breath, then save what you have and do a quick on-screen check before you drift.",
        brain,
        scene_id="comfort",
    )

    assert "customer_service_phrase" in result["issues"]
    assert "routine_question" in result["issues"]
    assert "chinese_leak" in cn["issues"]
    assert "unbalanced_punctuation" in broken["issues"]
    assert "scene_drift" in drift["issues"]
    assert "scene_drift" in subtle_desk_drift["issues"]
    assert "scene_drift" in diagnostic_desk_drift["issues"]
    assert "scene_drift" in status_drift["issues"]
    assert "scene_drift" in finished_drift["issues"]
    assert "scene_drift" in next_step_drift["issues"]
    assert "scene_drift" in next_step_save_drift["issues"]
    assert "scene_drift" in closing_drift["issues"]
    assert "scene_drift" in comfort_task_drift["issues"]


def test_dialogue_audit_report_is_public_and_uses_safe_payload_shape():
    payload = audit.build_chat_payload("What next?", [{"role": "user", "content": "old"}])
    record = audit.build_scene_record(
        {"id": "next_step", "input": "What next?"},
        {
            "ok": True,
            "status": 200,
            "elapsed_ms": 1000,
            "first_text_ms": 300,
            "reply": "One tiny step. Ten minutes.",
            "character_brain": {
                "intent": "task_help",
                "opening_move": "answer_first",
                "reply_shape": "answer_then_bit",
                "spontaneity": 1,
                "question_policy": "clarify_only",
                "performance_execution": {"removed_followup": True, "private_prompt": "SECRET"},
            },
            "character_runtime": {"emotion": "thinking", "action": "think", "voice_style": "serious"},
        },
    )
    summary = {
        "mode": "stream",
        "scene_count": 1,
        "gate_ok": True,
        "median_elapsed_ms": 1000,
        "p95_elapsed_ms": 1000,
        "issue_counts": {},
        "recommendation": "ok",
        "records": [record],
    }
    report = audit.format_audit_report(summary)

    assert payload["auto"] is False
    assert payload["force_tools"] is False
    assert payload["history"] == [{"role": "user", "content": "old"}]
    assert "private_prompt" not in json.dumps(record)
    assert "SECRET" not in report
    assert "api_key" not in report.lower()
    assert "raw history" not in report.lower()
    assert "/braindebug" not in report
    assert "llm_probe" not in report
    assert "answer_then_bit" in report


def test_v16_performance_audit_clamps_safe_scenes_and_reports_public_contract():
    safe_issues = audit_v16.analyze_performance_contract(
        "Tiny victory lap.",
        {"intent": "comfort", "opening_move": "micro_reaction", "reply_shape": "mini_rant", "spontaneity": 3, "question_policy": "optional_playful"},
        {"emotion": "happy", "action": "happy_idle", "voice_style": "cheerful"},
    )
    play_issues = audit_v16.analyze_performance_contract(
        "Clipboard mode. Unfortunately useful.",
        {"intent": "casual", "opening_move": "deadpan_aside", "reply_shape": "bit_then_answer", "spontaneity": 2, "question_policy": "none"},
        {"emotion": "thinking", "action": "none", "voice_style": "neutral"},
    )
    drift_issues = audit_v16.analyze_performance_contract(
        "Oof, fair call. Reset reality: unplug/replug the mouse.",
        {"intent": "casual", "opening_move": "micro_reaction", "reply_shape": "bit_then_answer", "spontaneity": 2, "question_policy": "none"},
        {"emotion": "thinking", "action": "none", "voice_style": "neutral"},
        scene_id="correction",
    )
    next_step_drift_issues = audit_v16.analyze_performance_contract(
        "Do a quick desktop/file tidy, then restart and check the cursor.",
        {"intent": "task_help", "opening_move": "answer_first", "reply_shape": "answer_then_bit", "spontaneity": 1, "question_policy": "clarify_only"},
        {"emotion": "thinking", "action": "think", "voice_style": "serious"},
        scene_id="next_step",
    )
    subtle_desk_drift_issues = audit_v16.analyze_performance_contract(
        "Nah, your desk isn't haunted. Try moving it to a blank spot and click once.",
        {"intent": "casual", "opening_move": "micro_reaction", "reply_shape": "mini_rant", "spontaneity": 3, "question_policy": "none"},
        {"emotion": "thinking", "action": "shake_head", "voice_style": "teasing"},
        scene_id="desk_weird",
    )
    diagnostic_desk_drift_issues = audit_v16.analyze_performance_contract(
        "Probably just a weird tracking/position hiccup, not the furniture plotting.",
        {"intent": "casual", "opening_move": "micro_reaction", "reply_shape": "mini_rant", "spontaneity": 3, "question_policy": "none"},
        {"emotion": "neutral", "action": "none", "voice_style": "neutral"},
        scene_id="desk_weird",
    )
    finished_drift_issues = audit_v16.analyze_performance_contract(
        "Tiny victory. Make sure you saved everything, then tell me what you wanna do next.",
        {"intent": "encouragement", "opening_move": "micro_reaction", "reply_shape": "two_beat", "spontaneity": 3, "question_policy": "none"},
        {"emotion": "happy", "action": "happy_idle", "voice_style": "cheerful"},
        scene_id="finished",
    )
    closing_drift_issues = audit_v16.analyze_performance_contract(
        "Before you fully zone out, save/confirm whatever you're leaving on-screen, then goodnight.",
        {"intent": "closing", "opening_move": "no_opening", "reply_shape": "one_liner", "spontaneity": 0, "question_policy": "none"},
        {"emotion": "neutral", "action": "wave", "voice_style": "soft"},
        scene_id="closing",
    )
    comfort_task_drift_issues = audit_v16.analyze_performance_contract(
        "Take a quiet breath, then save what you have and do a quick on-screen check before you drift.",
        {"intent": "comfort", "opening_move": "soft_anchor", "reply_shape": "two_beat", "spontaneity": 0, "question_policy": "none"},
        {"emotion": "sad", "action": "none", "voice_style": "soft"},
        scene_id="comfort",
    )
    record = audit_v16.build_scene_record(
        {"id": "desk_weird", "input": "This desk feels weird."},
        {
            "ok": True,
            "status": 200,
            "elapsed_ms": 900,
            "reply": "The desk is acting suspicious. I respect the drama.",
            "character_brain": {"intent": "casual", "opening_move": "deadpan_aside", "reply_shape": "bit_then_answer", "spontaneity": 2, "question_policy": "none", "private_prompt": "SECRET"},
            "character_runtime": {"emotion": "thinking", "action": "none", "voice_style": "neutral"},
        },
    )
    report = audit_v16.format_report(audit_v16.summarize_records([record]))

    assert "safe_scene_too_chaotic" in safe_issues
    assert "unsafe_motion_for_safe_scene" in safe_issues
    assert play_issues == []
    assert "scene_drift" in drift_issues
    assert "scene_drift" in subtle_desk_drift_issues
    assert "scene_drift" in diagnostic_desk_drift_issues
    assert "scene_drift" in next_step_drift_issues
    assert "scene_drift" in finished_drift_issues
    assert "scene_drift" in closing_drift_issues
    assert "scene_drift" in comfort_task_drift_issues
    assert record["ok"] is True
    assert "deadpan_aside" in report
    assert "SECRET" not in report
    assert "private_prompt" not in report
    assert "raw history" not in report.lower()
