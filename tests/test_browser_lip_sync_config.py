"""Browser-only calibration stays bounded and contains no private settings."""
import pytest
from config import sanitize_client_config


@pytest.mark.parametrize("configured,expected", [(None, 120), (-1, 0), (0, 0), (170, 170), (800, 500), ("bad", 120)])
def test_public_browser_mouth_delay(configured, expected):
    public = sanitize_client_config({"tts": {"browser_lip_sync_delay_ms": configured}})
    assert public["tts"]["browser_lip_sync_delay_ms"] == expected
