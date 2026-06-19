# Implementation Plan: HELM Personal Dashboard

**Branch**: `001-helm-dashboard` | **Date**: 2026-06-19 | **Spec**: [spec.md](file:///Users/liushengjie/Workspace/helm001/specs/001-helm-dashboard/spec.md)

**Input**: Feature specification from `/specs/001-helm-dashboard/spec.md`

## Summary

HELM 是一款 PC 端单用户驾驶舱看板 SPA，用于记录想法(idea)/疑问(issue)/探索(exploration)三类任务，以三栏看板（待办/进行中/已完成）呈现并支持拖拽状态流转，配合核心指标卡片与图表（类型分布环形图、完成趋势折线图）做统计分析，支持筛选排序与 JSON 导出。采用 React 18 + TypeScript + Vite + Tailwind + Zustand + ECharts + @dnd-kit + IndexedDB(idb) 技术栈，本地优先、离线可用、深色极客主题。

## Technical Context

**Language/Version**: TypeScript 5.x（strict 模式）

**Primary Dependencies**:
- react@18, react-dom@18
- zustand（状态管理）
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities（看板拖拽）
- echarts, echarts-for-react（图表）
- idb（IndexedDB Promise 封装）
- tailwindcss, postcss, autoprefixer（样式）
- lucide-react（本地打包的图标库，无 CDN）

**Storage**: IndexedDB（任务数据持久化，经 `idb` 封装）；localStorage（用户偏好，如默认筛选/排序）

**Testing**: Vitest + @testing-library/react + @testing-library/jest-dom + jsdom（单元/组件测试）

**Target Platform**: PC 端现代 evergreen 浏览器（Chrome/Edge/Safari 最新版），最小视口宽度 1280px

**Project Type**: web-app（单页应用，纯前端，无后端）

**Performance Goals**: 首屏内容 ≤ 2s 可见；拖拽 60fps、200ms 内视觉反馈；200 条任务下看板渲染与统计计算 ≤ 1s；1000 条任务统计计算 ≤ 50ms

**Constraints**: 离线可用（无运行时远程依赖）；深色主题为默认；类型色板固定（idea=amber/issue=red/exploration=teal）；数据可导出为 JSON；不支持移动端/小屏（<1280px）

**Scale/Scope**: 单用户，任务量级 ≤ 1000 条；3 个用户故事（P1 看板 CRUD/拖拽、P2 统计图表、P3 筛选排序）；约 8-12 个组件、3-4 个 store slice、1 个 IndexedDB store

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

对照 `.specify/memory/constitution.md` v1.0.0 五大原则：

| 原则 | 检查结果 | 说明 |
|------|---------|------|
| I. Simplicity First (YAGNI) | ✅ 通过 | 仅实现 spec 的 18 条 FR；不引入路由库（单页单视图）、不引入 UI 组件库（用 Tailwind 自建）、不引入后端/认证/同步 |
| II. Local-First & Offline-Capable | ✅ 通过 | 数据全部存 IndexedDB/localStorage；无远程 API；提供 JSON 导出（FR-016） |
| III. Type-Safe by Default | ✅ 通过 | TS strict；Task/Stats 等类型集中在 `src/types/`；组件 props 与 store API 全类型 |
| IV. Component-Driven UI | ✅ 通过 | Card/Column/StatTile/Chart 各自独立组件；业务逻辑在 store/service；Tailwind 为样式基线 |
| V. Test-First for Core Logic | ✅ 通过 | 状态机、统计聚合、筛选排序为 TDD 重点；UI 组件配 smoke test |

**Gate 结论**: 无违规，无需 Complexity Tracking 条目。进入 Phase 0。

## Project Structure

### Documentation (this feature)

```text
specs/001-helm-dashboard/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md         # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出（UI 组件契约 + store API 契约）
│   ├── ui-components.md
│   └── store-api.md
└── tasks.md             # /speckit-tasks 输出（本命令不创建）
```

### Source Code (repository root)

```text
helm001/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── vitest.config.ts
├── src/
│   ├── main.tsx                 # 应用入口
│   ├── App.tsx                  # 根组件（布局编排）
│   ├── types/
│   │   └── task.ts              # Task / TaskType / TaskStatus / Priority 等类型（单一来源）
│   ├── lib/
│   │   ├── db.ts                # IndexedDB 封装（idb）：tasks store 的 CRUD
│   │   ├── state-machine.ts     # 任务状态机：合法流转 + 完成时间记录/清除
│   │   ├── stats.ts             # 统计聚合：指标计算 + 图表数据派生
│   │   ├── filters.ts           # 筛选与排序纯函数
│   │   ├── time.ts              # 时间范围工具（近7天/本月/今日）
│   │   └── export.ts            # JSON 导出
│   ├── store/
│   │   ├── tasksSlice.ts        # 任务 store（zustand）：CRUD + 拖拽 + 持久化订阅
│   │   └── uiSlice.ts           # UI store：筛选/排序/时间范围偏好（localStorage）
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx       # 顶部导航（logo + 新建 + 导出 + 设置）
│   │   │   └── Dashboard.tsx    # 主布局：指标区 → 图表区 → 看板区
│   │   ├── stats/
│   │   │   ├── StatTile.tsx     # 单个指标卡片
│   │   │   ├── StatBar.tsx      # 指标区横向条带（7 个 StatTile）
│   │   │   ├── TypeDonut.tsx    # 类型分布环形图（ECharts）
│   │   │   └── TrendLine.tsx    # 完成趋势折线图（ECharts）
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx  # 三栏看板容器（dnd-kit DndContext）
│   │   │   ├── KanbanColumn.tsx # 单列（SortableContext + 计数）
│   │   │   ├── TaskCard.tsx     # 任务卡片（useSortable）
│   │   │   └── TaskModal.tsx    # 新建/编辑模态框
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx        # 类型/优先级/标签徽章
│   │       └── EmptyState.tsx
│   ├── hooks/
│   │   ├── useTasks.ts          # 订阅 tasksSlice + 派生筛选/排序结果
│   │   └── useStats.ts          # 订阅 tasks + 派生统计（memo 化）
│   └── styles/
│       └── theme.css            # Tailwind 入口 + CSS 变量（色板/字体）
└── tests/
    ├── unit/
    │   ├── state-machine.test.ts
    │   ├── stats.test.ts
    │   ├── filters.test.ts
    │   └── time.test.ts
    ├── component/
    │   ├── TaskCard.test.tsx
    │   ├── KanbanBoard.test.tsx
    │   └── StatBar.test.tsx
    └── setup.ts                 # vitest 全局配置（jest-dom 等）
```

**Structure Decision**: 采用 Web application 单项目结构（无独立 backend）。理由：HELM 为纯前端本地优先 SPA（宪法原则 II），无后端代码，故不使用 plan 模板的 backend/frontend 分离方案，统一在 `src/` 下按职责分层（types/lib/store/components/hooks）。`lib/` 承载所有纯逻辑（状态机、统计、筛选、时间、导出），是 TDD 重点（宪法原则 V）；`components/` 仅做展示与编排（宪法原则 IV）；`store/` 用 zustand 连接二者并负责持久化。

## Complexity Tracking

> 无宪法违规，无需填表。
