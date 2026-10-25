"""Explicit local-only browser experience; never load the daily private configuration."""
import argparse
import copy
import json
import os
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--codex-path", required=True)
    parser.add_argument("--port", type=int, default=8124)
    args = parser.parse_args()
    data = Path(args.data_dir).resolve()
    if data == REPO or REPO in data.parents or data == Path.home() or data == Path(data.anchor):
        parser.error("Use a new repository-external test directory")
    if data.exists():
        parser.error("Test directory already exists; choose a new one to avoid daily data")
    if not os.environ.get("DEEPSEEK_API_KEY"):
        parser.error("DEEPSEEK_API_KEY environment variable is required")
    data.mkdir(parents=True)
    work = data / "workspace"
    work.mkdir()
    for name, text in {"hello.txt": "Hello, test world.\n", "notes.txt": "Disposable sample notes.\n",
                       "sales.csv": "item,count\napple,3\n", "colors.csv": "name,hex\nblue,0000ff\n",
                       "README.md": "# Test workspace\nSynthetic files only.\n", "ideas.md": "# Ideas\nOrganize these samples.\n"}.items():
        (work / name).write_text(text, encoding="utf-8")
    os.chdir(data)
    sys.path.insert(0, str(REPO))
    import config
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    # Redirect before importing any modules which derive persistent paths from config.
    config.ROOT_DIR = data
    for attr, name in {"CONFIG_PATH": "config.json", "LOCAL_CONFIG_PATH": "config.local.json",
                       "EXAMPLE_CONFIG_PATH": "config.example.json", "ENV_PATH": ".env",
                       "MEMORY_PATH": "memory.json", "MEMORY_SUMMARY_PATH": "memory_summary.json"}.items():
        setattr(config, attr, data / name)
    cfg.update(onboarding_completed=True, model_path="/models/hiyori_pro_t11/hiyori_pro_t11.model3.json")
    cfg["server"].update(host="127.0.0.1", port=args.port, require_api_token=False, open_browser=False)
    cfg["llm"].update(provider="openai-compatible", base_url="https://api.deepseek.com", model="deepseek-flash", api_key="", api_key_env="DEEPSEEK_API_KEY")
    cfg["tts"].update(provider="browser", auto_start_local_provider=False, gpt_sovits_fallback_ref_audio_path="")
    cfg["asr"].update(enabled=False, sensevoice_service_enabled=False, sensevoice_service_managed=False)
    cfg["observe"].update(enabled=False, auto_chat=False)
    cfg["tools"].update(enabled=False, allow_shell=False, workspace_root=str(work))
    cfg["memory"].update(mem0_enabled=False, mem0_qdrant_path=str(data / ".mem0/qdrant"), mem0_history_db_path=str(data / ".mem0/history.db"))
    cfg["knowledge_base"].update(enabled=False, auto_sync=False, background_learning_enabled=False, vault_path=str(data / "vault"))
    cfg["external_agent"].update(enabled=True, allowed_roots=[str(work)], codex_path=str(Path(args.codex_path).resolve()),
                                 codex_home=str(data / "codex-home"), api_key_env="DEEPSEEK_API_KEY")
    config.DEFAULT_CONFIG = copy.deepcopy(cfg)
    config.load_config = lambda: copy.deepcopy(cfg)
    import app
    import tools
    import memory
    import relationship_state
    import agent_actions
    import emotion
    import shared_experience
    import desktop_agent
    tools.GENERATED_IMAGE_DIR = data / "generated_images"
    persistence = {}
    for module in (memory, relationship_state, agent_actions, emotion, shared_experience, desktop_agent):
        for name, value in vars(module).items():
            if isinstance(value, Path) and (name.endswith("_PATH") or name in {"MEM0_DIR", "MEM0_QDRANT_DIR", "LOCAL_DIR"}):
                resolved = value.resolve()
                if data not in resolved.parents:
                    raise RuntimeError(f"Non-isolated persistence path: {module.__name__}.{name}")
                persistence[f"{module.__name__}.{name}"] = str(resolved)
    try:
        server, url, _ = app.build_server()
    except Exception as exc:
        if getattr(exc, "code", "") != "port_in_use":
            raise
        cfg["server"]["port"] = 0
        server, _, _ = app.build_server()
        url = f"http://127.0.0.1:{server.server_address[1]}"
    metadata = {"pid": os.getpid(), "url": url, "workspace": str(work), "data_dir": str(data),
                "stop_command": f"taskkill /PID {os.getpid()} /T /F", "persistence_paths": persistence}
    (data / "instance.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata), flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
