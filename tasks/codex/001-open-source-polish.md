# 001 Open Source Polish

## Task Goal

Prepare the repository-facing open-source surface for the v1.2 experience-ready release track.

## Scope

- Align public-facing version references with latest `CHANGELOG.md` entry.
- Improve top-of-README positioning and messaging honesty.
- Add roadmap summary in README.
- Improve contributor onboarding and contribution policy.
- Add expanded roadmap document for v1.2 -> v2.0 (`docs/ROADMAP.md`).
- Add/update repository-level agent instructions in `AGENTS.md`.

## Task 001 Required Goals

- 统一版本号（以 `CHANGELOG.md` 最新版本为准）。
- 优化 README 顶部项目定位文案（Windows 桌面 AI 伙伴 / 桌面 AI VTuber 实验方向）。
- 增加 README Roadmap Summary（v1.2 / v1.3 / v1.4 / v1.5 / v2.0）。
- 完善 `CONTRIBUTING.md`（贡献方向、本地运行、Issue/PR 规范、安全注意事项）。
- 新增或完善 `docs/ROADMAP.md`（目标、主要任务、验收标准）。
- 不改业务代码。
- 不新增依赖。
- 不修改安全默认值。
- 不实现功能代码。
- 完成后输出：修改文件、验证方式、风险点。

## Constraints

- No business code refactor.
- No new dependencies.
- No security default relaxation.
- No unrelated file changes.

## Deliverables

- `package.json` version aligned to latest changelog version.
- `README.md` refreshed project positioning + roadmap summary.
- `CONTRIBUTING.md` improved for contributors.
- `docs/ROADMAP.md` expanded with goals / tasks / acceptance criteria.
- `AGENTS.md` updated with project/security/output principles.

## Validation Checklist

- [ ] `package.json` version equals latest version in `CHANGELOG.md`.
- [ ] README includes AI VTuber inspiration wording without clone claims.
- [ ] README includes roadmap summary for v1.2, v1.3, v1.4, v1.5, v2.0.
- [ ] CONTRIBUTING includes local run, Issue/PR rules, and security notes.
- [ ] `docs/ROADMAP.md` contains goals, tasks, acceptance criteria for v1.2 -> v2.0.
- [ ] Diff contains no business logic code changes.
- [ ] Diff contains no dependency changes.
- [ ] Diff contains no security default changes.

## Notes

Keep language practical and contributor-friendly. Prioritize clarity over marketing.
