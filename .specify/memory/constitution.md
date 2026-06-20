<!--
同步影响报告
- 版本变更: 1.0.0 → 1.1.0
- 修改原则: 无
- 新增章节:
  - 技术与设计约束中明确『移动端响应式(iPad / 手机)』与『LAN 同步(可选增量)』为已采纳能力
  - Out of Scope 中移除上述两条
  - 新增『设计原则 VI — 设备与网络边界清晰』,区分核心本地优先能力与可选增强
- 删除章节: 无
- 受影响模板:
  - .specify/templates/plan-template.md — ✅ 兼容(Constitution Check 章节通用)
  - .specify/templates/spec-template.md — ✅ 兼容(无强约束段冲突)
  - .specify/templates/tasks-template.md — ✅ 兼容(任务阶段与工作流对齐)
- 后续 TODO: 无
-->

# HELM 宪法

> 本文档为 HELM 项目开发的最高权威。任何与本文档冲突的临时决定、框架默认行为、AI 代理建议,均以本文档为准。

## 核心原则

### I. 简洁优先 (YAGNI)

HELM MUST 保持尽可能简单,只满足当前 feature spec 的需求。

- 只构建当前 spec 要求的能力;不为假想未来需求而推测性地添加功能、抽象或配置。
- 三段重复的代码优于过早抽象。
- 任何复杂度 MUST 能对应到具体、当前的需求,而非未来的可能性。
- 面对抉择时,在不违反其他原则的前提下,选更简单的方案。

**理由**: HELM 是减少决策疲劳的个人工具,过度工程化反而违背其目的。

### II. 本地优先与离线可用

HELM MUST 在无后端服务、无网络连接时仍能完整工作。

- 所有任务数据 MUST 持久化在浏览器中(localStorage / IndexedDB)。
- 核心功能(CRUD、看板、统计)不得依赖远程 API。
- MUST 支持 JSON 导出 / 导入,让用户拥有并可迁移自己的数据。
- 后端 / 同步层可作为非破坏性增强后续加入,但本地优先契约 MUST 保持不变。

**理由**: 用户在下班后打开 HELM 记录转瞬即逝的想法,任何网络 / 鉴权摩擦都会打断灵感。本地优先保障即时访问与数据主权。

### III. 类型安全默认开启

所有 HELM 源码 MUST 使用 TypeScript 严格类型编写。

- `tsconfig.json` 中 `strict: true`;`any` 必须有行内注释说明正当性。
- 共享数据结构(Task、Stats 等)MUST 在单一来源(`src/types/`)以 interface / type 定义,并跨模块复用。
- 公共组件 props 与 store API MUST 完整类型化。

**理由**: 单用户应用仍会累积状态;类型可在早期捕获回归,并让 AI 辅助重构更安全。

### IV. 组件驱动 UI

HELM UI MUST 由小而可复用、可独立测试的组件构成。

- 每个视觉单元(Card、Column、StatTile、Chart)MUST 是独立组件。
- 业务逻辑 MUST 放在 store / service 中,不得放在组件内。
- 组件 MUST 尽可能纯展示;数据通过 hooks / store 订阅获取。
- Tailwind CSS 工具类是样式基线;自定义 CSS 仅用于动画或主题 token。

**理由**: 看板的价值在于其部分能干净组合。组件边界让代码库对人与 AI 代理都更易导航。

### V. 核心逻辑测试先行 (不可妥协)

核心业务逻辑(任务状态机、统计聚合、筛选 / 排序)MUST 测试驱动开发。

- 先写测试 → 确认失败 → 实现 → 确认通过。
- 红-绿-重构循环对状态流转、统计计算与所有纯工具函数严格执行。
- UI 组件 SHOULD 至少配 smoke test;完整视觉回归测试延后至明确要求时再做。

**理由**: 状态机与统计是 HELM 的『大脑』,那里的 bug 会无声破坏用户对自己数据的信任。测试让这份信任可被验证。

### VI. 设备与网络边界清晰 (v1.1 新增)

HELM MUST 区分**核心本地能力**与**可选增量**;两者解耦、可独立关闭。

- **核心层** (MUST,离线可用):本地 CRUD、看板、统计、筛选、JSON 导入导出。不得依赖任何运行时网络资源。
- **可选增量** (MAY,默认关闭时可降级):局域网同步(iPad 与手机等设备在同 WiFi 下的数据互通)、移动端响应式布局、软删除墓碑等。
- 增量 MUST 不修改核心 API 契约;仅以新增 action / hook / 组件的形式接入。
- 增量失败 MUST 不得影响核心层可用性(同步断连应可降级为纯本地模式)。

**理由**: 个人场景从『一台电脑』演进到『多设备同 WiFi』是自然升级路径。把增量作为可选层接入,既保留宪法的『本地优先』契约,又允许能力按需启用而不产生技术债。

## 技术与设计约束

**项目类型**: 单页 Web 应用(SPA),PC / 平板 / 手机浏览器。

**语言**: TypeScript(strict 模式)。

**框架**: React 18+(函数组件、hooks)。

**构建工具**: Vite。

**样式**: Tailwind CSS(默认深色主题,极客 / 极简美学)。

**状态管理**: Zustand(轻量、无样板)。

**图表**: ECharts(经 `echarts-for-react`)。活动热力图因性能与定制需求,采用纯 SVG 自绘(53 周 / 7 天网格,GitHub 风格)。

