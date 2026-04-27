import importlib

import pytest


SMOKE_MODULES = (
    "config",
    "memory",
    "llm_client",
    "tts",
    "tools",
    "app",
)


@pytest.mark.parametrize("module_name", SMOKE_MODULES)
def test_module_import_smoke(module_name):
    module = importlib.import_module(module_name)
    assert module is not None
