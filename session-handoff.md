# Current — Live2D browser text vowels — 2026-10-28

- Branch: friend/live2d-text-vowels from origin/main42ae9ea (contains66326b9/PR233 and merged234);latest fetch still42ae9ea. User authorized official package/license downloads;runtime must remain offline. Official pinyin-pro3.29.5 npm package metadata and full MIT license checked;3755 common-character finals only,11763byteJSON with original license, archive/data SHA256 in THIRD_PARTY_NOTICES.
- Implemented: browserLipSync stores bounded native boundary plans using existing delayMs/rate; Live2D-only helper/renderer/driver adds80ms vowel weights and punctuation gate. Existing opening formula unchanged. Existing speech channel gets ignorable metadata snapshots with new-token reset and lease/clock safeguards; avatarRuntime/appStartup/playback controller/VRM/room/brain/executor untouched. No model parameters written from a new clock.
- Verification Evidence: full test-local1105Python/3skip/85Node;final85Node,syntax199/267,secrets900,realHiyori/Mao mapping checks passed. First-run package,publicJSON/py_compile pass. Frozen14400browser opening samples exact. Hiyori5280/394224,Mao1440/25850 and actualCore6/Mao1440/181030 exact;no oldfixture/snapshot changes. Logs in work/text-vowels-*.log.
- Six real browser Huihui SpeechSynthesis/native-boundary + WASAPI output-loopback recordings done, about10–12sec each;onlyA before,all5channels in Chinese after. Source/local videos, audioRMS/decode/SHA verification, report and ZIP in outputs/live2d-text-vowels and outputs/Mao浏览器语音_六段有声元音对比_20261028.zip. Uploaded existing GitHub draft review release;must be logged in with write permission. User was surprised by speaker playback;all recording/browser processes finished. Do not start more audible QA without advance notice. Remaining verification is silent.
- Files: browserLipSync,Live2D renderer/driver,new pinyinVowels/browserTextVowels/data+license;two tests/runner;offline build and optional native-recording tools;docs/live2d-browser-text-vowels.md,third-party notice and states. Runtime increase23231bytes after malformed-packet guard, no full pinyin dependency. English/digits/rarechars fallback;word-internal phonemes approximate,not exact audio analysis.
- PR235: https://github.com/MaQinglin-665/AI-chat/pull/235 (open,not draft,unmerged). Six remote asset digests equal local; no conflicts;Linux Node/Python/quality/docs passed,Windows pending at last snapshot. Targeted text-vowel/renderer tests pass after adding safe-ignore for a null metadata plan. Next: normal push guard/report follow-up and verify exact new head all CI. No main/force push or self merge. No models/privateconfigs/keys/media/logs in source commit.

## Historical upstream handoff (PR234 already merged; old merge instructions do not apply)

# Brain privacy filter — 2026-10-27

Branch: codex/brain-privacy-filter-v1. Worktree: D:/AI/ai_desktop_pet_privacy. Baseline: origin/main 582f19e (confirmed ancestor). Prior handoff archived in docs/history/session-handoff-before-brain-privacy-20261027.md; historical PR232 instructions are superseded by its merge.

Scope: redact sensitive spans in autonomous-thought context, preserve everyday prose/code. Product change only avatar_brain_context.py. Shared memory filter, frontend, normal replies and user configuration unchanged. Original ai_desktop_pet and config.local.json not accessed. No real credentials or user conversations used.

Files: context module, existing context tests, new privacy tests, docs/avatar-brain-privacy-filter.md, feature_list.json, progress.md, this handoff and its archive. Thirty ordinary and 37 sensitive synthetic cases, truncation/order/context regressions. See report for old rule audit and limitations.

Validation:96 targeted passed;final complete scripts/test-local.ps1 with D TEMP/TMP:1042 Python passed/3 skipped,82 Node suites and syntax/secrets/mapping gates passed. Public JSON and required py_compile gates passed. First-run synthetic fixture scanner rejection resolved without changing scanner or product logic. See progress.md for warnings/limits.

## PR234 follow-up
User reported four leaks;fixed Bearer ordering, strong English whitespace labels and Chinese separators.139 targeted passed;full D-drive TEMP/TMP gate1085passed/3skipped,82Node suites plus syntax/secrets/mappings passed. Original30+37 corpus preserved;new9 ordinary0false positives,new17 sensitive14→0misses. See updated report. Product change still only context module. Main sync NOT performed;three state conflicts known after PR233 merge.

