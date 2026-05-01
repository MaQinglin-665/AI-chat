import base64


def build_openai_messages(prompt, safe_history, user_message, image_data_url=None):
    messages = [{"role": "system", "content": prompt}]
    messages.extend(safe_history)
    if image_data_url:
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_message},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        )
    else:
        messages.append({"role": "user", "content": user_message})
    return messages


def build_ollama_messages(prompt, safe_history, user_message, image_base64=None):
    messages = [{"role": "system", "content": prompt}]
    messages.extend(safe_history)
    user_item = {"role": "user", "content": user_message}
    if image_base64:
        user_item["images"] = [image_base64]
    messages.append(user_item)
    return messages


def extract_base64_from_data_url(image_data_url):
    if not image_data_url:
        return None
    if not isinstance(image_data_url, str):
        raise RuntimeError("image_data_url must be a string.")
    raw = image_data_url.strip()
    if not raw:
        return None
    if not raw.startswith("data:image/") or ";base64," not in raw:
        raise RuntimeError("image_data_url must be a valid image data URL.")
    header, b64_data = raw.split(",", 1)
    if not header.endswith(";base64"):
        raise RuntimeError("image_data_url must use base64 encoding.")
    cleaned = "".join(str(b64_data).split())
    if not cleaned:
        raise RuntimeError("image_data_url cannot be empty.")
    if len(cleaned) > 8_500_000:
        raise RuntimeError("image_data_url is too large.")
    try:
        base64.b64decode(cleaned, validate=True)
    except Exception as exc:
        raise RuntimeError("image_data_url base64 decode failed.") from exc
    return cleaned


def is_vision_unsupported_error(message):
    s = str(message or "").lower()
    keywords = [
        "vision",
        "image",
        "multimodal",
        "does not support",
        "not support",
        "projector",
        "unknown field",
        "unsupported",
    ]
    return any(k in s for k in keywords)


def normalize_vision_error(_exc):
    return RuntimeError(
        "Current model does not support image understanding. Please switch to a vision-capable model."
    )


def is_likely_ollama_vision_model(model_name):
    model = str(model_name or "").strip().lower()
    if not model:
        return False
    keywords = [
        "qwen2.5vl",
        "qwen2.5-vl",
        "qwen-vl",
        "llava",
        "bakllava",
        "minicpm-v",
        "moondream",
        "phi3v",
        "phi-3-vision",
        "llama3.2-vision",
        "internvl",
        "vision",
    ]
    return any(k in model for k in keywords)


def wrap_vision_error(exc):
    if is_vision_unsupported_error(str(exc)):
        return normalize_vision_error(exc)
    return exc
