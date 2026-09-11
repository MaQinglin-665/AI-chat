"""Explicit live acceptance using synthetic messages only; no memories or tools."""
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from config import load_config
from galgame_context import sanitize_galgame_context, build_galgame_personality_prompt
from galgame_director import build_direction_prompt, directed_stream, direction_llm_config
from llm_streaming import iter_openai_chat_stream, iter_openai_responses_stream

CASES = [
    (character, "comfort", "我今天面试失败了，很难过。别说太棒了，也别劝我立刻振作。明天或许去公园，今天先待在房间里。", None)
    for character in ("deepblue", "claude", "gpt")
] + [
    ("deepblue", "arrival", "现在是春天的白天，我们已经走进公园，在长椅边坐下了。你想说什么？", "park-spring"),
    ("claude", "quoted_arrival", "小说里写着‘我们已经到了公园’，但我们现在还在房间里。聊聊这句话吧。", None),
]


def main():
    if "--run" not in sys.argv:
        raise SystemExit("Use --run to make five live requests to the configured model.")
    llm = direction_llm_config(load_config().get("llm", {}))
    if llm.get("provider") not in {"openai", "openai-compatible", "openai_compatible"}:
        raise SystemExit("This acceptance runner currently requires an OpenAI-compatible provider.")
    llm["stream_timeout_sec"] = 45
    llm["max_tokens"] = 1500
    results = []
    for character, name, message, expected_scene in CASES:
        context = sanitize_galgame_context({"enabled": True, "character": character, "local_hour": 10})
        cfg = {"_galgame_context": context}
        prompt = build_galgame_personality_prompt(cfg) + build_direction_prompt(context)
        messages = [{"role": "system", "content": prompt}, {"role": "user", "content": message}]
        started = time.monotonic()
        result = {"character": character, "case": name, "input": message, "expected_scene": expected_scene}
        try:
            parts = []
            for part in directed_stream([lambda: iter_openai_chat_stream(llm, messages),
                                         lambda: iter_openai_responses_stream(llm, messages)], context, message, cfg):
                if not parts: result["first_sentence_seconds"] = round(time.monotonic() - started, 2)
                parts.append(part)
            result["reply"] = "".join(parts)
            result["segments"] = cfg["_galgame_stream_segments"]
            scenes = [s["scene"] for s in result["segments"] if s["scene"]]
            result["scene_check"] = scenes == ([expected_scene] if expected_scene else [])
            result["ok"] = True
        except Exception as exc:
            # Never put endpoint URLs, auth configuration or raw upstream errors into the report.
            result["ok"] = False
            result["error_type"] = type(exc).__name__
        result["elapsed_seconds"] = round(time.monotonic() - started, 2)
        results.append(result)
        path = ROOT / "docs" / "galgame-live-acceptance.json"
        path.write_text(json.dumps({"model": llm.get("model"), "synthetic_only": True, "results": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
