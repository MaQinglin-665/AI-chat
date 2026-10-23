"""Exercise setup writes under Windows PowerShell 5.1, whose UTF8 includes a BOM."""

import json
import os
from pathlib import Path
import shutil
import subprocess

import pytest


ROOT = Path(__file__).resolve().parents[1]
pytestmark = pytest.mark.skipif(os.name != "nt", reason="Windows PowerShell setup")


def _powershell(*arguments):
    shell = shutil.which("powershell")
    if not shell:
        pytest.skip("Windows PowerShell is required")
    return subprocess.run(
        [shell, "-NoProfile", "-ExecutionPolicy", "Bypass", *arguments],
        capture_output=True, text=True, timeout=30, check=False,
    )


def test_preview_json_is_readable_without_bom_stripping(tmp_path):
    local = tmp_path / "local config.json"
    local.write_text(json.dumps({"llm": {"model": "keep-user-choice"}}), encoding="utf-8-sig")
    result = _powershell(
        "-File", str(ROOT / "scripts/apply-preview-experience-config.ps1"),
        "-LocalConfigPath", str(local),
    )
    assert result.returncode == 0, result.stdout + result.stderr
    config = json.loads(local.read_text(encoding="utf-8"))
    assert config["llm"]["model"] == "keep-user-choice"


def test_detected_model_config_is_readable_without_bom_stripping(tmp_path):
    model = tmp_path / "web/models/sample/sample.model3.json"
    model.parent.mkdir(parents=True)
    model.write_text("{}", encoding="utf-8")
    config = tmp_path / "config.json"
    config.write_text(json.dumps({"model_path": "/models/your_model/model3.json", "server": {"port": 8123}}), encoding="utf-8")
    # Load the actual bootstrap function without installing dependencies or
    # changing the real checkout's configuration.
    runner = tmp_path / "run.ps1"
    runner.write_text(
        "$ErrorActionPreference='Stop'\n"
        "$tokens=$null; $errors=$null\n"
        "$ast=[System.Management.Automation.Language.Parser]::ParseFile($args[0],[ref]$tokens,[ref]$errors)\n"
        "$fn=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Update-ModelPathIfObvious'},$true)\n"
        ". ([scriptblock]::Create($fn.Extent.Text))\n"
        "function Write-Ok($Message) {}\nfunction Write-WarnLine($Message) {}\nfunction Add-SummaryLine($Status,$Message) {}\n"
        "$RepoRoot=$args[1]; $SkipConfigUpdate=$false\nUpdate-ModelPathIfObvious\n",
        encoding="utf-8",
    )
    result = _powershell("-File", str(runner), str(ROOT / "scripts/bootstrap-first-run.ps1"), str(tmp_path))
    assert result.returncode == 0, result.stdout + result.stderr
    saved = json.loads(config.read_text(encoding="utf-8"))
    assert saved["model_path"] == "/models/sample/sample.model3.json"
    assert saved["server"]["port"] == 8123
