from subprocess import CompletedProcess, TimeoutExpired

from scripts import check_python_dependencies as dependencies


def test_conflicting_metadata_stops_before_imports(monkeypatch):
    calls = []

    def run(command, **kwargs):
        calls.append(command)
        return CompletedProcess(command, 1)

    monkeypatch.setattr(dependencies.subprocess, "run", run)
    assert dependencies.check_dependencies() == 1
    assert len(calls) == 1
    assert calls[0][-3:] == ["-m", "pip", "check"]


def test_broken_native_import_is_not_reported_as_installed_success(monkeypatch, capsys):
    monkeypatch.setattr(dependencies, "RUNTIME_IMPORTS", ("broken", "healthy"))

    def run(command, **kwargs):
        if command[-1] == "import broken":
            return CompletedProcess(command, 1, "", "ImportError: DLL load failed")
        return CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(dependencies.subprocess, "run", run)
    assert dependencies.check_dependencies() == 1
    output = capsys.readouterr().out
    assert "[FAIL] Import failed: broken" in output
    assert "[OK] Import: healthy" in output


def test_import_timeout_is_bounded_and_dev_runner_is_checked(monkeypatch, capsys):
    monkeypatch.setattr(dependencies, "RUNTIME_IMPORTS", ("slow",))
    calls = []

    def run(command, **kwargs):
        calls.append(command[-1])
        if command[-1] == "import slow":
            assert kwargs["timeout"] == 120
            assert kwargs["env"]["HF_HUB_OFFLINE"] == "1"
            raise TimeoutExpired(command, 120)
        return CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(dependencies.subprocess, "run", run)
    assert dependencies.check_dependencies(dev=True) == 1
    assert "import pytest" in calls
    assert "[FAIL] Import timed out: slow" in capsys.readouterr().out
