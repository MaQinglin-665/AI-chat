def normalize_text_content(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return " ".join(parts).strip()
    return ""


def extract_response_output_text(data):
    direct = data.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    outputs = data.get("output")
    if not isinstance(outputs, list):
        return ""
    parts = []
    for item in outputs:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
    return "\n".join(parts).strip()


def convert_messages_to_responses_input(messages):
    converted = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = str(msg.get("role", "user")).strip() or "user"
        raw_content = msg.get("content", "")
        parts = []
        if isinstance(raw_content, str):
            if raw_content.strip():
                parts.append({"type": "input_text", "text": raw_content.strip()})
        elif isinstance(raw_content, list):
            for part in raw_content:
                if not isinstance(part, dict):
                    continue
                ptype = part.get("type")
                if ptype == "text":
                    text = part.get("text")
                    if isinstance(text, str) and text.strip():
                        parts.append({"type": "input_text", "text": text.strip()})
                elif ptype == "image_url":
                    image_url = part.get("image_url")
                    if isinstance(image_url, dict):
                        image_url = image_url.get("url")
                    if isinstance(image_url, str) and image_url.strip():
                        parts.append({"type": "input_image", "image_url": image_url.strip()})
        if parts:
            converted.append({"role": role, "content": parts})
    return converted


def split_text_for_stream(text, chunk_size=14):
    safe = str(text or "")
    if not safe:
        return
    step = max(1, int(chunk_size))
    for i in range(0, len(safe), step):
        yield safe[i : i + step]
