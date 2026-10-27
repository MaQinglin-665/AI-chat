# Current — Mao PR #228 已发布，作者 Windows 检查后合并
## 发布检查点 — PR #228
已正常推送 friend/avatar-live2d-mao 并创建可审查 PR：https://github.com/MaQinglin-665/AI-chat/pull/228 （base main9d09edc）。仅7个预期文件；本地工作区干净，未提交模型/配置/媒体。最终真实QA输出20截图/4切换/63授权/1拒绝/0页面异常，截图包仅本地。Linux/Windows CI 的最终状态以 PR 当前提交检查和仓库外 outputs/mao-acceptance/ci-final.json 为准；需要全部成功且无冲突才报告可实机检查，不自行合并。#226 的8723067已全部CI成功，用户试听待定。

完整本地与打包门禁证据见下方。重启时检查 PR 当前 head 的全部 CI；不要重复创建 Mao PR，也不要推送或合并 main。

# Current — Mao 独立验收本地完成，待推送与 CI
- 分支 friend/avatar-live2d-mao 直接基于 main9d09edc，不含未合并226。取消加载三种等待边界回归通过；只改取消检查，不改正常时钟/参数顺序。
- 真实 Mao 五元音/3回退、8表情/8动作、3手势×5阶段和wave停止/到期通过；Mao/Hiyori配置两轮切换、实例/Blob/事件清理通过，零脚本错误，20张截图仅本地 outputs/mao-acceptance。
- 完整932Python/3skip/74Node、语法194/243、secrets853、package/JSON/compile通过。Hiyori严格5280/394224/42保持，快照未改。
- 下一步：正常push本分支并开独立PR到main、附到当前聊天，等待Linux/Windows CI；作者Windows实机检查后合并。不得自行合并/main/force push；网络push失败间隔10秒最多5次。
- #226 已推送8723067/可审查，Linux/Windows全部10项CI成功且无冲突，用户已被告知可试听；不把226混入Mao，不覆盖安装，不提交模型/媒体/私人配置/Key。旧记录保留如下。

# Current — Mao 验收与发现问题修复
## 2026-10-27 — 独立 Mao 验收开始
#217 已由作者合并为 main9d09edc。#226已同步该main并推送8723067，全部10项Linux/Windows CI成功且无冲突，已通知用户实际试听，未自行合并。当前新分支friend/avatar-live2d-mao直接从最新origin/main建立，没有fork，也不包含未合并的226。基础Mao适配已随217进入main，本任务只补实际五元音、8表情、3手势、动作和配置切换验收，修复复现问题；保存本地证据后独立PR。模型/私密配置/媒体/Key不提交，不改对话/记忆/外部执行，不覆盖本机安装。

下一步：在真实本地Mao上补强断言并测试配置切换；先复现再修复。完整本地/打包检查后正常push并开独立PR，作者Windows检查后合并。旧记录保留如下。

# Current — PR217 latest-main conflict fixed locally; publish/allCI/GitHub mergeability next
- User reports27301c0CIgreenbutCONFLICTING aftermain1012e13/#225. Mergedmain1012e13as82ea405; only3state conflicts, preserved both histories + incoming middle notes, no product conflict. Ancestryexit0. Allmainbedroomcontroller/CSS/API/assets and8VRMscene modules preserved; renderer differs onlyapprovedclockownership.
- Verification Evidence: strict5280frames/394224calls/42scenes; browser1030/167741/fourPNGpairs/10reloads;10mainHiyoriBackdrop/VRMNode +36Python/1skip; full932Python/3skip/74Node,syntax194/243,secrets853;package/JSON/compile pass. Logswork/pr217-main225-* and evidenceoutputs/pr217-main225 outsideGit. No privateconfigread/installedappchange.
- Next normalpush217/ready, awaiteveryLinux+WindowsCI onexacthead AND GitHubmergeable=true/mainstill1012e13, thennotifyauthorinPRcomment. Stop ifuncertainproductconflicts or newer main needsreview; no selfmerge/force/mainpush. Networkpushretry10s/max5.
- #226friend/lipsync-fix and laterMao stillwaitauthor217merge. No defaultVRM task or model/privateconfig/key commit; Sendagaya remainsignoredmodels_local.01Hiyori standalone videoalreadyprovided,userforwards; neverclaimauthorviewed. Historicalrecordsbelowpreserved.

# Current — PR217 conflicts after #225 landed; sync main1012e13
- User2026-10-27 reports217head27301c0/open/CIgreen butCONFLICTING andmain1012e13notancestor. Cleanlocalfriend/avatar-live2d-adapter matches remote; explicitfetch confirmsmain1012e13nowincludes225bedroombackdrop. PriorCIgreen did not cover this later main.
- Scope: merge latestmain, preserve upstreamVRM/room/camera/backdrop numeric behavior and approved Live2DPixi clock, resolve only clear conflicts; ask author on uncertain choices. Rerun specified strict tests, all mainVRM/scene/backdrop tests, full test-local/package, normalpush/ready then all Linux+WindowsCI. Never selfmerge/main/forcepush; networkpushretry10s/max5.
- #226friend/lipsync-fix and separateMao stage3 remain blocked on author merging217, do not sync/start now. Sendagaya remains ignoredmodels_local; no defaultmodel task or model/privateconfig/key commit.01 standalone video alreadyprovided/userforwards; do not claim authorviewed01.
- Next inspectactualmergeconflicts. No privateconfiguration read or installedapp change.

