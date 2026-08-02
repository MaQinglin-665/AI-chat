from pathlib import Path


SERVICE_SOURCE = (
    Path(__file__).resolve().parents[1] / "scripts" / "sensevoice_service.py"
).read_text(encoding="utf-8")


def test_persistent_sensevoice_service_is_loopback_only_and_bounded():
    assert 'args.host not in {"127.0.0.1", "localhost", "::1"}' in SERVICE_SOURCE
    assert "MAX_AUDIO_BYTES = 16_000 * 2 * 35" in SERVICE_SOURCE
    assert "base64.b64decode(encoded, validate=True)" in SERVICE_SOURCE
    assert "threading.Lock()" in SERVICE_SOURCE


def test_persistent_sensevoice_service_defaults_to_quantized_onnx():
    assert 'parser.add_argument("--runtime", default="onnx"' in SERVICE_SOURCE
    assert "quantize=True" in SERVICE_SOURCE
    assert "intra_op_num_threads=2" in SERVICE_SOURCE
    assert 'backend["runtime"] = "onnx-int8"' in SERVICE_SOURCE


def test_persistent_sensevoice_service_does_not_expose_docs_or_store_audio():
    assert "docs_url=None" in SERVICE_SOURCE
    assert "redoc_url=None" in SERVICE_SOURCE
    assert ".write_bytes(" not in SERVICE_SOURCE
    assert "NamedTemporaryFile" not in SERVICE_SOURCE