Next:push follow-up and wait latest-head CI;keep PR234 draft and unmerged,author accepts. No private configuration reads or changes.

## Preserved upstream handoff (historical; PR233 is merged)

# Current — Live2D motion naturalization ready for PR/CI
## 2026-10-27 — Live2D 动作自然化完成本地验收，待 PR/CI
- 从 main5669e8a 建立 friend/live2d-motion-natural。仅 Live2D：新增可关闭的 pre-Core 身体包络/随机待机/完整姿态过渡，映射声明幅度与通道；原 playGesture/lookAt Promise/状态/时长不变，avatarRuntime、VRM/房间/brain/执行器及音频/跨窗口协议未改。
- Hiyori 原126ms上升沿beat路径在叠加开启时关闭，身体包络180ms保持/200ms attack/600ms release；不写嘴型，保留嘴型使用的原speechMotionBlend生命周期。新随机流独立于legacy Math.random；停用并可恢复SDK固定breath/eyeBlink，官方动作/物理/焦点保留。头身/表情/眼睑/手臂部件的最终姿态平滑交接；内部轻手势不抢显式请求。
- Verification Evidence：完整Python950通过/3skip；最终全部82 Node文件通过，语法Python197/JS260。最后仅文档示例路径被隐私路径规则拦截，已改环境临时目录写法，规则未放宽，复查secrets884通过。首次运行包、公开样例JSON及py_compile通过。新SAPI音轨准备工具实际运行成功。
- 4Hz脉冲实际驱动代码：Hiyori头部4Hz幅度0.012994→0.000258，Mao不引入4Hz头抖；嘴型逐帧严格相同，另测两秒句间停顿/恢复也相同。十分钟待机随机间隔/持续移动/种子复现、标点预算/停顿不增预算、替换/停止/官方切换/眼睑/部件过渡、RNG隔离/关闭零写入/组件恢复与坏映射测试通过。
- 关闭叠加后Hiyori原5280帧/394224有序调用及完整快照严格一致；Mao协议1440/25850、本机真实Core6/Mao1440/181030一致。仅原Hiyori测试输入加false开关，未改frozen fixture、SHA、预期快照或阈值。
- 真实本地Hiyori/Mao前后各120秒/1800帧/15fps，60Hz更新，共四段有声成片；30秒待机、四句话、连续三手势、官方/参数交接和恢复，含头部特写/场景名/署名。为了比较同一输入，QA两边均固定官方Idle[0]；两模型实际Core嘴型成对1800帧严格相同，三手势Promise结果前后相同，零页面异常。媒体已解码验证，音轨发声段mean -24.4dB/max -1.8dB。受控SAPI/RMS回放，不冒充真实设备延迟/主观验收。
- 新增本地QA/音轨工具与说明。工作日志及截图/源帧/录像/SHA均仅仓库外outputs/live2d-motion-natural及work/live2d-motion-natural-*.log。模型、私密配置、Key、录音/媒体不提交；不读取别人配置，不覆盖安装版。
下一步：正常push本分支、独立PR到main，记录四段草稿录像附件链接，等待当前head全部Linux/WindowsCI后交作者Windows验收；不自行合并，不main/force push。主观自然程度/模型绑定限制和无时间戳时按整次播放限额见docs/live2d-motion-natural.md。

## 2026-10-27 — PR233 同步作者新合入的 PR232
发布PR233时发现main已推进到582f19e（执行器词表）。正常merge；仅feature_list/progress/session三个状态文件冲突，保留两边feature及progress历史。主线主动归档的旧handoff继续保存在docs/archive/session-handoff-before-gesture-vocab.md；当前handoff保留本Live2D验收摘要和主线新摘要，不恢复大段已归档历史。所有brain/执行器/主线产品与测试自动合并，未做手工修改；avatarRuntime不在本PR改动中。
下一步：以新main重跑完整本地/打包检查，确认主线brain/执行器文件逐字节一致；正常push233并等所有CI，不自行合并。四段录像以原5669e8a作修改前基线，Live2D实现未因这次同步改动，原对照保持有效。

主线新摘要（历史；PR232已合并，以下旧发布指令不适用于本任务）：

# PR232 reply and claim repair — current