# Current — PR217 latest-main gates passed; publish and await all CI
- Merged main1ab5d38/#227 asf73125f; #221/#224 included. #225 stilldraft/unmerged atfetch. Only3state conflicts preserved both histories; no product conflict/behavior choice. VRM beyond approved clock movement +8scene/camera/background modules matchmain byte-for-byte.
- Verification Evidence: exactadapter+sequence Node5280/394224/42, browser1030/167741/fourPNGpairs/10reloads;9VRM Node +32Python/1skip asset/backdrop; full928Python/3skipped/73Node,syntax194/241,secrets847;package/JSON/py_compile passed. Logswork/pr217-main227-* outsideGit.
- Standalone01Hiyori38.4sMP4 supplied, user explicitly forwards it. Author has not yet confirmed viewing01; required before merge. Author already viewed02–04. No model/media/private config/key changes. Existing installed120ms untouched.
- Next normalpush friend/avatar-live2d-adapter, ready217, wait everyLinux+WindowsCI on exacthead and notifyauthor inPRcomment. Never selfmerge/main/forcepush. Networkpush retry10s/max5. Then stop until author merges217; no226sync/Mao stage3/defaultVRM task yet. This supersedes historical authorization text below.

# Current — author requests fresh PR217 synchronization and full CI
- Latest authorization: resend separate01 Hiyori38.4s video, then prioritize #217 latest-main merge/strict+all VRM-room-camera-background/full/package tests, normal push/ready and allLinux+WindowsCI; author merges, never self-merge/force/main push. Stop and ask if conflict choice ambiguous.
- Fetchedmain1ab5d38 includes#221/#224/#227. GitHub#225 stillopen/draft, not merged; leave it out until onmain. Original217ready/open/unmerged0c08c3d. PR226ready/open/unmerged943b690; do not sync it until author merges217. Separate friend/avatar-live2d-mao also waits; do not initiate stage3 now. No model/defaultVRM task; officialCC0Sendagaya stays ignoredmodels_local only.
- Separate01 localMP4 link provided in chat; no direct author receiving channel available, so do not claim delivered externally. File outputs/馨语桌宠_录像分享包_20261026/01_Hiyori功能检查_约38秒_无声.mp4 hash matches original.
- Next mergeorigin/main and preserve upstream product behavior exactly; current upstream difference is#227 backend/state/package/tests, no renderer/scene changes. Update verification evidence after actual reruns. Older authorizations below are historical.

# Publication checkpoint — PR217 includes new main #224
- Latest main2b67452 also merged38f0497. Final full896Python/3skipped,73Node,syntax191/241,secrets843;package and required JSON/compile pass. Exact Node5280/394224/42 and browser1030/167741 complete sequences strictly equal again. Hiyori code/video unchanged by #224. Publish normal push; ready; author decides merge. Then separate lipsync branch from2b67452. No brain phase2.

# Current — PR217 verified for publication; shared lipsync separate

