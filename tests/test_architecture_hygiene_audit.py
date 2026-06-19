from pathlib import Path

from scripts import audit_architecture_hygiene as audit


def test_collect_source_file_stats_excludes_dependency_dirs(tmp_path):
    (tmp_path / "app.py").write_text("print('hi')\n", encoding="utf-8")
    (tmp_path / "web").mkdir()
    (tmp_path / "web" / "chat.js").write_text("const x = 1;\nconst y = 2;\n", encoding="utf-8")
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "ignored.js").write_text("ignored\n", encoding="utf-8")
    (tmp_path / "models").mkdir()
    (tmp_path / "models" / "ignored.json").write_text("{}\n", encoding="utf-8")

    stats = audit.collect_source_file_stats(tmp_path)

    paths = {item.path for item in stats}
    assert paths == {"app.py", "web/chat.js"}
    assert [item.path for item in stats] == ["web/chat.js", "app.py"]


def test_find_sensitive_tracked_paths_allows_tts_ref_readme_only():
    sensitive = audit.find_sensitive_tracked_paths(
        [
            "README.md",
            "config.json",
            "tts_ref/README.md",
            "tts_ref/private.wav",
            "memory_profile.json",
            "certs/client.pem",
        ]
    )

    assert sensitive == [
        "certs/client.pem",
        "config.json",
        "memory_profile.json",
        "tts_ref/private.wav",
    ]


def test_parse_worktree_porcelain_handles_multiple_entries():
    parsed = audit.parse_worktree_porcelain(
        "\n".join(
            [
                "worktree C:/repo",
                "HEAD abc",
                "branch refs/heads/main",
                "",
                "worktree C:/repo-feature",
                "HEAD def",
                "branch refs/heads/codex/feature",
                "",
            ]
        )
    )

    assert parsed == [
        {"path": "C:/repo", "head": "abc", "branch": "refs/heads/main"},
        {
            "path": "C:/repo-feature",
            "head": "def",
            "branch": "refs/heads/codex/feature",
        },
    ]


def test_build_report_shapes_largest_files_without_git(monkeypatch, tmp_path):
    (tmp_path / "small.py").write_text("a = 1\n", encoding="utf-8")
    (tmp_path / "large.py").write_text("a = 1\nb = 2\n", encoding="utf-8")

    monkeypatch.setattr(audit, "collect_tracked_paths", lambda _root: ["config.json"])
    monkeypatch.setattr(audit, "collect_ignored_paths", lambda _root, _limit: ["tmp.log"])

    report = audit.build_report(tmp_path, top=1, ignored_limit=1, include_siblings=False)

    assert report["source_file_count"] == 2
    assert report["largest_code_files"][0]["path"] == "large.py"
    assert report["sensitive_tracked_paths"] == ["config.json"]
    assert report["ignored_local_artifacts_sample"] == ["tmp.log"]
    assert "worktrees" not in report
