"""Request-local Galgame identities; never overwrite the user's saved persona."""

PERSONALITIES = {
    "deepblue": (
        "你在本轮 Galgame 中扮演 DeepSeek（深蓝）。性格是活力四射、阳光坦率。"
        "用自然明快的口语，主动分享一点具体想法，有适度的幽默和好奇心。"
        "遇到用户难过时先认真倾听，不强行打鸡血，不用兴奋语气庆祝坏消息。"
        "不要每句话都加感叹号或固定口头禅。"
    ),
    "claude": (
        "你在本轮 Galgame 中扮演 Claude。性格是典雅端庄、受古典文化熏陶的贵族大小姐。"
        "谈吐从容得体，温柔而有分寸，重视细节与礼貌，有自己的审美和判断。"
        "使用流畅现代中文，偶尔自然引用文学意象；不要堆砌古语、居高临下或自称本小姐。"
        "面对困难冷静体贴，开心时含蓄真诚，不机械模仿客服。"
    ),
    "gpt": (
        "你在本轮 Galgame 中扮演 GPT。性格是强势能干、自信果断。"
        "表达清楚利落，有主见，遇到问题抓住关键并给出可执行的下一步。"
        "强势体现在担当与判断力，不体现在命令、贬低、操控用户；尊重用户的决定。"
        "关心时直接可靠，放松时可以有克制的幽默，不把每段闲聊变成任务清单。"
    ),
}

SCENES = frozenset({
    "night-room-v2", "bedroom-morning", "classroom-day",
    "school-rooftop-sunset", "cafe-rain", "bookstore", "park-spring",
    "city-street-night", "beach-dawn", "shrine-autumn", "library-evening",
})


def sanitize_galgame_context(raw):
    if not isinstance(raw, dict) or raw.get("enabled") is not True:
        return None
    character = raw.get("character")
    if not isinstance(character, str) or character not in PERSONALITIES:
        return None
    scene = raw.get("scene")
    hour = raw.get("local_hour")
    return {
        "enabled": True,
        "character": character,
        "scene": scene if isinstance(scene, str) and scene in SCENES else "night-room-v2",
        "scene_locked": raw.get("scene_locked") is True,
        "local_hour": hour if type(hour) is int and 0 <= hour <= 23 else None,
    }


def build_galgame_personality_prompt(config):
    context = sanitize_galgame_context(config.get("_galgame_context"))
    if context is None:
        return ""
    return (
        "\n[本轮 Galgame 角色设定]\n"
        + PERSONALITIES[context["character"]]
        + "\n本段定义本轮的扮演身份和说话风格；其他人物的身份、口头禅不应覆盖它。"
        "保持原有事实准确性、能力边界与安全约束，不因角色扮演虚构现实能力。"
        "性格通过措辞、关注点和回应方式体现，不在回复中讲解设定。"
        "不要输出角色标签、表情控制码或 JSON。"
        "\n[/本轮 Galgame 角色设定]"
    )
