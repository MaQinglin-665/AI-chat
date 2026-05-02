from datetime import datetime


def hour_to_period_hint(hour: int) -> str:
    if 5 <= hour < 9:
        return f"现在是早上{hour}点，清晨时段。"
    elif 9 <= hour < 12:
        return f"现在是上午{hour}点。"
    elif 12 <= hour < 14:
        return f"现在是中午{hour}点。"
    elif 14 <= hour < 18:
        return f"现在是下午{hour}点。"
    elif 18 <= hour < 22:
        return f"现在是晚上{hour}点。"
    else:
        return f"现在是深夜{hour}点，这么晚了。"


def build_time_awareness_block(now_func=None) -> str:
    """根据当前时刻返回时段描述，注入 system prompt 让模型有时间感。"""
    now = now_func or datetime.now
    hour = now().hour
    if 5 <= hour < 9:
        period, hint = "清晨", "用户刚起床不久，语气轻柔，别太亢奋。"
    elif 9 <= hour < 12:
        period, hint = "上午", "工作/学习时间，用户可能在忙，回复可以高效简短。"
    elif 12 <= hour < 14:
        period, hint = "午间", "午休时间，语气可以轻松随意。"
    elif 14 <= hour < 18:
        period, hint = "下午", "下午，用户可能有点犯困或在专注做事。"
    elif 18 <= hour < 21:
        period, hint = "傍晚", "下班放学时间，可以温和关心一些。"
    elif 21 <= hour < 24:
        period, hint = "晚上", "夜晚休闲时间，可以随意聊。"
    else:
        period, hint = "深夜", "深夜了，语气轻柔，别太吵。"
    return f"【当前时段】现在是{period}（{hour}点）。{hint}"