Same vocab branch/worktree. User authorized these two fixes, draft only. Full D TEMP/TMP test-local978 Python/3skip,82 Node and syntax/secrets passed. Fixed narrow abstain filtering, normal-response body guard/prompt, fixed claim rejection reasons plus bounded frontend diagnostics/backend lifecycle debug. No renderers/mappings/private config changes. Saved historical plan was never claimed, exact old invalidation cause unavailable; four-turn synthetic replay all8actions completed. Completed:10ef902 all CI passed, then real Mao same-four-prompt daily300.953s run:4normal replies/0abstain/0empty,1plan wave+nod2completedACKs,4calls4496tokens. Report records all outcomes/video and unresolved historical cause. Test instances stopped. Latest follow-up only documents evidence. Keep PR232 draft and wait author; no merge.

# Brain gesture vocabulary — 2026-10-27

Worktree D:/AI/ai_desktop_pet_vocab, branch codex/brain-gesture-vocab-v1, baseline origin/main 5669e8a. User asks draft PR only, no merge. No private config read/write, original ai_desktop_pet prohibited. No changes to VRM/Live2D renderers or mappings.

Protocol/controller/executor integration and tests implemented. Unified playGesture Promise + AbortSignal, capability-based gestures, directional Live2D lookAt, VRM legacy fallback. Backend preserves closed renderer reason codes. Report docs/avatar-brain-gesture-vocab.md.

First complete local gate passed 968 Python/3skip; then added reason preservation regression (4 targeted tests pass after correcting the test's internal storage key). Final full rerun crashed in existing Torch/transformers native model loading in test_obsidian_knowledge.py while recording. No knowledge product/test changes. Isolated rerun revealed C-temp disk exhaustion; using dedicated D TEMP/TMP yielded final full969 Python/3skip,82 Node,syntax/secrets pass. No unrelated test/product modifications.

Hiyori real daily five-minute recording completed (4 DeepSeek requests, five gesture ACKs completed, no real gaze actions); screenshot-at-end timeout, but entire331.52s WebM decodes. See report for usage/evidence limitations. Mao manifest not found outside prohibited original repo; asked user for accessible path; still pending. Do not silently skip this acceptance or claim complete. Raw/media evidence stays ignored.

Next: await Mao path for five-minute run and real gaze coverage; implementation published as draft only after push gates. If publishing before missing model is supplied, explicitly mark acceptance incomplete. Preserve main and all model/private files.

## Mao follow-up supersedes missing-path blocker
Author provided D:/AI/local-models/live2d/Mao; copied (not linked) to ignored models_local/Mao. Mapping modelChecked:true, no errors/warnings. Five-minute run captured, but no terminal ACKs and model abstain text; additional65s real DeepSeek diagnostic completed wave/look_at left with twoACKs. See report for exact evidence, usage, unresolved first-run behavior. No product modifications in follow-up. Both test servers/browsers stopped. Never upload videos/models. Keep PR232 draft; author decides acceptance. When worktree is eventually removed, remove its copied model too, never original source.

更早历史见 docs/archive/session-handoff-before-gesture-vocab.md；本任务仅由作者验收合并。

Verification Evidence（同步main582f19e/#232后的最终组合）：完整scripts/test-local.ps1通过，978Python/3skip、83Node，语法197/261、secrets887；first-run package、公开样例JSON和py_compile通过。主线brain/执行器/avatarRuntime/VRM文件相对origin/main零diff，严格fixture零diff；Hiyori5280/394224与Mao1440/25850、实际Core6/Mao181030仍通过。四段最终有声MP4已上传既有草稿验收附件，作者须登录写权限查看；本地ZIP与16张比赛过程截图已保存，成片与ZIP校验后清理7200张重复帧释放377MiB。下一步正常push更新PR233并等当前head全部CI；作者Windows验收和合并，本任务不合并。

## Current authorization supersedes historical publish instructions
User explicitly approved merging PR234 after final fix and green CI. Main66326b9 merged here;only three state conflicts resolved preserving both records.159 targeted tests passed;combined full gate pending. No private config read/change.

Final combined verification:1105Python passed/3skipped,83Node suites and all local gates passed using D TEMP/TMP.159 targeted passed. Final code uses bounded label scanning and complete-value redaction. Push and CI-gated authorized merge234 next;prior draft-only instructions superseded by user confirmation.
