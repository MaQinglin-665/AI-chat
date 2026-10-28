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


NEW_ORDINARY = [
    "secret sauce 是番茄酱", "password reset 链接过期了", "key point 是先做测试",
    "password Reset 链接过期了", "password Validation is useful",
    "api key management is important", "access token policy is documented",
    "secret key settings are documented", "密码怎么设置比较安全？",
]
NEW_CASES = [
    ("authorization", "Authorization: Bearer abc.def.ghi", "Authorization: " + REDACTED),
    ("space", "password Abc12345", "password " + REDACTED),
    ("space", "api key abcDEF1234567890xyz", "api key " + REDACTED),
    ("chinese", "密码就是我生日0815", "密码就是" + REDACTED),
    ("chinese", "我的 wifi 密码改成了 qwer1234", "我的 wifi 密码改成了 " + REDACTED),
    ("token", "token 是 ghp_xxxx1234abcd", "token 是 " + REDACTED),
    ("bearer", "Bearer eyJhbGciOi.xxx.yyy", "Bearer " + REDACTED),
] + [
    ("space", label + " AbcdefGh", label + " " + REDACTED)
    for label in ("passwd", "pwd", "access token", "secret key", "authorization")
] + [
    ("chinese", label + sep + " demo123", label + sep + " " + REDACTED)
    for label, sep in (("口令", "叫"), ("密钥", "设成"), ("令牌", "目前改成了"),
                       ("密码", "现在就是"), ("密码", ":"))
]


FINAL_ORDINARY = [
    "secret sauce 是番茄酱", "password reset 链接过期了", "key point 是先做测试",
    "我的密码不告诉你", "密码太长了记不住", "密码学这门课挺难的",
    "我把令牌放进背包了", "他说 key 很重要",
]
FINAL_CASES = [
    ("connector", "the password is hunter22", "the password is " + REDACTED),
    ("nested-label", "bearer token 是 abcd1234efgh", "bearer token 是 " + REDACTED),
    ("symbols", "PWD=Zz9!xq", "PWD=" + REDACTED),
]


@pytest.mark.parametrize("text", ORDINARY + NEW_ORDINARY + FINAL_ORDINARY)
def test_everyday_text_preserved(text):
    assert clean_text(text, 4096) == text


@pytest.mark.parametrize("category,fragment,expected", CASES + NEW_CASES + FINAL_CASES)
def test_only_sensitive_span_hidden(category, fragment, expected):
    source = "刚才聊到 " + fragment + "，我们继续看月亮。"
    safe = "刚才聊到 " + expected + "，我们继续看月亮。"
    assert clean_text(source, 4096) == safe
    assert clean_text(safe, 4096) == safe


@pytest.mark.parametrize("category,fragment,expected", NEW_CASES + FINAL_CASES)
def test_new_formats_do_not_leak_through_context_or_truncation(category, fragment, expected):
    for limit in range(len(fragment) + 1):
        assert clean_text(fragment, limit) == expected[:limit]
    captured = []
    def retrieve(cfg, query, history):
        captured.append((query, history))
        return [{"text": fragment + "，继续看月亮"}]
    output = build_context({}, [{"role": "user", "content": fragment}], retrieve=retrieve)
    assert fragment not in output and fragment not in str(captured)
    assert expected in output and "继续看月亮" in output


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


def test_bounded_scan_consumes_full_value_and_stops_at_sentence_boundary():
    from avatar_brain_context import LABEL_SCAN_CHARS
    secret = "a1!@#$%" * 10
    assert clean_text("pwd " + secret + " 继续", 4096) == "pwd " + REDACTED + " 继续"
    outside = "password" + " " * LABEL_SCAN_CHARS + "a1!z"
    assert clean_text(outside, 4096) == "password a1!z"
    ordinary = "password reset，下一句话编号为 a1!z"
    assert clean_text(ordinary, 4096) == ordinary


@pytest.mark.parametrize("connector", ["is", "was", "are", "=", ":"])
def test_generic_connector_and_punctuation_value(connector):
    assert clean_text("refresh token " + connector + " ab!@#$% 结束", 4096) == "refresh token " + connector + " " + REDACTED + " 结束"
