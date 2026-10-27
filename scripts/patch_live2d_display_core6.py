"""Reproduce the narrow Core 6 patch on the vendored PixiJS 6 display bundle.

Input is the existing pixi-live2d-display 0.4.0 bundle, never Cubism Core.
No download or model resource is required. Already-patched input is unchanged.
"""

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
UPSTREAM_SHA256 = "af1267e6d52759b245766c578d905bfa025b532d5c3cc727c370957c4409e21b"
VERSION = "0.4.0+ai-chat.core6.1"
ORIGINAL = "getDrawableRenderOrders(){return this._model.drawables.renderOrders}"
PATCHED = (
    "getDrawableRenderOrders(){"
    "if(this._model.drawables.renderOrders)return this._model.drawables.renderOrders;"
    "if(this._model.offscreens&&this._model.offscreens.count>0)"
    'throw new Error("Cubism 5.3 offscreen rendering is not supported by this PixiJS 6 compatibility build.");'
    "return this._model.renderOrders}"
)
HEADER = (
    "/*! pixi-live2d-display 0.4.0 + AI-chat Core 6 compatibility patch.\n"
    " * Copyright (c) 2020 Guan; MIT for the display integration.\n"
    " * Embedded Cubism Framework retains the Live2D Open Software License.\n"
    " * See THIRD_PARTY_NOTICES.md and scripts/patch_live2d_display_core6.py.\n"
    " * Cubism Core is separate and is not included by this patch. */\n"
)


def main():
    target = ROOT / "web/vendor/cubism4.min.js"
    original = target.read_bytes()
    text = original.decode("utf-8")
    if text.startswith(HEADER) and text.count(PATCHED) == 1 and f't.VERSION="{VERSION}"' in text:
        restored = text[len(HEADER):].replace(PATCHED, ORIGINAL).replace(f't.VERSION="{VERSION}"', 't.VERSION="0.4.0"')
        if hashlib.sha256(restored.encode("utf-8")).hexdigest() != UPSTREAM_SHA256:
            raise SystemExit("Unexpected changes in patched display bundle; refusing to proceed.")
        print("Display compatibility patch already applied.")
        return
    if hashlib.sha256(original).hexdigest() != UPSTREAM_SHA256:
        raise SystemExit("Unexpected display bundle; refusing to patch an unknown version.")
    if text.count(ORIGINAL) != 1 or text.count('t.VERSION="0.4.0"') != 1:
        raise SystemExit("Expected upstream method/version was not found exactly once.")
    text = HEADER + text.replace(ORIGINAL, PATCHED).replace('t.VERSION="0.4.0"', f't.VERSION="{VERSION}"')
    target.write_bytes(text.encode("utf-8"))
    print(f"Patched display bundle to {VERSION}; Cubism Core untouched.")


if __name__ == "__main__":
    main()
