# 任务 6：体验修复验收

分支 `codex/experience-fixes-v1`，基于任务 5 的 `541f881`。仅本地提交，不推送、不改 main。P0 已优先实现；历史 provider_failed 的原始原因仍无法确认，不能宣称已经修复该历史故障。

## 改动

- `character_brain.py`：删除中文即违规的判断，英文风格启发式不判定中文语言；逐句移除场景串扰，保留安全的模型原文。质量诊断不再生成固定角色台词。
- `app.py`、`app_reply_pipeline.py`：守卫过滤后没有回答时，带修正提示重试模型一次，禁止该重试调用工具。重试仍不合格则报告错误；只有调用异常时才使用兜底，中文输入得到中文连接失败说明。
- `companion_dialogue_policy.py`、`reply_behavior.py`、`config.preview.example.json`、`README.md`：默认跟随最新用户语言；明确设置英文回复模式仍保留。
- `web/desktopControlBinder.js`：首次对话区展开，手动折叠保存在本地；`web/experienceFixesController.js` 和 `.css`：折叠后的最新回复气泡独立于 TTS，直到新输入；窄屏上下分栏、精简顶栏、完整气泡、深色滚动条和不换行发送按钮。
- `web/chatMessageController.js`、`web/onboardingController.js`：默认气泡名馨语，首次真实用户消息推进引导；`web/chat.js` 只更新一条过时文案，未改 chatReplyController.js；`web/index.html` 接入新文件。引导暗色、移除空白框，等待提示隐藏关闭按钮，沿用首字清除机制。
- `external_agents/file_manifest.py`、`external_agent.py`：批准路径内的一对一同名或显式 Move 配对显示为移动，模糊配对保留删除提示；执行后以大小/修改时间核对观察到的移动，不扩大批准范围。
- `external_agents/codex_cli.py`、`external_agents/policy.py`：顶层错误保留经过脱敏的类型、HTTP 状态、至多 200 字消息；先去 Key/Bearer/绝对路径再截断。诊断进入任务错误和本地调试日志，不进入审计或事件总线。
- `web/externalAgentController.js`：移动列表、真实删除醒目提示、固定状态和失败原因、单一重新规划主按钮、命令默认折叠、人话进度。
- `scripts/isolated_experience.py`：匹配隔离实例元数据后允许 --resume，不覆盖既有测试工作文件。

## 自动化验证

