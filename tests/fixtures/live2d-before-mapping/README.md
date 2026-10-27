# Exact pre-mapping reference

These three JavaScript files are the original Git blobs from commit `b39ab99`, after the separate application Core6 upgrade and before mapping/runtime edits. `provenance.json` pins each source and Core SHA256. Do not update these sources when changing production code.

`tests/test_live2d_mapping_sequence.js` executes both implementations with the shipped Core6 WASM and CubismModel, comparing complete ordered API calls and every frame's parameter/part values using strict deep equality. `scripts/qa_live2d_adapter.cjs` additionally compares the real Pixi/model update pipeline and local-only screenshots.

The reference contains project source only, no model or third-party runtime copy.
