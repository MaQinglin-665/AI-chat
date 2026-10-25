"""Metadata-only, bounded inventory. Never follow links or read file contents."""
import os
import stat
import time

from .policy import AgentError


def snapshot(root, *, max_entries=20000, max_seconds=15):
    result = {}
    started = time.monotonic()
    pending = [root]
    try:
        while pending:
            directory = pending.pop()
            metadata = os.lstat(directory)
            if stat.S_ISLNK(metadata.st_mode) or getattr(metadata, "st_file_attributes", 0) & 0x400:
                raise AgentError("inventory_changed", "核对时目录被替换为链接，无法可靠核验文件变更。")
            with os.scandir(directory) as entries:
                for entry in entries:
                    if len(result) >= max_entries or time.monotonic() - started > max_seconds:
                        raise AgentError("inventory_limit", "文件清单超过核对上限，请选择更小的工作目录。")
                    info = entry.stat(follow_symlinks=False)
                    linked = stat.S_ISLNK(info.st_mode) or bool(getattr(info, "st_file_attributes", 0) & 0x400)
                    kind = "link" if linked else "directory" if stat.S_ISDIR(info.st_mode) else "file"
                    relative = os.path.relpath(entry.path, root).replace("\\", "/")
                    result[relative] = {"size": info.st_size, "mtime_ns": info.st_mtime_ns, "kind": kind}
                    if kind == "directory":
                        pending.append(entry.path)
    except OSError:
        raise AgentError("inventory_failed", "无法完整读取文件清单，不能确认本次文件变更。") from None
    return result


def compare(before, after, plan):
    changes = {"created": sorted(after.keys() - before.keys()), "deleted": sorted(before.keys() - after.keys()),
               "modified": sorted(p for p in before.keys() & after.keys()
                                  if before[p] != after[p] and not (before[p]["kind"] == after[p]["kind"] == "directory"))}
    # Directory timestamps reflect child writes, not a separately modified file.
    # Listing a directory never authorizes arbitrary descendant modifications/deletions.
    fields = {"created": "files_to_create", "modified": "files_to_modify", "deleted": "files_to_delete"}
    normalize = lambda p: os.path.normcase(os.path.normpath(p.replace("\\", "/")))
    changes["out_of_plan"] = {kind: [p for p in changes[kind] if normalize(p) not in
                                    {normalize(v) for v in plan[field]}] for kind, field in fields.items()}
    changes["counts"] = {kind: len(changes[kind]) for kind in fields}
    changes["out_of_plan_count"] = sum(map(len, changes["out_of_plan"].values()))
    changes["planned_not_observed"] = {kind: [p for p in plan[field] if normalize(p) not in
                                             {normalize(v) for v in changes[kind]}] for kind, field in fields.items()}
    return changes