**拖拽**: `@dnd-kit/core` + `@dnd-kit/sortable` 负责看板卡片移动。

**存储**: IndexedDB(经 `idb` 封装)负责任务持久化;localStorage 仅用于 UI 偏好。

**同步层(可选增量)**: Vite 插件内嵌 WebSocket 服务,监听 `/__helm-sync`。客户端使用 LWW(Last-Write-Wins)合并 + 软删除墓碑(`deletedAt`)实现删除传播。

**测试**: Vitest + React Testing Library 负责单元 / 组件测试;Playwright 留待后续 e2e(若明确要求)。

**目标平台**: 现代 evergreen 浏览器(Chrome / Edge / Safari 最新),移动端最小视口宽度 ≥ 320px(iPhone SE)。平板与手机为 iPad Safari / iOS Safari 兼容重点(支持 Safari 15.4 以下版本以覆盖旧 iPad)。

**性能目标**: 首屏内容 ≤ 2s;拖拽 60fps;1000 条任务统计计算 ≤ 50ms;同步消息序列化 ≤ 100ms。

**设计约束**:
- 默认深色主题。
- 色板:深蓝 / 青冷色基底(航海「舵」意象)。
- 类型色:idea = 琥珀 / issue = 红 / exploration = 青。
- 数据 / 数字用等宽字体(`font-mono`);UI 文本用无衬线。
- 图标本地打包,不得使用 CDN。
- 移动端输入框字号 MUST ≥ 16px(防止 iOS Safari 自动缩放)。
- 移动端 MUST 关闭 `-webkit-tap-highlight-color`,并对软键盘动态视口使用 `dvh` 单位。

**v1 范围(In Scope)**:
- 任务 CRUD、看板拖拽、筛选排序、JSON 导出 / 导入、统计指标与图表、活动热力图。
- iPad / 手机端响应式布局(viewport 适配、看板竖排、模态框底部弹出、sticky 操作栏、键盘安全视口)。
- 局域网内多设备 WebSocket 同步(开发态下经 Vite 插件提供,生产态需自托管同步服务,本期不内置)。
- 数据软删除墓碑(`deletedAt`),支持跨设备删除传播与 LWW 冲突合并。

**v1 范围外(Out of Scope)**:
- 多用户协作、服务器侧持久化、鉴权 / 登录。
- 推送通知、定时提醒、子任务、任务依赖。
- 公开互联网同步(仅局域网);跨广域网 / NAT 穿透。
- 浅色主题切换(留口子但 v1 不实现)。
- 真实磁盘持久化的同步服务端(v1 服务端仅内存,重启会丢失最新 snapshot)。

## 开发工作流

**Spec-Kit 驱动**: 每个 feature 严格遵循 spec-kit 流水线——`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → `/speckit-analyze`。无批准的 spec.md / plan.md,不得写 feature 代码。

**分支约定**: 每个 feature 一个分支,命名 `###-feature-name`(对应 `/specs/` 下目录名)。

**提交约定**: Conventional Commits(`feat:`、`fix:`、`docs:`、`refactor:`、`test:`、`chore:`)。每个 task 或逻辑组对应一次提交。

**质量门禁(合并前)**:
1. `tsc --noEmit` 零错误。
2. `vitest run` 全部通过。
3. 核心逻辑代码必须有对应测试(原则 V)。
4. 无未加行内注释的 `any`。
5. `eslint` 零错误。

**宪法检查**: 每个 plan.md MUST 含宪法检查段,对照原则 I–VI 验证 feature。违规必须在 Complexity Tracking 中给出正当性。

**AI 编码礼仪**:
- AI 代理 MUST 在编辑前阅读相关 spec.md / plan.md。
- AI 代理 MUST 不创建非必要的文件。
- AI 代理 MUST 优先编辑现有文件,而非新建。
- AI 代理 MUST 不为未改动的代码添加注释或 docstring。
- AI 代理 MUST 在声明任务完成前跑过质量门禁。

**增量交付**: 每个 user story(P1 → P2 → P3,以及后续 M5+ 增量)MUST 可独立演示。在每个 checkpoint 处停下并验证后再继续。

## 治理

本宪法为 HELM 开发决策的最高权威。任何 ad-hoc 偏好、框架默认、AI 代理建议若与本宪法冲突,以本宪法为准。

**修订流程**:
1. 提出修订提案与理由。
2. 验证不违反任何已有原则。
3. 按语义化版本号更新:
   - **MAJOR**: 原则移除或重定义,或治理上向后不兼容。
   - **MINOR**: 新增原则 / 章节,或对现有指南进行实质性扩展。
   - **PATCH**: 澄清、措辞修正、typo 修复、非语义性微调。
4. `LAST_AMENDED_DATE` 更新为今天(ISO `YYYY-MM-DD`)。
5. 重新跑过一致性传播清单,确认 plan / spec / tasks 模板与运行时指南同步。

**合规审查**: 每次 `/speckit-plan` 调用 MUST 重新检查宪法;每次 `/speckit-analyze` 调用 MUST 报告任何漂移。

**运行时指南**: 日常开发决策查阅当前 feature 的 plan.md。plan.md 沉默时,以本宪法为准。

**版本**: 1.1.0 | **批准日期**: 2026-06-19 | **最后修订**: 2026-06-20