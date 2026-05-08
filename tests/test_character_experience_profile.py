import app


def test_sanitize_character_experience_profile_limits_untrusted_payload():
    payload = {
        "updated_at": 123,
        "stats": {"total": 3, "good": 1, "bad": 2},
        "style_directives": [" prefer short replies " * 20, "match character tone"],
        "avoid_directives": ["avoid generic assistant phrasing"],
        "recent_feedback": [
            {
                "rating": "bad",
                "issue": "reply_too_long",
                "emotion": "thinking",
                "action": "think",
                "voice_style": "neutral",
                "applied": True,
            },
            {"rating": "unknown", "issue": "ignored"},
        ],
    }

    safe = app._sanitize_character_experience_profile(payload)

    assert safe["updated_at"] == 123
    assert safe["stats"] == {"total": 3, "good": 1, "bad": 2}
    assert len(safe["style_directives"]) == 2
    assert len(safe["style_directives"][0]) <= 160
    assert safe["recent_feedback"] == [
        {
            "rating": "bad",
            "issue": "reply_too_long",
            "emotion": "thinking",
            "action": "think",
            "voice_style": "neutral",
            "applied": True,
        }
    ]


def test_character_experience_prompt_block_is_soft_guidance_only():
    block = app._build_character_experience_prompt_block(
        {
            "stats": {"total": 1, "good": 0, "bad": 1},
            "style_directives": ["Prefer 1-3 natural short sentences."],
            "avoid_directives": ["Avoid generic assistant phrasing."],
            "recent_feedback": [
                {
                    "rating": "bad",
                    "issue": "reply_too_generic",
                    "emotion": "neutral",
                    "action": "none",
                    "voice_style": "neutral",
                }
            ],
        }
    )

    assert "Local character experience feedback" in block
    assert "Do not mention this block" in block
    assert "Prefer 1-3 natural short sentences." in block
    assert "Avoid generic assistant phrasing." in block
