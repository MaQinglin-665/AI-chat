import json
from pathlib import Path

import pytest

from memory_store import tail_jsonl


@pytest.mark.parametrize("limit", [0, -1, "invalid", None])
def test_nonpositive_or_invalid_limit_returns_no_items(tmp_path, limit):
    path = tmp_path / "audit.jsonl"
    path.write_text('{"id":1}\n', encoding="utf-8")
    assert tail_jsonl(path, limit) == []


@pytest.mark.parametrize("newline", ["\n", "\r\n", "\r"])
@pytest.mark.parametrize("trailing", [True, False])
def test_tail_preserves_bom_unicode_and_physical_line_selection(tmp_path, newline, trailing):
    path = tmp_path / "audit.jsonl"
    lines = [json.dumps({"text": "测试" * 3000}, ensure_ascii=False),
             "", '{"id":2}', 'broken', '[1, 2]']
    path.write_bytes(("\ufeff" + newline.join(lines) + (newline if trailing else "")).encode("utf-8"))
    assert tail_jsonl(path, 3) == [{"id": 2}, {"raw": "broken"}, {"raw": "[1, 2]"}]
    assert tail_jsonl(path, 4) == tail_jsonl(path, 3)
    assert tail_jsonl(path, 10)[0] == {"text": "测试" * 3000}


def test_large_log_reads_only_tail_bytes(tmp_path, monkeypatch):
    path = tmp_path / "audit.jsonl"
    line = json.dumps({"text": "合成日志" * 20}, ensure_ascii=False).encode("utf-8") + b"\n"
    path.write_bytes(line * 50000 + b'{"id":1}\n{"id":2}\n')
    original_open = Path.open
    sizes = []

    class CountingReader:
        def __init__(self, stream):
            self.stream = stream

        def __enter__(self):
            return self

        def __exit__(self, *args):
            self.stream.close()

        def seek(self, *args):
            return self.stream.seek(*args)

        def tell(self):
            return self.stream.tell()

        def read(self, size=-1):
            assert 0 < size <= 8192, "recent entries must not read the entire log"
            data = self.stream.read(size)
            sizes.append(len(data))
            return data

    def tracked_open(target, *args, **kwargs):
        stream = original_open(target, *args, **kwargs)
        return CountingReader(stream) if target == path else stream

    monkeypatch.setattr(Path, "open", tracked_open)
    assert tail_jsonl(path, 2) == [{"id": 1}, {"id": 2}]
    assert sum(sizes) <= 8192


def test_empty_missing_and_unreadable_logs_are_safe(tmp_path):
    assert tail_jsonl(tmp_path / "missing.jsonl") == []
    path = tmp_path / "empty.jsonl"
    path.touch()
    assert tail_jsonl(path) == []
    assert tail_jsonl(tmp_path) == []


@pytest.mark.parametrize("trailing", ["", "\n", "\n\n"])
def test_long_final_records_and_blank_lines_match_existing_selection(tmp_path, trailing):
    path = tmp_path / "audit.jsonl"
    records = [{"text": "中文🙂" * 2000, "id": index} for index in range(4)]
    text = "\n".join(json.dumps(item, ensure_ascii=False) for item in records) + trailing
    path.write_bytes(text.encode("utf-8"))
    expected = [json.loads(line) for line in text.splitlines()[-2:] if line.strip()]
    assert tail_jsonl(path, 2) == expected
