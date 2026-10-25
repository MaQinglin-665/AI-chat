import pytest
import character_brain as brain
from app_reply_pipeline import apply_character_brain_reply_text
from external_agents.file_manifest import planned_moves, compare
from external_agents.codex_cli import parse_event
import json


def pipeline(question, answer, retry):
    cfg = {"_character_brain_decision": brain.build_character_brain_decision(user_message=question)}
    return apply_character_brain_reply_text(cfg, question, answer,
        apply_character_brain_reply_constraints_func=brain.apply_character_brain_reply_constraints,
        enforce_reply_language_func=lambda c,u,r:r, regenerate_reply_func=retry)


def test_chinese_model_answers_preserved_distinct_and_named():
    rows = [("你叫什么名字？", "我叫馨语，很高兴见到你。"), ("今晚吃什么？", "今晚可以吃清汤面，配个鸡蛋。"), ("明天去哪里？", "明天去公园散步吧，带瓶水。"), ("下一步我该做什么？", "先挑一件小事，做十分钟就休息。")]
    fake_llm = dict(rows).__getitem__
    answers = [pipeline(q, fake_llm(q), lambda: pytest.fail("valid Chinese must not retry")) for q,a in rows]
    assert answers == [a for q,a in rows]
    assert "馨语" in answers[0] and len(set(answers)) == 4


def test_empty_guard_retries_once_and_preserves_generated_answer():
    calls=[]
    def retry(): calls.append(1); return "我叫馨语。"
    assert pipeline("你叫什么？", "Save your work.", retry) == "我叫馨语。"
    assert calls == [1]
    def fail(): raise RuntimeError("offline")
    assert "模型" in pipeline("你好", "Save your work.", fail)
    with pytest.raises(ValueError): pipeline("你好", "Save your work.", lambda:"Save your work.")


def test_partial_guard_keeps_answer_without_retry():
    assert pipeline("你叫什么？", "我叫馨语。 Save your work.", lambda:pytest.fail("partial answer needs no retry")) == "我叫馨语。"


def test_moves_are_bounded_by_approved_paths_and_metadata():
    plan={"files_to_delete":["a.txt","delete.txt"],"files_to_create":["text/a.txt"],"files_to_modify":[],"commands":[]}
    assert planned_moves(plan)==[{"from":"a.txt","to":"text/a.txt"}]
    meta={"kind":"file","size":3,"mtime_ns":100}
    result=compare({"a.txt":meta,"delete.txt":meta},{"text/a.txt":meta},plan)
    assert result["moved"]==planned_moves(plan) and result["out_of_plan_count"]==0
    assert compare({"a.txt":meta},{"text/a.txt":{**meta,"size":99}},plan)["moved"]==[]
    plan["files_to_create"] += ["other/a.txt"]
    assert planned_moves(plan)==[]  # Ambiguous names never hide deletion.
    assert planned_moves({**plan, "files_to_delete":["a.txt", "other/a.txt"], "files_to_create":["text/a.txt"]}) == []
    plan["commands"]=['Move-Item "a.txt" -Destination "text/a.txt"']
    assert len(planned_moves(plan))==1


def test_provider_detail_redacts_before_truncation():
    key="private-"+"x"*230
    event=parse_event(json.dumps({"type":"turn.failed","error":{"message":f"HTTP 429 {key} Bearer abc D:\\private\\secret.json /home/me/file"}}), key)
    detail=event["detail"]
    assert detail["http_status"]==429 and len(detail["message"])<=200
    assert all(secret not in detail["message"] for secret in [key,"private-","Bearer","secret.json","/home/me"])
