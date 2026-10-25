# 任务 5：视觉统一验收

基线：任务 4 分支 `codex/stage-feedback-onboarding-v1` 的 `cf94872`；工作分支 `codex/visual-polish-v1`。仅本地提交，不推送、不创建 PR。

## 视觉变更

| Before | After | Why |
| --- | --- | --- |
| 两层底部工具、漂浮图标、截断的陪伴标签 | 单一输入栏；六个顶栏图标；背景压暗 18%、模糊 1.5px，单一暖金光圈 | 让角色成为主角，保留房间和粉紫基调 |
| 面板、按钮、剧情模式各自配色 | tokens.css 集中颜色、圆角和字体；樱花粉主操作、暖金选中态 | 三种界面保持一致 |
| 设置卡片固定列数，头像为另一角色 | 自适应 280px 卡片；应用猫咪图标；小尺寸保存按钮 | 窄屏可滚动查看，不挤压字段 |
| 开关用“开/关/不可用”文字 | 功能名与 aria-pressed；不可用时显示原因 | 清楚呈现功能和状态 |
| 英文服务标签、动作报告和旧应用名称 | 中文界面文案；窗口及安装器、快捷方式使用馨语桌宠 | 不改变配置字段、内部 ID、安装目录和接口 |
| 等待批准仍占据大块任务输入区 | 审批时隐藏下次任务表单，优先展示完整计划 | 窄屏更快看到风险与变更，原批准/取消流程不变 |

`live2dLayoutController.js` 只增加两个 CSS 锚点属性，使光圈跟随现有布局位置；模型变换、渲染、动作、嘴型没有修改。后端、chat.js、chatReplyController.js 未改。

## 文件

- `web/tokens.css`、`web/visualPolish.css`：集中变量和最终视觉层，保留旧主题兼容层。
- `web/visualPolishController.js`：显示名、开关展示与不可用原因、长选项提示；状态仍由原控制器管理。
- `web/index.html`：样式和展示模块接入、中文标签、猫咪头像。
- `web/controlCenterShell.js`、`web/configSwitchController.js`：侧栏头像/名称、中文预设与模型报告。
- `web/galgameController.js`：图标按钮可访问名称和语音状态；`web/live2dLayoutController.js`：光圈位置。
- `web/scheduleFormModel.js`、`web/scheduleListView.js`、`electron/main.js`、`package.json`：用户可见名称。
- `manage_shortcuts.ps1`：新名称，旧链接只在目标和参数属于当前 checkout 时迁移。
- `installer/xinyu-online-installer.nsi`、`ensure_gpt_sovits.bat`、`start_chat_oneclick.bat`：名称与安装器简体中文界面。
- `tests/test_visual_polish_frontend.js`、`scripts/test_visual_polish_browser.js`、`scripts/run_node_tests.js`：展示状态、对比度、浏览器交互与截图。
- `tests/test_config_switch_frontend.js`：只修改两处英文断言：`Motion groups` → `动作组`、`Missing families` → `缺少动作类型`；仍检查相同动作组、数量和缺失类型。没有删除既有测试。
- feature_list / progress / session-handoff 及归档：任务状态与可续接信息。