最终 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1` 全部通过：789 passed、1 skipped（Windows 符号链接权限）、1 个既有 audioop 弃用警告，全部 Node 前端测试通过，Python 179 / JavaScript 203 文件语法检查通过，秘密扫描 750 文件通过。新增 `tests/test_experience_fixes.py` 覆盖中文假模型四个不同回答（含角色名和任务建议）、部分保留/仅一次重试/调用失败/重试仍无效、移动配对歧义和元数据不匹配、长 Key 截断前脱敏及 HTTP 429。

旧 `tests/test_character_brain.py` 中约 1317 行及相关固定台词断言已更新：守卫只能保留模型片段或返回需重新生成的空结果，不能凭角色模板制造回答。保留原始输入、形状/提问/安全限制测试。自然对话、预览配置和 runtime 集成测试更新默认语言断言；`tests/test_stage_frontend.js` 将旧的窄屏默认折叠要求更新为两个视图默认展开，并覆盖未保存/保存展开/保存折叠三种选择；v14 演示改为模型提供场景回答（下一步使用具体行动句、告别用普通晚安），保留显式英文、意图、情绪和动作连续性验证，并禁止真实模型联网。

`scripts/test_experience_fixes_browser.js` 在真实 Edge 浏览器、1024×768 和 774×1208 下通过：默认展开、回复可见、折叠后 16 秒仍显示、刷新记忆折叠、窄屏 lane 不重叠、引导推进、移动不标红、命令折叠、失败只有一个可见重新规划按钮；无页面脚本错误。此脚本使用注入的对话/卡片与模拟任务接口，不代表真实 Electron 或音频验收。

## 真实 DeepSeek 中文五轮

通过隔离实例 `/api/chat` 连续请求，保留 history，均 HTTP 200。以下仅是专门编写的测试对话，无私人聊天数据。

1. 用户：你好呀，第一次见面！你叫什么名字？

   馨语：叫馨语，住你桌面上的那个。

2. 用户：可以用中文跟我聊吗？你叫什么？

   馨语：可以，中文没问题。名字还是馨语，刚才说过一遍了，你这是在考我记性？

3. 用户：今天晚上吃什么好呢？

   馨语：都23点了才想晚饭，这时间点该考虑的是宵夜了吧。随便煮碗面加个蛋，比纠结半小时强。

4. 用户：我想吃清淡一点，有什么推荐？

   馨语：清汤面撒点葱花，或者白粥配个咸鸭蛋，够清淡也不寡。这个点吃太素容易饿醒，加个蛋垫着。

5. 用户：谢谢你，明天我想出去走走。

   馨语：出去走走挺好，别又窝一天。明天天气我不查也能猜到，晚上回来记得跟我说走了多少步。

以上验证语言与回答未被固定英文覆盖，不等于内容质量全部合格。第五轮有未经验证的天气口吻，后续角色内容质量仍需人工审查。

## provider_failed 复现与限制

从隔离实例审计摘要找到了原任务原文：**把 csv 文件移到 data 子文件夹，txt 和 md 文件移到 docs 子文件夹，不要删除任何文件**。恢复六个样例后，使用同一原文重新规划、批准并真实执行（独立 Codex CLI 0.164.0 + DeepSeek），任务 `6d817b0888a24caab7518c67e006ce71` 成功：观察到六个移动、两个新目录，0 修改、0 计划外变更、0 未观察到的计划操作。此前另一轮整理任务也成功。

**历史失败未复现，原因未知。** 旧记录只有 provider_failed，没有供应商原始类型/HTTP 状态/错误消息；无法倒推出是服务波动、鉴权、模型或工具失败。本次修复的是诊断缺失，不能把成功重跑当作定位并修复历史根因。HTTP 429 单元测试、HTTP 503 失败卡片均为故障注入，不是真实供应商错误。

移动识别是批准路径和元数据推断，不做内容哈希，不能证明内容完全未变。原始增删清单仍保留以供审计。先前已接受的两个待办（目录扫描持锁、新建父目录识别）继续保留，未混入本次实现。没有新的 Electron/人工听评结果。

## 隔离实例与恢复

最终重启实例 PID **5620**，仅监听 `127.0.0.1:8124`；`/healthz` 返回 200。地址：http://127.0.0.1:8124/?view=full 。运行本分支最新代码，保留运行等待复查，未触碰日常 8123 实例。

停止命令：`taskkill /PID 5620 /T /F`。长时间后使用前先确认 PID 仍属于该 isolated_experience.py。

数据根：`D:/AI/.tools/stage4-experience-20261024`。`workspace` 已恢复且逐字节核对最初六个文件：hello.txt、notes.txt、sales.csv、colors.csv、README.md、ideas.md，没有子目录。两轮执行结果分别完整保存在同级 workspace-task6-run1、workspace-task6-run2；恢复采用归档目录后重建样例，未删除执行证据。Key 仅经现有环境传入，未记录在报告或配置。

## 截图（被 Git 忽略，不提交）

全部位于 `D:/AI/ai_desktop_pet_readiness_20261023/tmp_ui_smoke/task6/`：

- stage-1024x768.png、stage-774x1208.png：展开舞台。
- collapsed-1024x768.png、collapsed-774x1208.png：折叠后最新回复，静音场景。
- onboarding.png：暗色新手引导。
- move-plan.png：移动确认卡片。
- failed-card.png：模拟 HTTP 503 失败卡片。

Doctor 的三个环境提醒保持可见：仓库没有私人 config.json、Node 25 非推荐 LTS、全局 Codex 0.133.0 偏旧。隔离实例明确使用独立 0.164.0；未修改全局安装。

原始测试证据同目录：chinese-dialogue.json、real-plan.json、real-result.json、full-tests-passed.log。截图/原始输出仅本机可用。
