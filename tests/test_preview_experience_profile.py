import json
import subprocess
from pathlib import Path

from companion_dialogue_policy import build_model_direct_dialogue_policy
from config import sanitize_client_config


ROOT = Path(__file__).resolve().parents[1]
PREVIEW_CONFIG_PATH = ROOT / "config.preview.example.json"
APPLY_SCRIPT_PATH = ROOT / "scripts" / "apply-preview-experience-config.ps1"


def _load_preview_config():
    return json.loads(PREVIEW_CONFIG_PATH.read_text(encoding="utf-8"))


def test_preview_profile_activates_the_intended_personal_companion_contract():
    cfg = _load_preview_config()

    assert cfg["assistant_reply_language"] == "en"
    assert cfg["character_runtime"]["model_direct_reply"] is True
    assert cfg["companion_turn"]["enabled"] is True
    assert cfg["relationship_state"]["enabled"] is True
    assert cfg["conversation_mode"]["chat_stream_enabled"] is True

    prompt = cfg["assistant_prompt"]
    assert "The user may write in Chinese or English" in prompt
    assert "natural spoken English by default" in prompt
    assert "Do not say you are an AI unless directly asked" not in prompt
    assert "be candid that you are AI" in prompt

    policy = build_model_direct_dialogue_policy(cfg)
    assert "The user may write in Chinese or English" in policy
    assert "reply in natural spoken English by default" in policy


def test_preview_profile_keeps_client_visible_safety_defaults():
    cfg = _load_preview_config()
    client_cfg = sanitize_client_config(cfg)

    assert cfg["tts"]["provider"] == "browser"
    assert cfg["tts"]["allow_browser_fallback"] is True
    assert cfg["observe"]["attach_mode"] == "manual"
    assert cfg["observe"]["allow_auto_chat"] is False
    assert cfg["observe"]["auto_chat_enabled"] is False
    assert cfg["tools"] == {"enabled": False, "allow_shell": False}
    assert client_cfg["character_runtime"]["model_direct_reply"] is True
    assert client_cfg["companion_turn"]["enabled"] is True
    assert client_cfg["relationship_state"]["enabled"] is True


def test_preview_apply_script_preserves_credentials_while_merging_the_profile():
    script = APPLY_SCRIPT_PATH.read_text(encoding="utf-8")

    for path in ("llm.provider", "llm.base_url", "llm.model", "llm.api_key_env", "llm.api_key"):
        assert f'"{path}"' in script
    assert "Merge-PreviewObject $local $preview" in script
    assert "No API key was written by this script." in script


def test_preview_apply_script_merges_the_current_experience_without_overwriting_llm(tmp_path):
    local_path = tmp_path / "config.local.json"
    local_path.write_text(
        json.dumps(
            {
                "llm": {
                    "provider": "openai-compatible",
                    "base_url": "http://127.0.0.1:9999/v1",
                    "model": "personal-model",
                    "api_key_env": "PERSONAL_LLM_KEY",
                    "api_key": "must-stay-local",
                },
                "tools": {"enabled": True, "allow_shell": True},
            }
        ),
        encoding="utf-8",
    )

    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(APPLY_SCRIPT_PATH),
            "-PreviewConfigPath",
            str(PREVIEW_CONFIG_PATH),
            "-LocalConfigPath",
            str(local_path),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )

    assert proc.returncode == 0, proc.stderr or proc.stdout
    merged = json.loads(local_path.read_text(encoding="utf-8-sig"))
    assert merged["llm"] == {
        "provider": "openai-compatible",
        "base_url": "http://127.0.0.1:9999/v1",
        "model": "personal-model",
        "api_key_env": "PERSONAL_LLM_KEY",
        "api_key": "must-stay-local",
    }
    assert merged["character_runtime"]["model_direct_reply"] is True
    assert merged["companion_turn"]["enabled"] is True
    assert merged["relationship_state"]["enabled"] is True
    assert merged["tools"] == {"enabled": False, "allow_shell": False}
