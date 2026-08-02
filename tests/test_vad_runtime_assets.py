from pathlib import Path

import app


def test_optional_vad_runtime_asset_mapping_is_allowlisted():
    vad = app._resolve_optional_vad_runtime_asset("/runtime/vad/bundle.min.js")
    model = app._resolve_optional_vad_runtime_asset("/runtime/vad/silero_vad_v5.onnx")
    ort = app._resolve_optional_vad_runtime_asset(
        "/runtime/vad/ort/ort-wasm-simd-threaded.wasm?cache=1"
    )

    assert vad == app.VAD_WEB_DIST_DIR / "bundle.min.js"
    assert model == app.VAD_WEB_DIST_DIR / "silero_vad_v5.onnx"
    assert ort == app.ORT_WEB_DIST_DIR / "ort-wasm-simd-threaded.wasm"


def test_optional_vad_runtime_asset_mapping_rejects_unknown_and_traversal_paths():
    assert app._resolve_optional_vad_runtime_asset("/runtime/vad/../../config.json") is None
    assert app._resolve_optional_vad_runtime_asset("/runtime/vad/ort/../package.json") is None
    assert app._resolve_optional_vad_runtime_asset("/runtime/vad/ort/unknown.wasm") is None
    assert app._resolve_optional_vad_runtime_asset("/node_modules/onnxruntime-web/dist/ort.wasm.min.js") is None


def test_optional_vad_runtime_asset_paths_remain_inside_dependency_directories():
    paths = [
        app._resolve_optional_vad_runtime_asset("/runtime/vad/vad.worklet.bundle.min.js"),
        app._resolve_optional_vad_runtime_asset("/runtime/vad/ort/ort.wasm.min.js"),
    ]

    assert all(isinstance(path, Path) for path in paths)
    assert paths[0].parent == app.VAD_WEB_DIST_DIR
    assert paths[1].parent == app.ORT_WEB_DIST_DIR
