"""Bounded character-voice instructions for Qwen3-TTS runtimes."""

import re

SUPPORTED_EMOTIONS = {
    "neutral",
    "happy",
    "playful",
    "excited",
    "shy",
    "hurt",
    "sad",
    "anxious",
    "angry",
    "surprised",
    "serious",
    "thinking",
}
SUPPORTED_INTENSITIES = {"low", "medium", "high"}
SUPPORTED_VOICE_STYLES = {
    "neutral", "soft", "cheerful", "teasing", "serious", "curious", "warm",
}
EMOTION_DIRECTIONS = {
    "neutral": "calm, attentive, and naturally conversational",
    "happy": "genuinely pleased, bright, and lightly smiling",
    "playful": "mischievous, cute, and gently teasing",
    "excited": "energetic and eager, without shouting",
    "shy": "softly bashful and warm, without becoming breathy",
    "hurt": "quietly hurt and restrained, without melodrama",
    "sad": "tenderly sad and subdued, while remaining clear",
    "anxious": "slightly worried and alert, without frantic pacing",
    "angry": "firmly annoyed and controlled, never harsh or threatening",
    "surprised": "briefly surprised and curious, then naturally settled",
    "serious": "focused, grounded, and sincere",
    "thinking": "thoughtful and curious, with small natural hesitations",
}
INTENSITY_DIRECTIONS = {
    "low": "Keep the emotional color subtle.",
    "medium": "Make the emotional color clearly perceptible but conversational.",
    "high": "Make the emotional color vivid and anime-expressive, but never exaggerated or shouted.",
}
STYLE_DIRECTIONS = {
    "neutral": "Use an easy conversational delivery.",
    "soft": "Use gentler attacks and softer sentence endings.",
    "cheerful": "Use buoyant timing and a light smile in the voice.",
    "teasing": "Use playful timing with tiny, controlled emphasis.",
    "serious": "Use steadier timing and clean emphasis.",
    "curious": "Use lightly rising, inquisitive contours where the wording supports them.",
    "warm": "Use reassuring warmth and connected phrasing.",
}
STABLE_GENERATION_KWARGS = {
    "temperature": 0.6,
    "top_k": 20,
    "top_p": 0.8,
    "repetition_penalty": 1.05,
}
STABLE_GENERATION_SEED = 20260728
QWEN3_TTS_VOICE_MODE_AUTO = "auto"
QWEN3_TTS_VOICE_MODE_CUSTOM = "custom_voice"
QWEN3_TTS_VOICE_MODE_DESIGN = "voice_design"
QWEN3_TTS_A2_VOICE = "A2_Original"


def _enum(value, allowed, fallback):
    normalized = str(value or "").strip().lower().replace("-", "_")
    return normalized if normalized in allowed else fallback


def resolve_voice_mode(mode="auto", model_name=""):
    """Resolve a trusted runtime mode while keeping legacy CustomVoice models valid."""
    normalized = str(mode or "").strip().lower().replace("-", "_")
    if normalized in {
        QWEN3_TTS_VOICE_MODE_CUSTOM,
        QWEN3_TTS_VOICE_MODE_DESIGN,
    }:
        return normalized
    compact_model_name = (
        str(model_name or "").strip().lower().replace("-", "").replace("_", "")
    )
    if "voicedesign" in compact_model_name:
        return QWEN3_TTS_VOICE_MODE_DESIGN
    return QWEN3_TTS_VOICE_MODE_CUSTOM


def resolve_generation_language(language="Auto", text=""):
    """Resolve model language without forwarding arbitrary request values."""
    normalized = str(language or "").strip().lower().replace("_", "-")
    aliases = {
        "zh": "Chinese",
        "zh-cn": "Chinese",
        "chinese": "Chinese",
        "mandarin": "Chinese",
        "en": "English",
        "en-us": "English",
        "english": "English",
        "ja": "Japanese",
        "japanese": "Japanese",
        "ko": "Korean",
        "korean": "Korean",
        "de": "German",
        "german": "German",
        "fr": "French",
        "french": "French",
        "ru": "Russian",
        "russian": "Russian",
        "pt": "Portuguese",
        "portuguese": "Portuguese",
        "es": "Spanish",
        "spanish": "Spanish",
        "it": "Italian",
        "italian": "Italian",
    }
    if normalized in aliases:
        return aliases[normalized]
    if normalized not in {"", "auto"}:
        return "Auto"
    supplied_text = str(text or "")
    has_chinese = bool(re.search(r"[\u3400-\u4dbf\u4e00-\u9fff]", supplied_text))
    has_latin = bool(re.search(r"[A-Za-z]", supplied_text))
    if has_chinese and not has_latin:
        return "Chinese"
    if has_latin and not has_chinese:
        return "English"
    return "Auto"


