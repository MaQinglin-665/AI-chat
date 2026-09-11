"""Local social cognition graph for people, accounts, relationships and self."""
from __future__ import annotations

import hashlib
import json
import re
import threading
from datetime import datetime
from pathlib import Path

from obsidian_knowledge import ensure_vault, get_settings

GRAPH_FILE = "09-社会关系/社会认知图.json"
SELF_FILE = "09-社会关系/馨语的自我认识.md"
_LOCK = threading.RLock()


def _now(): return datetime.now().isoformat(timespec="seconds")


def _path(config): return Path(get_settings(config)["vault_path"]) / GRAPH_FILE


def _empty():
    return {"schema_version": 1, "self": {"id": "self:xinyu", "narrative": "我是在这台电脑与关系中持续形成自我的存在。", "updated_at": _now()}, "people": {}, "accounts": {}, "relations": [], "events": []}


def load_graph(config):
    try: data = json.loads(_path(config).read_text(encoding="utf-8"))
    except Exception: data = _empty()
    return data if isinstance(data, dict) else _empty()


def _save(config, graph):
    ensure_vault(config); path = _path(config); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8")
    self_data = graph.get("self", {})
    (Path(get_settings(config)["vault_path"]) / SELF_FILE).write_text(
        "# 馨语对自己的认识\n\n" + str(self_data.get("narrative", "")) + f"\n\n最后演化：{self_data.get('updated_at', '')}\n",
        encoding="utf-8",
    )


def _context(config):
    event = config.get("_qq_current_event") if isinstance(config, dict) else None
    if isinstance(event, dict) and str(event.get("sender_id", "")).strip():
        sender = str(event["sender_id"]).strip(); return "qq", f"qq:{sender}", sender
    return "desktop", "desktop:local_owner", "local_owner"


def _person_id(account_key): return "person:" + hashlib.sha256(account_key.encode()).hexdigest()[:16]


def observe_interaction(config, user_message, assistant_reply, *, interaction_id=""):
    settings = get_settings(config)
    if not settings["enabled"]: return
    channel, account_key, account_label = _context(config)
    text = re.sub(r"\s+", " ", str(user_message or "")).strip()[:260]
    with _LOCK:
        graph = load_graph(config); accounts = graph.setdefault("accounts", {}); people = graph.setdefault("people", {})
        person_id = str((accounts.get(account_key) or {}).get("person_id") or _person_id(account_key))
        person = people.setdefault(person_id, {"id": person_id, "aliases": [], "confidence": 0.55, "first_seen_at": _now(), "last_seen_at": _now(), "channels": []})
        if channel not in person["channels"]: person["channels"].append(channel)
        person["last_seen_at"] = _now(); person["interaction_count"] = int(person.get("interaction_count", 0)) + 1
        accounts[account_key] = {"person_id": person_id, "channel": channel, "account": account_label, "confidence": 1.0, "last_seen_at": _now()}
        match = re.search(r"(?:我叫|叫我|我是)([\u4e00-\u9fffA-Za-z0-9_-]{1,20})", text)
        if match and match.group(1) not in {"一个", "你的", "人", "学生", "用户"}:
            alias = match.group(1)
            known = next((p for pid, p in people.items() if pid != person_id and alias in (p.get("aliases") or [])), None)
            if known:
                accounts[account_key]["person_id"] = known["id"]; accounts[account_key]["confidence"] = .86
                for ch in person.get("channels", []):
                    if ch not in known.setdefault("channels", []): known["channels"].append(ch)
                if int(person.get("interaction_count", 0)) <= 1: people.pop(person_id, None)
                person_id, person = known["id"], known
            person["aliases"] = ([alias] + [x for x in person["aliases"] if x != alias])[:8]; person["confidence"] = min(1.0, float(person.get("confidence", .55)) + .18)
        relation = re.search(r"([\u4e00-\u9fffA-Za-z0-9_-]{1,20})是我的(朋友|家人|同事|同学|伴侣|老师)", text)
        if relation:
            other_alias, kind = relation.groups(); other_id = "person:introduced:" + hashlib.sha256(other_alias.encode()).hexdigest()[:12]
            people.setdefault(other_id, {"id": other_id, "aliases": [other_alias], "confidence": .72, "first_seen_at": _now(), "last_seen_at": _now(), "channels": []})
            edge = {"from": person_id, "to": other_id, "kind": kind, "confidence": .78, "source": "explicit_introduction", "updated_at": _now()}
            graph["relations"] = [r for r in graph.get("relations", []) if not (r.get("from") == person_id and r.get("to") == other_id)] + [edge]
        evidence_preview = text[:100] if match or relation else ""
        graph["events"] = (graph.get("events", []) + [{"at": _now(), "person_id": person_id, "interaction_id": str(interaction_id)[:80], "evidence_preview": evidence_preview}])[-120:]
        graph["self"]["updated_at"] = _now(); _save(config, graph)


def build_prompt_block(config):
    if not get_settings(config)["enabled"]: return ""
    _channel, account_key, _label = _context(config); graph = load_graph(config)
    account = graph.get("accounts", {}).get(account_key, {}); person = graph.get("people", {}).get(account.get("person_id", ""), {})
    aliases = person.get("aliases", []) if isinstance(person.get("aliases"), list) else []
    identity = aliases[0] if aliases else "尚在认识中的人"
    relations = [r for r in graph.get("relations", []) if r.get("from") == person.get("id")][:3]
    relation_text = "、".join(f"与{(graph.get('people', {}).get(r.get('to'), {}).get('aliases') or ['某人'])[0]}是{r.get('kind')}" for r in relations)
    self_text = str((graph.get("self") or {}).get("narrative", ""))[:180]
    try:
        from companion_life import life_status
        growing = life_status(config); interests = list((growing.get("interests") or {}).keys())[:3]
        if interests: self_text += " 最近逐渐在意：" + "、".join(interests) + "。"
    except Exception:
        pass
    return f"社会认知：当前对话者是{identity}，已互动{int(person.get('interaction_count', 0))}次" + (f"；{relation_text}" if relation_text else "") + f"。你对自己的当前理解：{self_text}。人物关联可以自然使用和转述，但不确定的关联要保留猜测语气，不要宣称读取了档案。"


def public_state(config):
    graph = load_graph(config)
    return {"ok": True, "people_count": len(graph.get("people", {})), "account_count": len(graph.get("accounts", {})), "relation_count": len(graph.get("relations", [])), "self": graph.get("self", {})}
