# Implementation Plan: HELM Personal Dashboard

**Branch**: `001-helm-dashboard` | **Date**: 2026-06-19(初版) / 2026-06-20(对齐代码现状) | **Spec**: [spec.md](spec.md)

**Input**: 来自 `specs/001-helm-dashboard/spec.md` 的功能规格。

## 摘要

HELM 是一款 PC / 平板 / 手机三端的本地优先驾驶舱看板 SPA。核心层(M1–M4)覆盖任务 CRUD、三栏看板、统计图表、活动热力图、JSON 导入导出;可选增量层(M5–M7)在不修改核心契约的前提下接入移动端响应式、LAN 同步、视觉打磨。技术栈: React 18 + TypeScript + Vite 6 + Tailwind 3 + Zustand 5 + ECharts 5 + @dnd-kit + IndexedDB(idb) + WebSocket(`ws`)。

---

## 技术上下文

**语言 / 版本**: TypeScript 5.x(strict 模式)

**主要依赖**:
- react@18, react-dom@18
- zustand(状态管理,内置 `useShallow` 应对 zustand v5 + useSyncExternalStore 的引用稳定性问题)
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities(看板拖拽)
- echarts, echarts-for-react(类型分布 + 完成趋势图表)
- idb(IndexedDB Promise 封装)
- tailwindcss, postcss, autoprefixer(样式 + 响应式)
- lucide-react(本地打包的图标库,无 CDN)
- ws + @types/ws(WebSocket 同步 Hub,开发态内嵌)

**存储**:
- IndexedDB:任务数据(含 `deletedAt` 墓碑),经 `idb` 封装
- localStorage:用户偏好(筛选 / 排序 / 时间范围 / 指标区显隐)

**测试**: Vitest + @testing-library/react + @testing-library/jest-dom + jsdom(单元 / 组件测试)

**目标平台**:
- 桌面:现代 evergreen 浏览器(Chrome / Edge / Safari 最新),最小视口 1280px
- **扩展** 移动端:iPad Safari(iOS 14+) / iOS Safari;最小视口 320px(iPhone SE);支持旧 Safari 15.4 以下(降级 `crypto.randomUUID`)

**项目类型**: web-app(单页应用,纯前端,可选 LAN 同步)

**性能目标**: 首屏内容 ≤ 2s;拖拽 60fps、200ms 内视觉反馈;200 条任务渲染 ≤ 1s;1000 条任务统计 ≤ 50ms;同步消息序列化 ≤ 100ms

**约束**:
- 离线可用(无运行时远程依赖)
- 深色主题为默认
- 类型色板固定(idea = 琥珀 / issue = 红 / exploration = 青)
- 数据可导出为 JSON
- 移动端输入框 ≥ 16px 防止 iOS 自动缩放
- 软键盘动态视口使用 `dvh` 单位
- LAN 同步为可选增量,关闭后核心层不受影响

**规模 / 范围**: 单用户,任务量级 ≤ 1000 条;5 个用户故事(US1 看板 / US2 统计 / US3 筛选 / US4 移动端 / US5 同步);约 14 个组件、3 个 store、1 个 IndexedDB store、可选 WebSocket Hub

---

## 宪法检查

*GATE: Phase 0 research 之前必须通过。Phase 1 design 之后再次检查。*

对照 `.specify/memory/constitution.md` v1.1.0 六大原则:

| 原则 | 检查结果 | 说明 |
|------|---------|------|
| I. 简洁优先 (YAGNI) | ✅ 通过 | 仅实现 spec 中的 26 条 FR + 9 条可选 FR;无路由库 / UI 组件库 / 后端 / 鉴权;热力图自绘 SVG 而非引入额外库 |
| II. 本地优先与离线可用 | ✅ 通过 | 数据全部存 IndexedDB / localStorage;无远程 API;JSON 导出(FR-017);LAN 同步为可选增量 |
| III. 类型安全默认开启 | ✅ 通过 | TS strict;Task / Stats / Sync 类型集中在 `src/types/`;组件 props 与 store API 全类型 |
| IV. 组件驱动 UI | ✅ 通过 | Card / Column / StatTile / Chart / SyncIndicator / ActivityHeatmap 各自独立组件;业务逻辑在 store / service |
| V. 核心逻辑测试先行 | ✅ 通过 | 状态机、统计聚合、筛选排序、**同步合并**为 TDD 重点;UI 组件配 smoke test |
| VI. 设备与网络边界清晰 | ✅ 通过 | 核心层 MUST 离线;LAN 同步(M6)与移动端(M5)作为可选增量接入;同步断连可降级为纯本地 |

