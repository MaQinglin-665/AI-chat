"""Bounded JSON-lines direction. Only validated dialogue leaves this module."""
import json
import math
import re

from galgame_context import SCENES

EMOTIONS = frozenset({"neutral", "happy", "shy", "sad", "angry", "thinking", "surprised", "playful", "excited", "serious", "anxious"})
ACTIONS = frozenset({"none", "wave", "think", "nod", "shake_head"})
DEEPBLUE_POSES = frozenset({"neutral", "happy", "shy", "confused", "annoyed", "sad", "playful", "thinking", "surprised", "embarrassed", "determined", "sleepy", "greeting", "listening", "celebrate", "celebrate-bright"})


def grounded_scene_evidence(evidence, *sources):
    # Conservative second gate for common non-events, even if the model labels them arrival.
    excluded = re.compile(r"还没|没有|并未|尚未|没到|未到|不会|不去|别去|不要|如果|假如|要是|明天|打算|计划|想去|曾经|去年|昨天|他说|她说|提到|[“”「」]|\b(?:not|never|tomorrow|if|would|might|yesterday|said)\b", re.I)
    return any(evidence in sentence and not excluded.search(sentence)
               for source in sources for sentence in re.split(r"[。！？!?\n]", source))


def poses_for(character):
    return DEEPBLUE_POSES if character == "deepblue" else frozenset({"neutral", "happy", "thinking"})


def direction_llm_config(llm):
    """The ordinary short-reply token cap cannot accommodate JSONL metadata."""
    return {**llm, "allow_high_output_tokens": True, "max_output_tokens": 2048}


def build_direction_prompt(context):
    return """
[Galgame 逐句输出协议 — 本轮最终输出格式]
覆盖前面纯文本/TAFFY 标签的格式要求，但保留角色性格、事实和安全约束。
只输出 JSONL，每行一个完整 JSON 对象，不加 Markdown 围栏，不加总结。
每行格式：{"text":"一句完整可朗读的对话。","emotion":"neutral","action":"none","sprite":"neutral","scene":null,"transition":"stay","confidence":0,"evidence":""}
每行 text 通常 1 句、不超过 240 字；普通闲聊用 2 到 4 行，最多 24 行。按行持续输出，不等待整段。
emotion 是说话者此句的真实情绪，不是引用的人或用户的情绪。不要因否定、假设、引语里的情绪词切表情。
安慰难过的人应温柔倾听；不能因提到庆祝就欢呼。action 和 sprite 必须符合这一句的语气动作。
没有合适立绘时选择 neutral，不要用开心代替伤心。emotion 与 sprite 可以不同。
scene 只在对话情境中确已抵达新的地点，或确实发生时间推移时更改；仅讨论、回忆、引用、否定、提议、计划去某处都保持 null。
transition 仅 stay/arrival/time_passage；evidence 必须逐字摘自用户当前输入或本句，支持已发生的变化。
不主动编造抵达、天气或时间变化来切背景；本地时间仅帮助没有既定时间时的选择，不覆盖剧情中的时间。
只用存在的背景，若地点时间或天气不匹配已有图片就不切换；每轮最多换一次背景。场景锁定时一律 null。
场景含义：night-room-v2 夜间房间；bedroom-morning 晨间卧室；classroom-day 白天教室；school-rooftop-sunset 黄昏天台；cafe-rain 雨夜咖啡馆；bookstore 暮色书店；park-spring 春日公园；city-street-night 夜街；beach-dawn 黎明海边；shrine-autumn 秋日神社；library-evening 夜间图书馆。
""" + json.dumps({"current": context, "emotions": sorted(EMOTIONS), "actions": sorted(ACTIONS),
                    "sprites": sorted(poses_for(context["character"]))}, ensure_ascii=False) + "\n[/Galgame 逐句输出协议]"


class DirectionDecoder:
    def __init__(self, context, user_message):
        self.context = context
        self.user_message = str(user_message or "")
        self.buffer = ""
        self.count = 0
        self.changed_scene = False

    def feed(self, chunk, final=False):
        self.buffer += chunk
        if len(self.buffer) > 32768:
            raise ValueError("Galgame output line exceeds limit")
        lines = self.buffer.split("\n")
        self.buffer = "" if final else lines.pop()
        results = []
        for line in lines:
            line = line.strip()
            if not line or line in {"```", "```json", "```jsonl"}:
                continue
            raw = json.loads(line)
            if not isinstance(raw, dict):
                raise ValueError("Expected Galgame sentence object")
            text = raw.get("text")
            if not isinstance(text, str) or not text.strip() or len(text) > 1200 or self.count >= 24:
                raise ValueError("Invalid Galgame sentence")
            text = text.strip()
            if "[[TAFFY_" in text:
                raise ValueError("Private control tag in Galgame dialogue")
            emotion = raw.get("emotion")
            action = raw.get("action")
            sprite = raw.get("sprite")
            performance = {
                "emotion": emotion if isinstance(emotion, str) and emotion in EMOTIONS else "neutral",
                "action": action if isinstance(action, str) and action in ACTIONS else "none",
                "sprite": sprite if isinstance(sprite, str) and sprite in poses_for(self.context["character"]) else "neutral",
                "source": "galgame_model",
            }
            scene, evidence, confidence = raw.get("scene"), raw.get("evidence"), raw.get("confidence")
            accepted_scene = None
            if (not self.context["scene_locked"] and not self.changed_scene
                and isinstance(scene, str) and scene in SCENES and scene != self.context["scene"]
                and raw.get("transition") in ("arrival", "time_passage")
                and type(confidence) in (int, float) and math.isfinite(confidence) and 0.85 <= confidence <= 1
                and isinstance(evidence, str) and len(evidence.strip()) >= 2
                and grounded_scene_evidence(evidence, self.user_message, text)):
                accepted_scene = scene
                self.changed_scene = True
            results.append({"index": self.count, "text": text, "performance": performance, "scene": accepted_scene})
            self.count += 1
        if final and not self.count:
            raise ValueError("Empty Galgame dialogue")
        return results


def directed_stream(iterators, context, user_message, config):
    """Retry another provider format only before any sentence has been delivered."""
    last_error = None
    for factory in iterators:
        decoder = DirectionDecoder(context, user_message)
        delivered = False
        config["_galgame_stream_segments"] = []
        try:
            for chunk in factory():
                if not isinstance(chunk, str):
                    continue
                for segment in decoder.feed(chunk):
                    config["_galgame_stream_segments"].append(segment)
                    delivered = True
                    yield segment["text"]
            for segment in decoder.feed("", final=True):
                config["_galgame_stream_segments"].append(segment)
                delivered = True
                yield segment["text"]
            return
        except Exception as exc:
            if delivered:
                raise RuntimeError("Galgame 对话中断，请重新发送消息。") from exc
            last_error = exc
    raise RuntimeError("模型未返回有效的 Galgame 对话，请重试。") from last_error