- Priority1 complete locally on friend/avatar-live2d-adapter: explicit latest main79ee80f (#221/#222) merged8d514b7, VRM/Live2D/notices/state histories retained. Prior browser timing prototype removed from product through normal inverse patches; original installed120ms remains working locally.
- Verification Evidence: exact Core6 Node5280/394224/42scenes and browser1030/167741 ordered calls/snapshots strictly equal; four identical PNG pairs/ten reloads. Full861Python/3skipped,72Node,syntax186/239,secrets834;docs4/package/JSON/py_compile passed. Final guard confines painted controls to VRM.
- Dedicated realHiyori/Pixi/Core6 silent controlled-browser inspection video38.4s at outputs/pr217-closeout/Hiyori-PR217检查录像.mp4; reviewed clear/visible. No native Windows or realTTS timing claim, no media/models/private assets committed.
- Next publish normal commit/push, update existing PR217 body/ready and deliver video, then create friend/lipsync-fix directly from freshly fetched main. Do not merge/main/force push. LLM task phase2 waits for author merging#217.
- Shared lipsync: preserve existing FFT1024/25–350ms output latency policy/hidden timer. Generalize event-owned browser mouth across Hiyori/Mao/VRM, test/record before-after separately; strict adapter snapshots belong only to217. Prototype patches outsideGit outputs/lipsync-separated. User has noVRM: first verify official VRoid help CC0 for AvatarSampleD–G or SendagayaShino; neverA–C/privateauthorVRM, model underignored models_local only. User reconfirms priorityHiyori first.

## Preserved latest-main handoff

# Painted accepted integration — 2026-10-26

Worktree ai_desktop_pet_painted; branch codex/avatar-painted-backdrop-v1. User accepted #221 and authorized main integration, full tests/package, post-merge night screenshot, ready/CI/admin merge, evidence preservation and worktree removal. Main ee3de6e includes #220/#222. Only extra conflict is metrics in vrmRenderer.js; user approved retaining walking plus painted metrics. Camera algorithm untouched. Prior handoffs archived.

Next: run camera/motion/painted tests, full gates, verify natural idle and fixed painted camera. Preserve ignored evidence before removal. Then create codex/backdrop-assets-v1 from latest main, commit authorized backgrounds and add default-off Hiyori background switch. Never read private config or use 8123.

Targeted/full/package gates and merged night capture passed; fixed camera verified across 12s. Next: push integration, mark ready and wait all Linux/Windows CI before authorized admin merge.

## Preserved collaborator handoff

# Session handoff

## Current — user listening confirms mouth timing; preserve120ms
- User reports mouth starts before audio and freezes before sentence finishes. Reproduced old controllers: before-onstart mouth0.0122708; long-speech tailVariation0 while synthesis still speaking. Added browserLipSync.js gated to mapped Live2D/Mao: actual utterance start/end/error/pause/resume/boundary owns mouth, no estimated sentence-duration clamp; token/generation fences. Default120ms start compensation, configurable avatar.browser_lip_sync_delay_ms0..500; not a measured device latency. Hiyori/analysed-audio path unchanged.
- TTS lifecycle events wake the existing taffy-speech loop immediately via avatar-mouth-playback event; no second avatar frame/render clock. Same shared runtime, original Pixi pre-Core writes. New helper script tag, bounded public delay config and regression tests only; no dialogue/memory/external execution implementation changes.
- Verification Evidence: full scripts/test-local.ps1 passes849Python/3skipped,67Node,syntax184/228,secrets810;docs4 and required JSON/py_compile pass. Hiyori strict Node5280/394224 and browser1030/167741 calls/snapshots/four PNG pairs unchanged. Real Core6/Mao callback simulation: pending/guard/pause/end0, late speech variation0.662;16 captures/8 actual motions/21 auth resources/unauth401/no JS errors. Logs work/avatar-mouth-sync-*.log; evidence outputs/avatar-mouth-sync/mao-evidence.json. No claim of live audio measurement.
- Actual D:/app/DesktopPet updated/restarted:6 bounded playback/mouth/config/index files, original private config/keys/data/model assets preserved;5 served public assets hash-match, delay120, actual model page ready/Mao/Core6/132/no script errors. Rollback/evidence outputs/installed-mouth-sync. Current original app may hide independent pet while chat stage visible.
- Implementation50ef8c9 and publication31597e1 pushed normally to #217; verified open/ready/unmerged. On2026-10-26 user listened and confirms "基本对齐，结尾也跟上了". Keep120ms; do not retune without a new report. This is subjective listening confirmation, not measured exact latency or full author Windows acceptance. Next author reviews remaining interaction/appearance and decides merge. No main/force push/PR merge.

# Session handoff

## Current — user requests Mao speech/mouth synchronization fix
- User reports both early mouth onset and frozen/closed mouth while speech is still playing. New authorized work supersedes prior review stop only for this bounded playback/mouth fix. Keep dialogue, memory, external execution and all credentials unchanged.
- Current branch1a3885a clean. Read AGENTS/state and playback/expression/bridge/runtime. Existing tests and strict Node5280/394224 baseline pass. Browser fallback uses a sentence-duration-clamped pseudo-syllable curve and synthesis.speaking can precede onstart; investigate/reproduce these instead of adding a blanket sentence delay.
- Next reproduce actual callback/timeline behavior, implement event-owned mapped-Live2D mouth timing with long-speech/pause/end/cancel/stale tests, preserve Hiyori exact regression, update local D:/app/DesktopPet after backup and normal push same open PR217. No new model assets/config/secret changes, merge/main/force push.

# Session handoff

## Current — stage3 published, PR217 ready; author Windows review next
- Final follow-up corrects browser TTS without spectrum: mapped Live2D uses the existing mouth envelope only when no analyser exists, broadcasts analysis availability, keeps analysed silence and stale packets closed. Full849/3 +66Node +syntax184/226 +secrets808 +docs4 pass; actual Mao fallback and Hiyori1030/167741 strict comparison pass again. Installed app updated/restarted and ready/Mao reverified. Follow-up remains on same ready PR; author Windows review next.
- User approved stage3 and local Mao switch. Implementation9657a30de1083ef060a0b87429349253d7a21320 pushed normally to friend/avatar-live2d-adapter. Existing PR217 title/body updated, verified open/non-draft/unmerged/base main. Python/Node/Docs/Quality CI succeeded; Windows was running at publication. No main/force push/merge.
- Complete local gate and exact Hiyori/actual Mao evidence recorded below and in docs/avatar-live2d-mao.md. Local app installed/restarted; old installed CSP blob incompatibility fixed; actual backend model page ready/Mao/Core6/132 parameters/no JS errors with authentication. Independent desktop pet hides while chat stage is visible; minimize chat to reveal it. Model/config/screenshots remain local, competition directory contains30 labeled captures.
- Stop here. Author must review original Windows appearance, real voice, drag/clickthrough/window switching and decide merge. No additional implementation authorized beyond this completed scope. Do not treat historical phase holds or older main-merge permissions as current work.

# Session handoff

## Current — stage3 implemented and installed; publication next
- User explicitly approved stage3 and local Mao switch. Official local assets remain ignored; no new vendor/Core changes. Shared runtime/Pixi pre-Core path retained; Hiyori legacy layers never run for Mao.
- Added bounded authenticated manifest resources, private Blob loader with instance-local Pixi URL workaround, Mao mapping/driver, conservative five-vowel estimator and validated original speech bridge fields. Unknown intents ignored. Eight official expressions/motions and three A-arm gestures mapped; actual authored motion semantics and small arm ranges documented honestly in docs/avatar-live2d-mao.md. UI attribution retained.
- Verification Evidence: scripts/test-local.ps1 passed 849 Python/3 skipped, 66 Node suites, Python184/JS226 syntax, secrets807; final doc-inclusive scan808. SameCore Hiyori Node5280 frames/394224 full calls and browser1030/167741 calls/snapshots strictly identical, four identical PNG pairs, ten reload disposals. Real Mao16 captures, all8 native motions actually played,21 authenticated resources, unauth401; docs4 smoke and required JSON/py_compile pass. Logs outside Git in work/avatar-stage3-*.log and avatar-mao-browser.log.
- Local D:/app/DesktopPet updated with13 minimal avatar files, official models_local/Mao and only config.local.json avatar preference. Other keys/private files preserved, executable/config rollback copies outside Git at outputs/installed-avatar-mao-update. Initial empty renderer caused by old installed connect-src missing blob; narrowly backported upstream policy, restarted, actual served model page verifies ready/Core6/Mao/132 parameters/no JS errors. This is isolated browser evidence, not native desktop capture. Original app hides independent pet while chat stage is visible.
- Competition captures now30 with manifest/descriptions outside Git; new17 include16 model checks plus actual installed page. Clearly credit Live2D sample art and distinguish explicit test intents from real voice.
- Next: normal commit/push existing branch, update #217 and mark ready, then stop for author Windows drag/clickthrough/voice/appearance review. Do not merge/main/force push. No dialogue/memory/external-agent implementation edits, model/private files or screenshots staged. Historical holds below are superseded by explicit stage3 confirmation.

# Session handoff

## Current — user confirmed stage3 / local Mao switch
- User explicitly confirms proceeding after learning the desktop is still Hiyori. Prior stage3 hold is superseded. Implement original stage3 scope, update the actual local install, push #217 and mark ready for author review; no merge. Model assets/config/secrets/screenshots remain local only. Preserve exact Hiyori writes and original Pixi clock.
- Official SDK Web5-r.5 contains Mao (five vowels, 8 expressions/8 motions); inspect sample-specific terms and rig before mapping. Need bounded read-only manifest resources for ignored models_local/Mao; keep auth/link/traversal boundaries. No dialogue/memory/external-agent changes.

## Current — stage 2 published as draft; Windows review next
- Author approved the plan and Core6. Independent Core commit b39ab99 precedes mapping; docs/live2d/vendor Core/display stay byte-identical. Older proposal-only/Core-local stops below are historical and superseded.
- Implemented one avatarRuntime factory/frame/events path, Live2D six-method adapter and JSON parameter/pose/channel mapping. Renderer-owned clocks preserve Pixi HIGH update, style -> micro -> Core order; VRM RAF/20/30 FPS/hidden suspension moved intact. Original Live2D hit/drag/clickthrough retained with cleanup. No Live2D parameter RAF.
- Exact b39ab99 Git blob references are pinned in tests/fixtures/live2d-before-mapping. Actual Core6 Node test passes 5280 frames/394224 complete calls and snapshots; real Pixi browser passes 1030 frames/167741 calls/snapshots, four identical canvas PNG hashes and ten real reload disposals. Unknown/missing/custom mappings, direct/shared intents and 100 drag releases/active-drag disposal pass. Never relax strict equality.
- Final complete scripts/test-local.ps1 passed after implementation and mapping review (838 Python/3 skipped, 65 Node suites, Python183/JS221 syntax, secrets800). Docs check:all passes four browser cases; required JSON/py_compile/vendor hashes pass. Logs outside Git in work/avatar-stage2-*.log. Report docs/avatar-live2d-stage2-verification.md; screenshots outside Git at outputs/avatar-live2d-stage2-implementation and competition capture directory.
- Implementation 94a9fca and independent Core6 b39ab99 pushed normally to friend/avatar-live2d-adapter. PR217 title/body updated and verified open/draft/unmerged with base main; initial Node/Docs/Quality CI passed, Python/Windows were running at publication. This state-only checkpoint records publication. Next stop for author Windows review; keep draft. No model/private assets, docs vendor, dialogue/memory/external-agent changes; no main/force push/merge; no stage3.

## Current authorization - Live2D stage 2 (2026-10-26)
- User confirms stage 1 passed author review and authorizes stage 2. Merge latest main, preserving both Live2D and VRM records. Only four expected conflicts occurred and were resolved without dropping either side.
- Next read docs/avatar-vrm-basic.md, docs/avatar-3d-room.md and web/avatar/avatarRuntime.js before designing changes. Use its single renderer selection path, frameFromState and avatar-intent events. If unsuitable, stop with a proposal instead of a broad rewrite.
- Evaluate Core 6 locally with before/after screenshots and Node results, report honestly; no Core commit until author confirmation. Mapping-only Hiyori behavior preservation, draft PR and stop for Windows review. No model/private assets, dialogue/memory/external-agent implementation changes, main push, force push or PR merge.
- Main merged as 97ceb92 from 2356ddb. Required documents and actual runtime read. The entry is still VRM-specific (factory, QUALITY, EXPRESSION, hitTest/isAnimating), while Live2D has its own Pixi/Core hooks. Per user condition, stop implementation and present docs/avatar-live2d-stage2-plan.md for author confirmation; no runtime refactor or mapping added.
- Core comparison on merged baseline: temporary Core4/Core6 each pass all 63 Node files; original Core restored byte-identically. Actual browser Hiyori renders in both, but fixed raw-Core PNGs differ by 49/13/6 white-composited pixels (max 0.01327%, RGB delta <=5), geometry max delta 0.0000012069940567016602. Report docs/avatar-live2d-core6-comparison.md does not claim exact equality or full Electron acceptance. Captures/logs/backup are outside Git at outputs/avatar-live2d-stage2; no Core staged.
- Four focused Avatar/scene/display groups, full post-merge scripts/test-local.ps1 (838 Python passed/3 skipped, 63 Node suites, Python183/JS213 syntax, secrets788), and docs check:all (4 browser cases) pass. Full log: work/avatar-stage2-merge-full-tests.log. Publish only the proposal/report/state checkpoint for author review; do not implement or claim stage 2 complete. Both original handoffs remain preserved below; historical merge permissions do not apply.

## Preserved Live2D checkpoint history

# Session handoff

## Current follow-up — PR #217 Windows output encoding (2026-10-26)
- User asks to check the PR. At head f641cbf both Windows jobs failed the three new launcher tests because CP437 redirected output replaced Chinese with question marks; exit 37 and batch pause still worked. Python/Linux, Node, docs and quality jobs passed. PR stays draft/open/unmerged, with no reviews or comments.
- Narrow repair: scripts/start-electron.ps1 sets UTF-8 only when stdout is redirected; source BOM retained and interactive settings untouched. tests/test_node_runtime.py now exercises actual helper and batch failures under CP437/CP936/UTF-8. Explicit -Command wrapper exit preserves the tested original code; batch starts in a checkout path containing spaces.
- Verification Evidence: reproduced all three CP437 failures before the product fix; all 13 targeted tests pass after it. Full scripts/test-local.ps1 passes: 818 Python passed/2 skipped, 60 Node suites, Python181/JS205 syntax and secrets766. JSON/py_compile and BOM checks pass. Log outside Git at work/avatar-pr217-encoding-full-tests.log. Commit/push this repair to the same draft PR, consult GitHub for current CI state and wait for the new checks before reporting success. No stage 2, Core/model upload, main push, force push or merge.

## Published stage 1 checkpoint — draft PR #217 (2026-10-25)
- User explicitly requested GitHub upload after the local stage 1 report. Pushed friend/avatar-live2d-adapter normally and created draft PR https://github.com/MaQinglin-665/AI-chat/pull/217 to main; attached to this task. Implementation commits are 6adf36b and 2f3500b. A state-only publication checkpoint follows those two independent implementation commits.
- This later instruction authorizes branch publication despite the earlier stage 1 no-push checkpoint. It does not authorize stage 2/3, ready-for-review, main push, force push or merge. PR describes current Core staying unchanged, new Core/model/screenshots excluded, limited display compatibility and all local validation.
- Before push, JSON/py_compile and actual vendored UMD regression passed again; prior complete local gate remains 812 Python passed/2 skipped plus 60 Node suites and syntax/secrets. New Core remains outside Git. No need to rerun runtime tests for this state-only checkpoint.
- Next: verify the final branch/PR head and CI snapshot, then wait for author/user review and explicit stage 2 approval. Do not follow historical merge authorizations preserved below.

## Current task — Live2D stage 1 checkpoint: display fixed, new Core stays local (2026-10-25)
- Branch friend/avatar-live2d-adapter now based on main 5b20358. AGENTS.md and docs/avatar-intent-interface.md v1 read. Prior preparation records preserved via stash 9bd2080 plus an external patch; only own entries restored onto current state.
- User scope: stage 1 has two independent commits (launcher guidance, then official Core compatibility), then stop for confirmation. No stage 2/3 yet. Pause large-file splitting. No main push/force push/self-merge; no dialogue/memory/external-agent implementation edits.
- Launcher investigation: #211 delegates npm to scripts/start-electron.ps1; batch failure pause still exists, but npm-specific guidance was lost. Restore friendly Chinese failure guidance and batch exit handling without reverting local Node, npm ci or mirror support.
- User explicitly confirmed both SDK agreements at action time, authorizing agent acceptance/download. Official SDK ZIP is C:/Users/Feng2/Documents/Codex/Live2D-downloads/CubismSdkForWeb-5-r.5.zip; SHA256 67064a7fb1812cf502f5c4a03bfe12cc638c75a621bb4acf06bb28763df06ba0. Core/license/changelog and the included Mao moc5 were extracted only outside Git for local evaluation; no model integration.
- Existing Hiyori baseline screenshots/version/hash evidence remain outside Git under outputs/avatar-live2d-stage1; four relevant hashes match after main update. Competition process screenshots are under outputs/比赛材料/04_创作过程截图, never committed.
- Launcher implementation and verification complete: scripts/start-electron.ps1 restores Chinese npm guidance; start_electron.bat preserves pause and the original failure status; tests/test_node_runtime.py adds isolated Windows regression coverage. Verification Evidence: targeted 7 passed; full scripts/test-local.ps1 passed with 812 Python passed/2 skipped, Node suites, Python/JavaScript syntax and secret scan (764 files) passed. Full log remains outside Git at work/avatar-stage1-launcher-full-tests.log.
- Independent launcher commit: 6adf36b. Initial diagnostic: SDK Core 06.00.0001 (100663297, max moc6) decodes included Mao moc5 (132 parameters, 262 drawables), but upstream display 0.4.0 failed in doDrawModel and blanked Hiyori. The display compatibility patch below resolves this. Core-only geometry comparison: 17544 scalars, max delta 0.0000012069940567016602.
- RedistributableFiles.txt lists minified Core, but official https://www.live2d.com/en/sdk/license/expandable/ has publication conditions potentially relevant to model import. User confirms no known publication permission and requests Core remain local, then explicitly requests task continuation. Honor both: only commit the display compatibility change; new Core is not copied/staged/committed. No stage 2, push or PR.
- Stage 1 / change 2: minimal project-maintained display 0.4.0+ai-chat.core6.1. Existing Core path/behavior stays intact; embedded Framework getter falls back to Core 6 model.renderOrders. Cubism 5.3 offscreen effects explicitly unsupported, with a clear error. No Pixi migration/dependencies. Repro script scripts/patch_live2d_display_core6.py, actual UMD regression tests/test_live2d_core_compatibility.js registered in Node runner, sources/licenses recorded in THIRD_PARTY_NOTICES.md.
- Verification Evidence: full scripts/test-local.ps1 passed (812 Python passed/2 skipped, Node, Python181/JS205 syntax and secrets766); JSON/py_compile passed. Reproducibility/idempotence/tamper rejection checks passed. Actual final bundle browser probe passes Hiyori/Core4 and Hiyori/Core6 plus SDK Mao/Core6 without page errors. Three fixed-input old-Core Hiyori pixel snapshots exactly match upstream. New Core geometry drift max 0.0000012069940567016602 over 17544 scalars.
- Local scripts/logs/evidence are outside Git: work/avatar-stage1-core-compat.cjs, avatar-stage1-core-patched.log, avatar-stage1-display-full-tests.log; outputs/avatar-live2d-stage1/core-patched-compatibility-evidence.json and screenshots. Earlier compatibility failure evidence is retained as history. New Core/model files remain outside Git, repository Core copies unchanged. No vowel/expression/gesture mapping work has started.
- Second independent local display compatibility commit complete (see git log). Next: report stage 1 checkpoint including the explicit Core-local exception, then wait for user confirmation before stage 2. User has not yet confirmed this checkpoint; do not infer stage 2 approval from the earlier generic continuation request. No implementation work remains for this display patch; new Core inclusion/publication permission remains deferred.

## Prior handoff preserved from updated main

## API rejection body drain (2026-10-25)

Branch: codex/fix-api-reject-drain-body, based on main b9d9354c237b43e353d066a97ef7309e2434267f. PR #214 merged with all Linux and Windows checks green. Earlier integration handoff preserved in docs/archive/2026-10-25-before-api-drain-handoff.md.

User authorizes a bounded request-body drain before token/origin denial, tests, push and a PR, then merge commit only after all CI passes. No force push, direct main push, branch deletion, tags, releases or private configuration changes. Stop on unexpected test/CI failure. DNS push failures: retry at 10-second intervals, at most five attempts.

Files touched: app.py, tests/test_api_health.py, tests/test_request_body_drain.py and these state records. Drain is limited to 1 MiB and a two-second deadline; invalid/oversized/ambiguous framing closes the connection without reading. No authorization defaults changed. Targeted tests: 38 passed, including 30 unauthorized 64-KiB POSTs and 30 disallowed-origin POSTs with complete JSON responses.

Verification Evidence: full scripts/test-local.ps1 passed: 809 Python passed, 2 skipped; Node suites, Python/JavaScript syntax and secret scan passed. Required JSON and py_compile checks passed. Log: ignored tmp_ui_smoke/task6/drain-body-full-tests.log.

Next: submit PR to main, require all CI then --merge --admin. Fetch merged main and rerun scripts/test-local.ps1. Final report must include both merge hashes and final main hash.

Limitations: malformed, oversized or stalled clients may still see connection closure; stable JSON delivery regression covers complete bounded bodies. Prior external-agent metadata verification followups and blocked isolated-directory cleanup remain unchanged.


## Preserved upstream VRM and room handoff

# Session handoff — VRM room proportions (2026-10-25)

Branch codex/avatar-3d-room-v1, User passed PR #218 visual acceptance and authorized merge commit on 2026-10-25 after fresh local/package gates and all Linux/Windows CI pass. Prior 91102ef introduced the room; user requested metre-scale furniture/depth/daylight corrections. Local main and 0a06554 remain untouched. Prior handoff archived in docs/archive/session-handoff-room-before-metres-20261025.md.

Changed vrmScene.js to metres independent of avatar height: shelf 1.8m, lamp 1.5m with 0.35m shade, window 1.2x1.4m with 0.9m sill. Wall z=-3m, furnishings z=-2/-2.65m, clean head backdrop. Added ceiling/skirting, distant partial pink crowns, moon/mixed-size stars/clouds, warm brighter daytime and procedural floor sunlight patch. Square wall seams prevent sky leaks; avatar-relative fog stays stable in wide inspection views. vrmRenderer only forwards camera depth. No dialogue/memory/external execution/Live2D/private config/model changes.

Verification: scripts/test-local.ps1 passed 829/3, all Node/syntax/secrets. Added metre dimensions, book range, clear backdrop, distance and unscaled-height tests; ten-cycle resource disposal still passes. Actual Electron VRM0 full/wide night/day captures inspected, ignored tmp_ui_smoke/avatar-vrm-polish/metres-{night,day}-{full,wide}.png. Temporary test-only camera pullback; no product camera change. Full idle 19.98 FPS, CPU 4.21%, GPU 5.19%, 38 draws, within baseline budget. Full dimensions and limitations docs/avatar-3d-room.md. First-run package not repeated: no defaults/installer changes; initial room version passed it.

Fresh merge gates passed: 829/3 plus Node/syntax/secrets; first-run package passed. Next: push acceptance notes, ready PR, all CI green, merge with --merge --admin, then test exact latest origin/main detached. Preserve local main/0a06554 and config.local.json. Three visual follow-ups recorded in progress.md are explicitly deferred. No model screenshots uploaded.


## Incoming main #224 handoff (historical; no merge authorization here)
# PR #224 accepted merge — 2026-10-26

User approved phase 1 and authorized merge commit after latest main integration, local/package gates and all Linux/Windows CI. Latest origin/main 79ee80f merged with conflicts ONLY in the three state files. Both histories preserved below; this current instruction supersedes their prior next-step text. No phase-2 implementation. Local main/private config must remain unchanged.

Next: finish gates, push/ready #224, wait for all checks, gh pr merge 224 --merge --admin, then stop. Phase 2 starts only after user notification that #217 has merged. Mandatory phase-2 additions are recorded in progress.md: <=300-character last-three-turn summary + 1–2 related memories; persisted local daily counter; explicit environment-key-only documentation.

## Preserved phase-1 record (historical)

# Avatar brain phase 1 — verified

Branch codex/avatar-brain-driven-v1 from origin/main ee3de6e. First phase backend complete; only a console debugger in the frontend. Report/schema/config/cost assumptions: docs/avatar-brain-actions.md.

Implemented world state validation and authenticated routes, same-call optional reply plans, bounded proactive timer/events and model timeout, cancellation of stale results, explicit speech/action ACKs into existing memory. Plans are never treated as completed experiences. No tool/system executor. Default disabled; only environment credentials for new calls.

Verification: final scripts/test-local.ps1 passed (865 passed, 3 skipped, 1 warning; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed. All new backend flows use fake models/worlds; HTTP security and temporary-memory-file roundtrip are real local tests. No real model/voice/movement/recording acceptance in phase 1. Ignored logs: tmp_ui_smoke/avatar-vrm-polish/brain-phase1-final.log and brain-phase1-package.log.

Files touched: three avatar brain Python modules; app.py, app_chat_route.py, llm_runtime.py, config.py, memory.py/memory_store.py; debug JS and index include; three test files, Node runner/package check; docs/state. avatarRuntime.js and vrmRenderer.js untouched. Local main 0a06554 and private config hash unchanged.

Limits: daily/hour limits are per process and reset on restart; phase 1 does not execute plans or automatically deliver proactive speech; ACKs trust the authenticated client. See report for costs/closed vocabulary/TTL.

Delivery: push this branch and create/attach a draft PR to main, then stop for user review. GitHub/attached PR state is authoritative if publication already completed; do not create a duplicate. Never merge. Phase 2 requires explicit user notice after #217 merges: adaptive FPS, frontend executor and real 10-minute acceptance.


## Preserved incoming main record (historical; separate worktree)

# Painted accepted integration — 2026-10-26

Worktree ai_desktop_pet_painted; branch codex/avatar-painted-backdrop-v1. User accepted #221 and authorized main integration, full tests/package, post-merge night screenshot, ready/CI/admin merge, evidence preservation and worktree removal. Main ee3de6e includes #220/#222. Only extra conflict is metrics in vrmRenderer.js; user approved retaining walking plus painted metrics. Camera algorithm untouched. Prior handoffs archived.

Next: run camera/motion/painted tests, full gates, verify natural idle and fixed painted camera. Preserve ignored evidence before removal. Then create codex/backdrop-assets-v1 from latest main, commit authorized backgrounds and add default-off Hiyori background switch. Never read private config or use 8123.

Targeted/full/package gates and merged night capture passed; fixed camera verified across 12s. Next: push integration, mark ready and wait all Linux/Windows CI before authorized admin merge.


Verification Evidence for #224 merge: scripts/test-local.ps1 passed (876 passed, 3 skipped, 1 warning; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed. Ignored logs: tmp_ui_smoke/avatar-vrm-polish/merge224-local.log and merge224-package.log. Three state-file conflicts resolved by retaining both histories and both feature entries; active task stays avatar-brain-driven-v1. No code conflicts or extra product fixes. Next: normal push, ready, all CI, authorized merge commit, then stop awaiting user notice about #217.


## Preserved incoming #227 handoff (historical; current priority remains PR217)
# Avatar brain context and persistent quota

Branch: codex/avatar-brain-context-v1, baseline origin/main 2b67452 (#224 merged).
Implemented backend-only context (last 3 rounds <=300 characters, <=2 local memory excerpts) and persisted daily/hourly quotas, plus env-Key-only documentation. No rendering or action execution changes.

## Verification
- Final full local gate: 908 passed, 3 skipped, 1 warning; all Node/syntax/secrets passed.
- First-run package check passed; targeted 67 passed, new suite 32 passed.
- Ignored evidence: tmp_ui_smoke/avatar-vrm-polish/brain-context-{local,package}.log.
- Fake LLM/temporary state only; no real provider or voice/animation acceptance.

## Files touched
avatar_brain_context.py, avatar_brain_usage.py, avatar_brain.py, app_avatar_brain.py, app_chat_route.py; new Python tests; package presence check, ignore rules, action docs and state files. Previous handoff archived.

## Limits and next step
Conservative filtering may omit technical context; excerpt summary can lose detail. History is repopulated by chat after restart. Unwritable/corrupt quota storage falls back to process memory, so cross-restart/shared limits cannot then be guaranteed.
Publish draft PR, stop for review. Do not merge. Frontend executor/FPS/real 10-minute acceptance await user notice about #217. Local main 0a06554 and private config unchanged; avatarRuntime.js/vrmRenderer.js untouched.

## 2026-10-26 merge authorization
User approved #227. Latest origin/main 2b67452 is already contained; no conflicts. Fresh full/package checks are running. Record the PRIVATE false-positive issue in progress.md only; do not change code. After successful local checks, push the documentation update, mark ready, wait for all CI, then use merge commit with --admin. Stop afterward; frontend phase 2 still requires user notice about #217.

Fresh validation passed: 908 passed, 3 skipped, 1 warning; all Node/syntax/secrets and first-run package smoke passed. Evidence in merge227-local.log / merge227-package.log under ignored tmp_ui_smoke/avatar-vrm-polish. Next: push, ready, await CI, authorized merge, stop.


## Preserved incoming main #225 handoff (historical; current217scope above)
# #225 accepted merge — 2026-10-26

User visually accepted #225. Integrating main 1ab5d38 with only three state-file conflicts; no product conflicts. Next: full local/package checks, required push checks, push/ready/all Linux+Windows CI, authorized gh pr merge 225 --merge --admin. Then back up ignored media under readiness tmp_ui_smoke, verify clean status and remove backdrop worktree; stop on policy rejection. This thread ends afterward; do not start incoming brain tasks.

## Prior backdrop handoff (historical)

# Backdrop assets v2 — 2026-10-26

Workspace D:/AI/ai_desktop_pet_backdrop; branch codex/backdrop-assets-v2 from main 79ee80f. Do not touch original readiness worktree. User requires clean ancestry excluding #223 original PNGs, WebP q88–92, accurate AI wording, control-center default-off switch, CSS-only Hiyori period filters and layout-following contact shadow. Preserve #223 branch; after new draft PR opens comment replacement URL and close #223 without merge. Test 8138, ignored captures, no private config/LLM.

Implementation complete; full gate 845/3, package smoke and isolated Hiyori visual checks passed. All screenshots under ignored tmp_ui_smoke/backdrop-v2. WebP total 1,787,060 bytes; original resolution and quality90. Next: publish replacement draft, explicitly comment replacement link then close #223 (no merge). Keep raw PNG history out; verify original blob IDs not reachable from new HEAD.

#225 follow-up completed: night brightness .80/saturation1 with slight purple-blue sRGB matrix; warm dusk without desaturation; stronger soft contact shadow. Full local gate 845/3 and targeted transition lifecycle tests pass. Final private captures tmp_ui_smoke/backdrop-color/{night,dusk,day}.png and *-face-clothes.png / *-feet.png. #223 is closed, #225 stays draft awaiting user review.

## Incoming main handoff (historical; not this task)

# Avatar brain context and persistent quota

Branch: codex/avatar-brain-context-v1, baseline origin/main 2b67452 (#224 merged).
Implemented backend-only context (last 3 rounds <=300 characters, <=2 local memory excerpts) and persisted daily/hourly quotas, plus env-Key-only documentation. No rendering or action execution changes.

## Verification
- Final full local gate: 908 passed, 3 skipped, 1 warning; all Node/syntax/secrets passed.
- First-run package check passed; targeted 67 passed, new suite 32 passed.
- Ignored evidence: tmp_ui_smoke/avatar-vrm-polish/brain-context-{local,package}.log.
- Fake LLM/temporary state only; no real provider or voice/animation acceptance.

## Files touched
avatar_brain_context.py, avatar_brain_usage.py, avatar_brain.py, app_avatar_brain.py, app_chat_route.py; new Python tests; package presence check, ignore rules, action docs and state files. Previous handoff archived.

## Limits and next step
Conservative filtering may omit technical context; excerpt summary can lose detail. History is repopulated by chat after restart. Unwritable/corrupt quota storage falls back to process memory, so cross-restart/shared limits cannot then be guaranteed.
Publish draft PR, stop for review. Do not merge. Frontend executor/FPS/real 10-minute acceptance await user notice about #217. Local main 0a06554 and private config unchanged; avatarRuntime.js/vrmRenderer.js untouched.

## 2026-10-26 merge authorization
User approved #227. Latest origin/main 2b67452 is already contained; no conflicts. Fresh full/package checks are running. Record the PRIVATE false-positive issue in progress.md only; do not change code. After successful local checks, push the documentation update, mark ready, wait for all CI, then use merge commit with --admin. Stop afterward; frontend phase 2 still requires user notice about #217.

Fresh validation passed: 908 passed, 3 skipped, 1 warning; all Node/syntax/secrets and first-run package smoke passed. Evidence in merge227-local.log / merge227-package.log under ignored tmp_ui_smoke/avatar-vrm-polish. Next: push, ready, await CI, authorized merge, stop.

Fresh #225 merge validation: 912 passed, 3 skipped; all Node/syntax/secrets and first-run package smoke passed. Await push/ready/CI-gated merge and final cleanup.