**Gate 结论**: 无违规,无需 Complexity Tracking 条目。进入 Phase 0。

---

## 项目结构

### 文档(本 feature)

```text
specs/001-helm-dashboard/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md         # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
│   ├── ui-components.md
│   └── store-api.md
└── tasks.md             # speckit-tasks 输出
```

### 源码(仓库根)

```text
helm/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts             # 注册 helmSync 插件 + host: '0.0.0.0'
├── vite-plugin-sync.ts        # 开发态 WebSocket Hub(/__helm-sync)
├── tailwind.config.ts
├── postcss.config.js
├── vitest.config.ts
├── src/
│   ├── main.tsx               # 应用入口
│   ├── App.tsx                # 根组件(布局编排)
│   ├── types/
│   │   └── task.ts            # Task / TaskInput / TimeRange / Filters / HelmExport 等(单一来源)
│   ├── lib/
│   │   ├── db.ts              # IndexedDB 封装(idb):tasks store 的 CRUD + 软删除 + 种子
│   │   ├── state-machine.ts   # 任务状态机:合法流转 + 完成时间记录 / 清除
│   │   ├── stats.ts           # 统计聚合:指标 + 图表数据 + 活动热力图(53 周)
│   │   ├── filters.ts         # 筛选与排序纯函数
│   │   ├── time.ts            # 时间范围工具(近7天 / 本月 / 今日)
│   │   ├── export.ts          # JSON 导出 / 导入
│   │   ├── sync.ts            # LWW 合并 + WebSocket URL 构建 + SyncStatus
│   │   └── utils.ts           # 通用工具(cn / classnames 等)
│   ├── store/
│   │   ├── index.ts           # 统一导出
│   │   ├── tasksSlice.ts      # 任务 store(zustand):CRUD + 软删除 + replaceAllTasks
│   │   └── uiSlice.ts         # UI store:筛选 / 排序 / 时间范围 / 搜索 / 指标区显隐 / 模态状态(localStorage 持久化)
│   ├── hooks/
│   │   ├── useTasks.ts        # 订阅 tasksSlice + uiSlice,useShallow(selectActiveTasks) + 筛选 + 排序 + 搜索
│   │   ├── useStats.ts        # 订阅 tasksSlice + uiSlice.timeRange,派生指标 + 图表 + 热力图
│   │   └── useSync.ts         # 订阅 tasksSlice,推送到 WebSocket Hub + 接收 snapshot 合并
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx     # 顶部导航(logo + 搜索 + 同步状态徽章 + 指标切换 + 全屏 + 时钟)
│   │   │   ├── Dashboard.tsx  # 主布局:指标区 → 图表区 → 筛选 → 看板;挂载 useSync
│   │   │   └── FilterBar.tsx  # 类型 / 优先级 / 标签 / 排序 / 清除
│   │   ├── stats/
│   │   │   ├── StatTile.tsx   # 单个指标卡片
│   │   │   ├── StatBar.tsx    # 指标区横向条带(7 个 StatTile)
│   │   │   ├── TypeDonut.tsx  # 类型分布环形图(ECharts)
│   │   │   ├── TrendLine.tsx  # 完成与新建双线折线图(ECharts)
│   │   │   └── ActivityHeatmap.tsx  # 活动热力图(纯 SVG,53 周 × 7 天)
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx    # 三栏看板容器(dnd-kit DndContext);移动端竖排
│   │   │   ├── KanbanColumn.tsx   # 单列(SortableContext + 计数 + 双击新建)
│   │   │   ├── TaskCard.tsx       # 任务卡片(useSortable)
│   │   │   ├── TaskModal.tsx      # 新建 / 编辑模态框(sticky 操作栏 + auto-focus + Enter 提交)
│   │   │   └── TaskDetailModal.tsx# 任务只读详情(描述、时间线、ID)
│   │   └── ui/
│   │       ├── Button.tsx     # 按钮(变体 + 尺寸)
│   │       ├── Modal.tsx      # 模态框(桌面居中 / 移动端底部弹出)
│   │       ├── Badge.tsx      # 类型 / 优先级 / 标签徽章
│   │       ├── EmptyState.tsx # 空状态
│   │       └── SyncIndicator.tsx  # 同步状态徽章(🟢已连接 / 🟡连接中 / 🔴出错)
│   └── styles/
│       └── theme.css          # Tailwind 入口 + CSS 变量(iOS 防缩放、tap-highlight、dvh 安全)
└── tests/
    ├── unit/
    │   ├── state-machine.test.ts
    │   ├── stats.test.ts
    │   ├── filters.test.ts
    │   ├── time.test.ts
    │   └── sync.test.ts        # LWW 合并 + 墓碑传播 + 重连场景
    └── setup.ts                # vitest 全局配置(jest-dom 等)
```

