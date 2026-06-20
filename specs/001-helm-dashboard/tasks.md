# Tasks: HELM Personal Dashboard

**Input**: Design documents from `/specs/001-helm-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: 宪法原则 V 要求核心逻辑(状态机、统计、筛选、时间、**同步合并**)必须 TDD。

**Organization**: Tasks 按 user story / milestone 分组,支持独立实现与验证。

> **状态说明**: 本任务清单对应 v1.1(2026-06-20)。所有 M1–M7 任务已完成并提交到 main。本文件同时记录历史(已完成的 M1–M4 任务)和增量(M5–M7)。

---

## 格式: `[ID] [P?] [Story] Description`

- **[P]**: 可并行(不同文件、无依赖)
- **[Story]**: 任务所属 user story(如 US1、US2、US3、US4、US5)
- 包含准确的 file paths

## 路径约定

- **单项目**: `src/`、`tests/` 在仓库根
- 路径与 plan.md 一致

---

## Phase 1: Setup (共享基础设施)

**Purpose**: 项目初始化与基础结构

- [x] T001 创建项目结构:`npm create vite@latest . -- --template react-ts`
- [x] T002 [P] 安装核心依赖: react@18、react-dom@18、zustand、@dnd-kit/core、@dnd-kit/sortable、@dnd-kit/utilities、echarts、echarts-for-react、idb、lucide-react
- [x] T003 [P] 安装开发依赖: tailwindcss、postcss、autoprefixer、vitest、@testing-library/react、@testing-library/jest-dom、@testing-library/user-event、jsdom、@types/node
- [x] T004 [P] 配置 Tailwind CSS:`npx tailwindcss init -p`,在 `tailwind.config.ts` 设置 `darkMode: 'class'`
- [x] T005 [P] 配置 TypeScript strict 模式:`tsconfig.json` 设 `strict: true`
- [x] T006 [P] 配置 Vitest:创建 `vitest.config.ts`,jsdom 环境与 setupTests 路径
- [x] T007 [P] 创建 `tests/setup.ts`,引入 @testing-library/jest-dom globals
- [x] T008 [P] 创建 `src/styles/theme.css`,Tailwind 指令 + CSS 变量(idea=amber-400、issue=red-400、exploration=teal-400)
- [x] T009 [P] 创建 `src/main.tsx` 入口,引入 theme.css,挂载 App
- [x] T010 [P] 创建 `src/App.tsx` 根组件,根元素加 `class="dark"`

---

## Phase 2: Foundational (前置基础)

**Purpose**: 任何 user story 实施前必须完成的核心基础设施

**⚠️ CRITICAL**: 本阶段完成前不得开始任何 user story

### 核心类型(单一来源)

- [x] T011 [P] 创建 `src/types/task.ts`,含 Task / TaskType / TaskStatus / Priority / TaskInput / TimeRange / SortKey / SortOrder / Filters / HelmExport

### IndexedDB 存储层

- [x] T012 创建 `src/lib/db.ts`:打开 `helm-db` v1,创建 `tasks` store(索引 by-status / by-type / by-created / by-completed),导出 CRUD(`getAllTasks` / `createTask` / `updateTask` / `deleteTask` / `getTaskById`)+ `seedIfEmpty`

### 状态机 (TDD)

- [x] T013 [P] 在 `tests/unit/state-machine.test.ts` 写状态机测试:`canTransition` 全组合、`applyTransition` 的 status / completedAt / updatedAt 联动
- [x] T014 实现 `src/lib/state-machine.ts`:`canTransition`(v1 全部合法)、`applyTransition`(不可变更新 + completedAt 规则)→ 测试通过

### 时间工具 (TDD)

- [x] T015 [P] 在 `tests/unit/time.test.ts` 写测试:`getRange('today'|'week'|'month'|'all')` 返回正确的 ISO 区间
- [x] T016 实现 `src/lib/time.ts`:`getRange` 返回 `{ start, end }` ISO 字符串 → 测试通过

### Zustand Stores

- [x] T017 [P] 创建 `src/store/tasksSlice.ts`:TasksState + TasksActions(init / createTask / updateTask / transitionStatus / deleteTask / exportTasks),订阅 IndexedDB
- [x] T018 [P] 创建 `src/store/uiSlice.ts`:UIState(filters / sortKey / sortOrder / timeRange / modalOpen / editingTask)+ UIActions,持久化到 localStorage(key: `helm.ui-preferences`)

**Checkpoint**: 基础就绪 — user story 可开始并行

---

## Phase 3: User Story 1 - 在看板上捕获与管理任务 (P1) 🎯 MVP

**Goal**: 用户能新建任务、在看板三列看到卡片、拖拽变更状态、编辑删除、刷新后数据恢复

**Independent Test**: 新建 → 看板显示 → 拖拽至进行中 → 拖拽至已完成 → 拖回进行中(完成时间清除) → 删除 → 刷新验证持久化

### US1 测试 (核心逻辑 TDD)

- [x] T019 [P] 在 `tests/unit/filters.test.ts` 写测试:`applyFilters` (type / priority / tag)、`sortTasks` (createdAt / priority / updatedAt)
- [x] T020 实现 `src/lib/filters.ts`:`applyFilters`、`sortTasks` 纯函数 → 测试通过

### US1 实现

#### Hooks

- [x] T021 [US1] 创建 `src/hooks/useTasks.ts`:订阅 tasksSlice + uiSlice,应用筛选 + 排序,返回 `byStatus` 分组任务

#### UI 组件 (kanban)

- [x] T022 [P] [US1] 创建 `src/components/ui/Button.tsx`,变体 primary / secondary / ghost / danger,尺寸 sm / md
- [x] T023 [P] [US1] 创建 `src/components/ui/Modal.tsx`,props: open / title / onClose / children
- [x] T024 [P] [US1] 创建 `src/components/ui/Badge.tsx`,变体:type-idea / type-issue / type-exploration / priority-high / priority-medium / priority-low / tag
- [x] T025 [P] [US1] 创建 `src/components/ui/EmptyState.tsx`,props: message / actionLabel / onAction
- [x] T026 [US1] 创建 `src/components/kanban/TaskCard.tsx`:展示 title / type badge / priority badge / tags / 相对时间,编辑 / 删除回调,useSortable 包装
- [x] T027 [US1] 创建 `src/components/kanban/KanbanColumn.tsx`:SortableContext 包装,列标题 + 计数,渲染 TaskCard 列表,空状态
- [x] T028 [US1] 创建 `src/components/kanban/KanbanBoard.tsx`:DndContext + 三 KanbanColumn(todo / in_progress / done),处理 onDragEnd 调 transitionStatus
- [x] T029 [US1] 创建 `src/components/kanban/TaskModal.tsx`:表单 title / description / type / priority / tags,提交调 createTask 或 updateTask

#### Layout

- [x] T030 [US1] 创建 `src/components/layout/TopBar.tsx`:logo、「新建」按钮(打开模态框)、「导出」按钮(调用 exportTasks)
- [x] T031 [US1] 创建 `src/components/layout/Dashboard.tsx`:组合 TopBar + KanbanBoard,订阅 useTasks,处理模态状态通过 uiSlice

#### 集成

- [x] T032 [US1] 更新 `src/App.tsx` 渲染 Dashboard,mount 时调 tasksSlice.init
- [x] T033 [US1] 为 KanbanBoard 添加 smoke test:`tests/component/KanbanBoard.test.tsx`:用 mock tasks 渲染,验证三列、拖拽占位

**Checkpoint**: US1 完成 — MVP 可演示(新建 → 看板 → 拖拽 → 完成 → 删除 → 持久化)

---

## Phase 4: User Story 2 - 跟踪统计与图表 (P2)

**Goal**: 用户能看到 7 个指标卡片、类型分布环形图、完成与新建趋势双线折线图、活动热力图,切换时间范围后刷新,任务变更时实时更新

**Independent Test**: 在有任务数据的前提下,查看指标区数值与图表,切换时间范围验证刷新,新增任务验证实时更新

### US2 测试 (Stats TDD)

- [x] T034 [P] 在 `tests/unit/stats.test.ts` 写测试:`computeMetrics` (total / todo / inProgress / done / completionRate / weeklyNew / weeklyDone / averageCycleDays)、`computeTypeDistribution`、`computeTrend`(近 30 天双线)、`computeHeatmapData`(53 周对齐)
- [x] T035 实现 `src/lib/stats.ts`:`computeMetrics` / `computeTypeDistribution` / `computeTrend` / `computeHeatmapData` 纯函数 → 测试通过

### US2 实现

#### Hooks

- [x] T036 [US2] 创建 `src/hooks/useStats.ts`:订阅 tasksSlice + uiSlice.timeRange,memo 化 metrics + typeDistribution + trendData + heatmapData

#### UI 组件 (stats)

- [x] T037 [P] [US2] 创建 `src/components/stats/StatTile.tsx`:展示 label / value / hint,带 accent 色
- [x] T038 [US2] 创建 `src/components/stats/StatBar.tsx`:渲染 7 个 StatTile(total / todo / inProgress / done / completionRate / weeklyNew / weeklyDone)
- [x] T039 [US2] 创建 `src/components/stats/TypeDonut.tsx`:ECharts 环形图,展示类型分布,hover tooltip
- [x] T040 [US2] 创建 `src/components/stats/TrendLine.tsx`:ECharts 双线折线图,完成 + 新建,hover tooltip

#### Layout 集成

- [x] T041 [US2] 更新 `src/components/layout/Dashboard.tsx`:在 KanbanBoard 上方加 StatBar + TypeDonut + TrendLine,加时间范围选择器(今日 / 本周 / 本月 / 全部),调用 uiSlice.setTimeRange

#### 测试

- [x] T042 [P] [US2] 为 StatBar 添加 smoke test:`tests/component/StatBar.test.tsx`:用 mock metrics 渲染,验证 7 个 tile 显示正确数值

**Checkpoint**: US2 完成 — 统计指标与图表独立可用

---

## Phase 5: User Story 3 - 筛选 / 排序 / 搜索 (P3)

**Goal**: 用户能按类型 / 优先级 / 标签筛选看板,按创建时间 / 优先级 / 更新时间排序,清除筛选恢复全部,全文搜索标题 / 描述 / 标签

**Independent Test**: 在有多种类型 / 优先级 / 标签卡片的前提下,选择筛选条件验证看板只显示匹配项,选择排序验证顺序,清除筛选恢复全部,搜索关键词验证匹配

### US3 实现

#### UI 组件 (筛选控件)

- [x] T043 [P] [US3] 创建 `src/components/layout/FilterBar.tsx`:类型选择器(all / idea / issue / exploration)、优先级选择器(all / high / medium / low)、标签选择器(从已有标签)、排序选择器(createdAt / priority / updatedAt + asc / desc)、清除按钮
- [x] T044 [US3] 更新 `src/components/layout/Dashboard.tsx`:在 KanbanBoard 上方加 FilterBar,连接选择器到 uiSlice actions

#### 集成

- [x] T045 [US3] 验证 useTasks 已经应用了 uiSlice 的筛选 + 排序(T021),无需额外改动;为搜索,在 useTasks 中增加 `searchQuery` 字段过滤(标题 / 描述 / 标签 contains)

**Checkpoint**: US3 完成 — 筛选 / 排序 / 搜索独立可用

---

## Phase 6: 体验优化与跨切关注点

**Purpose**: 影响多个 user story 的改进

- [x] T046 [P] 创建 `src/lib/export.ts`:`serializeTasks` 函数返回 HelmExport JSON 结构,触发 Blob + URL.createObjectURL 下载
- [x] T047 [P] 验证 TopBar「导出」按钮(T030)调用 tasksSlice.exportTasks,后者用 export.ts
- [x] T048 [P] 添加键盘可访问性:Tab 在卡片间导航,Enter 打开编辑模态框,Escape 关闭模态框
- [x] T049 [P] 添加卡片 hover / focus 状态:hover 轻微上浮 + 阴影,可见 focus ring
- [x] T050 [P] 验证深色主题应用:`html` 含 `class="dark"`,所有组件使用 Tailwind dark 变体
- [x] T051 运行 quickstart.md 验证:手动验证前 10 个场景
- [x] T052 运行质量门禁:`tsc --noEmit` 通过、`vitest run` 通过、无 lint 错误

---

## ✨ Phase 7: M5 - 移动端适配 (US4,可选增量)

**Goal**: iPad / 手机浏览器(viewport ≥ 320px)下,看板 / 模态框 / 输入框正常使用,无键盘遮挡;兼容旧 iPad Safari

**Independent Test**: iPad 上打开 HELM,新建任务,提交按钮不被键盘遮挡,键盘右下角显示「完成」并能提交

- [x] T053 [P] [US4] 更新 `index.html` viewport meta:移除固定宽度,改为 `width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover`
- [x] T054 [US4] 更新 `src/components/layout/TopBar.tsx`:小屏仅图标、中屏 icon + 短标签、大屏完整;`sm:` 起显示同步状态徽章
- [x] T055 [US4] 更新 `src/components/layout/Dashboard.tsx`:图表 grid 在 `1col / md:2col / lg:[1fr_1.4fr_2fr]`;main padding 紧凑化;`overflow-y-auto`
- [x] T056 [US4] 更新 `src/components/layout/FilterBar.tsx`:小屏用 `useShallow` 包装 selector(参考任务清单原则);响应式宽度
- [x] T057 [US4] 更新 `src/components/kanban/KanbanBoard.tsx`:列容器 `flex-col md:flex-row`;`min-h-0 md:h-full`
- [x] T058 [US4] 更新 `src/components/kanban/KanbanColumn.tsx`:`min-h-[280px] md:min-h-0`;双击列头空白处触发新建(预填状态)
- [x] T059 [US4] 更新 `src/components/ui/Modal.tsx`:`items-end justify-center md:items-center md:justify-center`、`max-h-[90dvh] md:max-h-[85dvh]`、`rounded-t-xl md:rounded-xl`;header sticky + backdrop-blur
- [x] T060 [US4] 更新 `src/components/kanban/TaskModal.tsx`:titleRef + formRef;延迟 250ms auto-focus;Enter 提交(TEXTAREA 除外)+ IME 组合态检测;`inputMode="text" enterKeyHint="done" autoComplete="off"`;操作栏改 sticky 双 slot 布局 + `flex-shrink-0`;`bg-surface/95 backdrop-blur-sm`
- [x] T061 [US4] 更新 `src/lib/db.ts`:在文件顶部新增 `uuid()` polyfill,三级降级 `randomUUID` → `getRandomValues` → `Math.random`
- [x] T062 [US4] 更新 `src/styles/theme.css`:新增 `-webkit-text-size-adjust: 100%`、`text-size-adjust: 100%`、`-webkit-tap-highlight-color: transparent`;`@supports (-webkit-touch-callout: none)` 下 input `font-size: 16px`
- [x] T063 [US4] 更新 `src/components/kanban/TaskDetailModal.tsx`:只读详情视图,展示描述、时间线、ID

**Checkpoint**: US4 完成 — iPad / 手机上核心流程可用

---

## ✨ Phase 8: M6 - 局域网同步 (US5,可选增量)

**Goal**: 同 WiFi 下多设备数据互通,LWW 合并 + 软删除墓碑,断连降级为纯本地

**Independent Test**: 两台设备同时连接同一 dev server,A 上新建 / 编辑 / 删除任务,B 在 1 秒内同步

- [x] T064 [P] [US5] `npm install ws @types/ws -D`
- [x] T065 [P] [US5] 创建 `vite-plugin-sync.ts`:Vite 插件,在 dev server 挂载 WebSocketServer,监听 `/__helm-sync`;内存保留 latestSnapshot;客户端连入时回放;其他客户端广播
- [x] T066 [US5] 更新 `vite.config.ts`:注册 `helmSync()` 插件;`server.host = '0.0.0.0'`(允许局域网访问)
- [x] T067 [US5] 更新 `package.json`:`dev` script 加 `--host 0.0.0.0`(双重保险)
- [x] T068 [US5] 更新 `src/types/task.ts`:Task 增加 `deletedAt: string \| null` 字段(软删除墓碑)
- [x] T069 [P] [US5] 在 `tests/unit/sync.test.ts` 写测试:LWW 合并(空 / 全空 / 取新 / 取旧 / 平局 / 幂等)+ 墓碑传播(过期墓碑防御、在线删除传播)+ URL 构建
- [x] T070 [US5] 实现 `src/lib/sync.ts`:`mergeTasks`(LWW 按 `updatedAt`)、`buildSyncUrl`、`SYNC_PATH`、`SyncStatus` 枚举与 `SyncStatusInfo`
- [x] T071 [US5] 更新 `src/lib/db.ts`:增加 `bulkPutTasks`(批量 put,供 sync replaceAllTasks 使用)、`purgeTombstones(ttlDays = 30)`(墓碑 GC);`createTask` 默认 `deletedAt: null`;`deleteTask` 改为软删
- [x] T072 [US5] 更新 `src/store/tasksSlice.ts`:新增 `replaceAllTasks(tasks)` action(`clearAllTasks` + `bulkPutTasks` + `set({ tasks })`);新增 `selectActiveTasks(state)` selector 过滤 `deletedAt === null`;`deleteTask` 改软删(设置 `deletedAt`)
- [x] T073 [US5] 更新 `src/hooks/useTasks.ts` 与 `src/hooks/useStats.ts` 与 `src/components/layout/FilterBar.tsx`:用 `useShallow(selectActiveTasks)` 包装 selector,修复 zustand v5 + useSyncExternalStore 引用稳定性 bug
- [x] T074 [US5] 创建 `src/hooks/useSync.ts`:`useSync({ enabled })` hook + `useSyncStatus` 子 store;建立 WebSocket、指数退避重连、echo 抑制(`applyingRemoteRef`)、payload 校验;订阅 tasksStore 推送变更;接收 snapshot 后 LWW 合并 + `replaceAllTasks`
- [x] T075 [US5] 更新 `src/components/layout/Dashboard.tsx`:在 store initialized 后挂载 `useSync({ enabled: initialized })`
- [x] T076 [US5] 创建 `src/components/ui/SyncIndicator.tsx`:TopBar 同步状态徽章(🟢已连接 / 🟡连接中 / 🔴出错 / 重连中),hover 显示推送 / 接收计数

**Checkpoint**: US5 完成 — 同 WiFi 多设备数据互通;sync.test.ts ≥ 11 个用例全通过

---

## ✨ Phase 9: M7 - 视觉打磨

**Goal**: 活动热力图升级为 GitHub 风格(纯 SVG),与项目 teal 主色统一;种子数据精简

- [x] T077 [P] 更新 `src/lib/stats.ts`:`computeHeatmapData` 时间范围改为最近 53 周(对齐 GitHub 风格)
- [x] T078 [US2/M7] 重写 `src/components/stats/ActivityHeatmap.tsx`:纯 SVG,53 周 × 7 天网格,6 级 teal 渐变,中文月 / 日标签,10px 格子
- [x] T079 [M7] 更新 `src/lib/db.ts`:`seedTasks` 从 17 条精简到 5 条(围绕 HELM 项目自身的主题),使用**固定 UUID**(`seed-0001-...`)使 `seedIfEmpty` 在 React StrictMode 下幂等

**Checkpoint**: M7 完成 — 视觉统一,种子数据减少冗余

---

## 依赖与执行顺序

### Phase 依赖

- **Setup (Phase 1)**: 无依赖,可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 → **阻塞** 所有 user story
- **User Stories (Phase 3+)**: 依赖 Foundational 完成
- **US4 / US5 / M7**: 依赖 US1–US3 完成(它们各自独立,但依赖核心 store / hook / 数据模型)

### 并行机会

- 所有 Setup 任务标 [P] 可并行(T002–T010)
- Foundational 阶段标 [P] 可并行(T011 / T013 / T015 / T017 / T018)
- US1 内:T022–T025(UI 组件)可并行
- US2 内:T037(StatTile)与 T034(stats 测试)可并行
- M5 内:T053–T063 各自独立文件,可并行
- M6 内:T064 + T065 + T069 + T068 可并行

---

## 实施策略

### 增量交付

1. Setup + Foundational → 基础就绪
2. US1 → 验证独立 → 部署 / 演示(MVP!)
3. US2 → 验证独立 → 部署 / 演示
4. US3 → 验证独立 → 部署 / 演示
5. **M5(移动端)** → 验证 → 部署
6. **M6(LAN 同步)** → 验证 → 部署
7. **M7(视觉打磨)** → 验证 → 部署

每个 user story / milestone 都在不破坏前一阶段的前提下增加价值。

---

## 实施记录(2026-06-19 → 2026-06-20)

| 阶段 | 起始 | 完成 | 关键 commit |
|------|------|------|------------|
| Setup + Foundational | 2026-06-19 | 2026-06-19 | (init) |
| US1 MVP | 2026-06-19 | 2026-06-19 | 看板 CRUD + 拖拽 |
| US2 统计 | 2026-06-19 | 2026-06-19 | ECharts 图表 + 指标 |
| US3 筛选 / 排序 / 搜索 | 2026-06-19 | 2026-06-19 | FilterBar |
| M5 移动端 | 2026-06-20 | 2026-06-20 | `99fdbe6` refactor: improve responsive layout and mobile experience |
| M6 LAN 同步 | 2026-06-20 | 2026-06-20 | `7f6416f` feat: add LAN sync layer with soft delete and improved task filtering |
| M7 视觉打磨 | 2026-06-20 | 2026-06-20 | `deb7c94` chore(db): reduce seed tasks from 17 to 5 |
| 种子幂等修复 | 2026-06-20 | 2026-06-20 | `b605557` fix(db): use fixed UUIDs for seed tasks to prevent duplication |
| 文档对齐 | 2026-06-20 | 2026-06-20 | 本次提交 |

---

## 备注

- [P] 任务 = 不同文件、无依赖
- [Story] 标签映射任务到 user story,便于追溯
- 每个 user story 可独立完成
- TDD 对核心逻辑(状态机、统计、筛选、时间、**同步合并**)不可妥协,遵循宪法原则 V
- 每个 task 或逻辑组对应一次 commit,Conventional Commits 风格
- 增量交付,每个 checkpoint 停下验证
- M5/M6 增量不修改核心 store / lib 契约,仅以新增 action / hook / 组件形式接入(宪法原则 VI)