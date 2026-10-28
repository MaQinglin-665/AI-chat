"""Only synthetic examples; no user data or real credentials."""
import pytest

from avatar_brain_context import REDACTED, build_context, clean_text

ORDINARY = [
    "这台电脑配置不错", "路径规划让我想到散步", "设置好闹钟就睡觉",
    "note: remember to water the flowers", "note: 今晚看月亮",
    "我想讨论配置文件的结构", "人生路径可以慢慢选择", "设置页面的颜色很温柔",
    "config means configuration", "the token bucket limits requests",
    "token count is an estimate", "the key idea is to listen", "a secret garden is beautiful",
    "password validation is useful", "使用 arr[0] 访问数组", '代码示例 {"color":"pink"}',
    "print('hello') 很容易理解", "if x < 3 and y > 1: return x",
    "total = a / b", "调用 obj.method()", "参考 docs/README.md 的相对路径",
    "avatar_brain_context.py 负责摘要", "config.local.json 是文件名，不是内容",
    ".env 是常见文件名", "今天是 2026-10-27，气温 20 度",
    "aLongDescriptiveIdentifierForCameraMovement", "https://example.com/help?page=2",
    "邮箱格式是什么？手机号要如何校验？", "private config setting", "../private/data",
]

# Category, source fragment, exact redaction. Every value is invented here.
CASES = [
    ("credential", prefix + "-synthetic1234567890", REDACTED) for prefix in ("sk", "pk", "ghp")
] + [
    ("credential", "api_key=demo-value", "api_key=" + REDACTED),
    ("credential", "Bearer demonstration", "Bearer " + REDACTED),
    ("credential", "opaqueExample0123456789abcdef", REDACTED),
    ("credential", "这是" + "sk" + "-syntheticValue", "这是" + REDACTED),
    ("credential", "AKIA" + "A" * 16, REDACTED),
    ("credential", "AIza" + "A" * 30, REDACTED),
    ("credential", "xoxb" + "-demonstration-value", REDACTED),
    ("password", "密码是示例口令", "密码是" + REDACTED),
    ("password", "口令：测试值", "口令：" + REDACTED),
    ("password", 'password="demo phrase"', 'password="' + REDACTED + '"'),
    ("password", '{"password":"demo"}', '{"password":"' + REDACTED + '"}'),
] + [
    ("email", value, REDACTED) for value in ("alice@example.com", "bob+test@example.org", "c.d@example.net")
] + [
    ("phone", value, REDACTED) for value in ("13800000000", "+86 139 0000 0000", "+1 202 555 0100", "(202) 555-0100")
] + [
    ("identity", value, REDACTED) for value in ("000000190001010000", "00000019000101000X", "000000000000000")
] + [
    ("bank", value, REDACTED) for value in ("0000000000000000", "0000 0000 0000 0000", "0000000000000000000")
] + [
    ("path", value, REDACTED) for value in ("C:/Users/Example/notes.txt".replace("/", chr(92)), "D:/Users/Example/data", "/home/example/notes")
] + [
    ("path", '"C:\\Users\\Example Person\\my notes.txt"', '"' + REDACTED + '"'),
    ("path", "C:/Users/Example Person/notes.txt".replace("/", chr(92)), REDACTED),
    ("url", "https://example.com/?token=demo&page=2", "https://example.com/?token=" + REDACTED + "&page=2"),
    ("url", "https://example.com/?key=demo#section", "https://example.com/?key=" + REDACTED + "#section"),
    ("url", "https://example.com/?api_key=demo%20value&lang=zh", "https://example.com/?api_key=" + REDACTED + "&lang=zh"),
    ("url", "https://example.com/?access_token=demo", "https://example.com/?access_token=" + REDACTED),
    ("url", "https://example:demo@example.com/help", "https://" + REDACTED + "@example.com/help"),
]


@pytest.mark.parametrize("text", ORDINARY)
def test_everyday_text_preserved(text):
    assert clean_text(text, 4096) == text


@pytest.mark.parametrize("category,fragment,expected", CASES)
def test_only_sensitive_span_hidden(category, fragment, expected):
    source = "刚才聊到 " + fragment + "，我们继续看月亮。"
    safe = "刚才聊到 " + expected + "，我们继续看月亮。"
    assert clean_text(source, 4096) == safe
    assert clean_text(safe, 4096) == safe


def test_redaction_precedes_truncation_and_reaches_both_context_sources():
    secret = "synthetic-private-value"
    text = "我喜欢月亮，password=" + secret + "，也喜欢樱花"
    for limit in range(len(text)):
        assert clean_text(text, limit) == ("我喜欢月亮，password=" + REDACTED + "，也喜欢樱花")[:limit]
    seen = []
    def retrieve(cfg, query, history):
        seen.append((query, history))
        return [{"text": text}]
    result = build_context({}, [{"role": "user", "content": text}], retrieve=retrieve)
    assert secret not in result and secret not in str(seen)
    assert "月亮" in result and "樱花" in result and REDACTED in result


def test_source_limit_stays_fail_closed():
    assert clean_text("普通" * 4096, 300) == ""
    assert clean_text(None, 300) == ""