def build_voice_design_instruction(language="Auto"):
    """Return the accepted A2 bilingual voice design without free-form input."""
    normalized_language = str(language or "").strip().lower()
    if normalized_language in {"chinese", "zh", "zh-cn", "mandarin"}:
        pronunciation = "crisp childlike Mandarin pronunciation"
    elif normalized_language in {"english", "en", "en-us"}:
        pronunciation = "crisp childlike English pronunciation"
    else:
        pronunciation = "crisp childlike pronunciation in the supplied language"
    return " ".join(
        [
            (
                "Create one original clear, sweet, two-dimensional anime child "
                "heroine voice, perceived around six to eight years old, never "
                "teenage or adult."
            ),
            (
                "Keep the voice small, youthful, high, clean, bright, round and "
                "milk-sweet. Use a little sunny energy, alertness and buoyancy while "
                f"staying relaxed and conversational, with {pronunciation}, compact "
                "natural rhythm and gently cute sentence endings."
            ),
            (
                "The maturity increase from a very young child must be extremely "
                "subtle: only slightly fuller and steadier, without lowering the "
                "pitch much or losing the innocent anime-child quality."
            ),
            (
                "Keep one stable character identity. Never sound mature, sultry, "
                "flirtatious, breathy, intimate, possessive, obsessive, dark, "
                "yandere-like, nasal, harshly squeaky, metallic, robotic, or "
                "electronically processed."
            ),
            (
                "Speak only the exact supplied text with no added laughs, hums, "
                "gasps, squeals, filler vowels or baby talk."
            ),
        ]
    )


def build_delivery_instruction(
    *,
    emotion="neutral",
    intensity="medium",
    voice_style="neutral",
    speed=1.0,
):
    """Build one fixed-vocabulary instruction without accepting free-form prompts."""
    normalized_emotion = _enum(emotion, SUPPORTED_EMOTIONS, "neutral")
    normalized_intensity = _enum(intensity, SUPPORTED_INTENSITIES, "medium")
    normalized_style = _enum(voice_style, SUPPORTED_VOICE_STYLES, "neutral")
    parts = [
        (
            "Use one fixed original two-dimensional anime child character voice, "
            "perceived around five to seven years old. Make it deliberately stylized "
            "rather than realistic: very small, high, bright, round, milk-sweet, "
            "chibi-like, innocent, lively, and openly adorable."
        ),
        (
            "Use the identical pitch center, resonance, timbre, rhythm family, and "
            "cute vocal identity in every request and every adjacent sentence. Keep "
            "a compact bouncy cadence, rounded syllables, and small anime-style "
            "endings while pronouncing every word clearly."
        ),
        (
            f"For this whole passage, keep one continuous emotional through-line: "
            f"{EMOTION_DIRECTIONS[normalized_emotion]}. "
            f"{INTENSITY_DIRECTIONS[normalized_intensity]} "
            f"{STYLE_DIRECTIONS[normalized_style]} Do not reset the character, "
            "pitch center, vocal age, or emotional baseline at punctuation."
        ),
        (
            "Treat commas, dashes, and sentence boundaries as connected breaths "
            "inside one speaking turn. Let emphasis and intonation follow meaning, "
            "but keep adjacent clauses recognizably spoken by the same person in "
            "the same moment."
        ),
        (
            "Speak only the provided words in their original order; never replace or interrupt them with "
            "humming, squeals, giggles, gasps, or elongated filler vowels."
        ),
        (
            "Preserve the exact wording and avoid breathiness, harsh squeakiness, "
            "baby talk, nasality, metallic texture, robotic delivery, adult sultriness, "
            "digital voice effects, or any dark, obsessive, possessive, sinister, "
            "yandere-like, intimate, threatening, or realistic adult tone."
        ),
    ]
    return " ".join(parts)