## 验证证据与边界

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1`：**784 Python 通过、1 跳过**（Windows 符号链接权限），全部 Node 套件、175 个 Python / 201 个 JavaScript 语法检查及秘密扫描通过。最终日志在 `tmp_ui_smoke/visual-polish/test-local-final.log`。
- Doctor 的三个既有环境提示：此 checkout 无私人 config.json、Node 25 非 LTS、全局 Codex 0.133.0 过旧；未改全局安装，运行的隔离实例仍使用独立 0.164.0。
- 真实 Edge 浏览器，800×600 / 1280×800 / 1920×1080：顶栏按钮边界、aria-label、语音开关状态往返、键盘 Tab 焦点、设置内容无横向溢出、四种服务的专用字段显隐、剧情语音开关、下拉框自定义外观、减少动态效果均通过。
- 对比度使用 WCAG 相对亮度计算：次要文字对 night-base **7.99:1**，对 night-raised **7.16:1**，均超过 AA 的 4.5:1。
- 快捷方式 PowerShell 语法检查通过；NSIS 使用合成最小 payload 编译通过。没有实际安装、没有生成正式发行包，也没有修改日常快捷方式。
- 浏览器截图使用真实房间资源和 Live2D；配置为示例配置，外部任务是浏览器拦截的合成审批夹具，不发起执行、不保存设置。不是新的真实 DeepSeek / Electron / 语音听评验收。
- 基线截图最初在修改前拍摄；补充审批滚动截图通过加载 `cf94872` 的原文件复现。时间和角色自然表情可能不同。
- 浏览器重放：设置 NODE_PATH 指向本机已有 Playwright，然后执行 `node scripts/test_visual_polish_browser.js after`；`before` 使用上述基线。默认地址 8124，可通过 VISUAL_POLISH_URL 覆盖。截图脚本不是默认 Node 测试依赖。

## 截图索引

所有截图在仓库忽略目录，不提交。根目录：

`D:/AI/ai_desktop_pet_readiness_20261023/tmp_ui_smoke/visual-polish/`

| 尺寸 / 页面 | 修改前 | 修改后 |
| --- | --- | --- |
| 800x600 / stage | [before-800x600-stage.png](../tmp_ui_smoke/visual-polish/before-800x600-stage.png) | [after-800x600-stage.png](../tmp_ui_smoke/visual-polish/after-800x600-stage.png) |
| 800x600 / more | [before-800x600-more.png](../tmp_ui_smoke/visual-polish/before-800x600-more.png) | [after-800x600-more.png](../tmp_ui_smoke/visual-polish/after-800x600-more.png) |
| 800x600 / settings | [before-800x600-settings.png](../tmp_ui_smoke/visual-polish/before-800x600-settings.png) | [after-800x600-settings.png](../tmp_ui_smoke/visual-polish/after-800x600-settings.png) |
| 800x600 / galgame | [before-800x600-galgame.png](../tmp_ui_smoke/visual-polish/before-800x600-galgame.png) | [after-800x600-galgame.png](../tmp_ui_smoke/visual-polish/after-800x600-galgame.png) |
| 800x600 / approval | [before-800x600-approval.png](../tmp_ui_smoke/visual-polish/before-800x600-approval.png) | [after-800x600-approval.png](../tmp_ui_smoke/visual-polish/after-800x600-approval.png) |
| 1280x800 / stage | [before-1280x800-stage.png](../tmp_ui_smoke/visual-polish/before-1280x800-stage.png) | [after-1280x800-stage.png](../tmp_ui_smoke/visual-polish/after-1280x800-stage.png) |
| 1280x800 / more | [before-1280x800-more.png](../tmp_ui_smoke/visual-polish/before-1280x800-more.png) | [after-1280x800-more.png](../tmp_ui_smoke/visual-polish/after-1280x800-more.png) |
| 1280x800 / settings | [before-1280x800-settings.png](../tmp_ui_smoke/visual-polish/before-1280x800-settings.png) | [after-1280x800-settings.png](../tmp_ui_smoke/visual-polish/after-1280x800-settings.png) |
| 1280x800 / galgame | [before-1280x800-galgame.png](../tmp_ui_smoke/visual-polish/before-1280x800-galgame.png) | [after-1280x800-galgame.png](../tmp_ui_smoke/visual-polish/after-1280x800-galgame.png) |
| 1280x800 / approval | [before-1280x800-approval.png](../tmp_ui_smoke/visual-polish/before-1280x800-approval.png) | [after-1280x800-approval.png](../tmp_ui_smoke/visual-polish/after-1280x800-approval.png) |
| 1920x1080 / stage | [before-1920x1080-stage.png](../tmp_ui_smoke/visual-polish/before-1920x1080-stage.png) | [after-1920x1080-stage.png](../tmp_ui_smoke/visual-polish/after-1920x1080-stage.png) |
| 1920x1080 / more | [before-1920x1080-more.png](../tmp_ui_smoke/visual-polish/before-1920x1080-more.png) | [after-1920x1080-more.png](../tmp_ui_smoke/visual-polish/after-1920x1080-more.png) |
| 1920x1080 / settings | [before-1920x1080-settings.png](../tmp_ui_smoke/visual-polish/before-1920x1080-settings.png) | [after-1920x1080-settings.png](../tmp_ui_smoke/visual-polish/after-1920x1080-settings.png) |
| 1920x1080 / galgame | [before-1920x1080-galgame.png](../tmp_ui_smoke/visual-polish/before-1920x1080-galgame.png) | [after-1920x1080-galgame.png](../tmp_ui_smoke/visual-polish/after-1920x1080-galgame.png) |
| 1920x1080 / approval | [before-1920x1080-approval.png](../tmp_ui_smoke/visual-polish/before-1920x1080-approval.png) | [after-1920x1080-approval.png](../tmp_ui_smoke/visual-polish/after-1920x1080-approval.png) |

额外 15 张：每个尺寸的 before/after `approval-plan`、`approval-actions`，以及 after `settings-voice`。共 45 张 PNG。

## 运行实例与遗留复查

隔离实例仍为 http://127.0.0.1:8124/?view=full ，PID 37668；本次复核 healthz 200，只监听 127.0.0.1。刷新即可加载新视觉层，Claude 可在此复查。数据仍在 `D:/AI/.tools/stage4-experience-20261024`，日常 8123 实例未触碰。

停止命令 `taskkill /PID 37668 /T /F`（久后执行先核实 PID 属于 isolated_experience.py）。依任务 4 要求保持运行，直到用户明确结束体验。

风险：本次未实装安装器、未在 Electron 中重新验收；旧主题仍存在，新的视觉层集中覆盖，其他未列入截图的面板需要后续人工复查。配置和语音服务真实可用性不由视觉测试证明。外部任务两个既有后端改进仍在 backlog，本次未实现。