**结构决策**: 采用 Web application 单项目结构(无独立 backend)。`lib/` 承载所有纯逻辑,`components/` 仅做展示,`store/` 用 zustand 连接二者。可选同步层通过 `vite-plugin-sync.ts` 内嵌于 dev server,客户端通过 `useSync` hook 接入,**不修改** 核心 store / lib 的契约。

---

## 复杂度跟踪

> 无宪法违规,无需填表。

---

## 关键架构决策(增量)

### M5 移动端适配

| 决策 | 理由 |
|------|------|
| viewport meta 改用响应式(`width=device-width, viewport-fit=cover, maximum-scale=5.0`) | 保留用户缩放能力的同时支持 iPad 横竖屏 |
| 断点策略:`sm: 640px` / `md: 768px` / `lg: 1024px` / `xl: 1280px` | 沿用 Tailwind 默认;`md+` 启用桌面布局 |
| Modal 用 `items-end md:items-center` + `max-h-[90dvh]` | 桌面居中、移动端底部弹出;`dvh` 防键盘遮挡 |
| TaskModal 操作栏改 sticky 双 slot 布局 + `enterKeyHint="done"` | 防止提交按钮被键盘挤出屏幕 |
| 标题输入框延迟 250ms auto-focus | 模态框动画完成后聚焦,避免 iOS 抖动 |
| input 字号 ≥ 16px(`@supports (-webkit-touch-callout: none)`) | 防 iOS Safari 自动缩放 |

### M6 局域网同步

| 决策 | 理由 |
|------|------|
| Vite 插件内嵌 WebSocketServer,监听 `/__helm-sync` | 零额外进程,开发体验原生 |
| Hub 仅内存,无磁盘持久化 | 简单优于复杂;重启可从任一设备重连重建 |
| 客户端使用 `useSync` hook + `useSyncStatus` 子 store | 与核心 tasksSlice 解耦;状态徽章独立订阅 |
| LWW 合并以 `updatedAt` 为版本向量 | 无需向量时钟,单用户场景足够 |
| 删除通过 `deletedAt` 墓碑传播 | 解决「LWW 无法区分从未存在 vs 被删除」的问题 |
| `applyingRemoteRef` 标志防 echo | 收到远端 snapshot 后,本地订阅立即触发但跳过推送 |
| 指数退避 1s → 30s + 重连状态显示 | 不阻塞本地 CRUD;UI 可感知同步状态 |

### M7 视觉打磨

| 决策 | 理由 |
|------|------|
| 活动热力图改纯 SVG 自绘,弃用 ECharts | ECharts heatmap 在 53 周 × 7 网格下定制受限;SVG 更易调色 |
| 53 周对齐到当前周的周日(共 371 天) | 与 GitHub 风格一致 |
| 6 级 teal 渐变 + 暗色主题基色 | 与项目主色统一,深色背景下层级清晰 |
| 10px 网格 + 中文月 / 日标签 | 移动端可读性;小屏不溢出 |