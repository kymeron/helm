# Tasks: HELM Personal Dashboard

**Input**: Design documents from `/specs/001-helm-dashboard/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: 宪法原则 V 要求核心逻辑（状态机、统计、筛选、时间）必须 TDD，因此包含测试任务。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below match plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure: initialize Vite React-TS project with `npm create vite@latest . -- --template react-ts`
- [ ] T002 [P] Install core dependencies: react@18, react-dom@18, zustand, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, echarts, echarts-for-react, idb, lucide-react
- [ ] T003 [P] Install dev dependencies: tailwindcss, postcss, autoprefixer, vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, @types/node
- [ ] T004 [P] Configure Tailwind CSS: run `npx tailwindcss init -p` and set `darkMode: 'class'` in tailwind.config.ts
- [ ] T005 [P] Configure TypeScript strict mode: set `strict: true` in tsconfig.json
- [ ] T006 [P] Configure Vitest: create vitest.config.ts with jsdom environment and setupTests path
- [ ] T007 [P] Create tests/setup.ts with @testing-library/jest-dom globals
- [ ] T008 [P] Create src/styles/theme.css with Tailwind directives and CSS variables for color palette (idea=amber-400, issue=red-400, exploration=teal-400)
- [ ] T009 [P] Create src/main.tsx entry point importing theme.css and mounting App
- [ ] T010 [P] Create src/App.tsx root component with dark class on root element

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Types (Single Source of Truth)

- [ ] T011 [P] Create src/types/task.ts with Task, TaskType, TaskStatus, Priority, TaskInput interfaces per data-model.md

### IndexedDB Storage Layer

- [ ] T012 Create src/lib/db.ts: open 'helm-db' v1, create 'tasks' store with indexes (by-status, by-type, by-created, by-completed), export CRUD functions (getAllTasks, createTask, updateTask, deleteTask)

### State Machine (TDD Required)

- [ ] T013 [P] Write tests for state machine in tests/unit/state-machine.test.ts: test canTransition (all combos), test applyTransition (status + completedAt + updatedAt联动)
- [ ] T014 Implement src/lib/state-machine.ts: canTransition (always true for v1), applyTransition (immutable update with completedAt rules) — ensure tests pass

### Time Utilities (TDD Required)

- [ ] T015 [P] Write tests for time utilities in tests/unit/time.test.ts: test getRange('today'|'week'|'month'|'all') returns correct ISO date bounds
- [ ] T016 Implement src/lib/time.ts: getRange function returning { start, end } ISO strings — ensure tests pass

### Zustand Stores

- [ ] T017 [P] Create src/store/tasksSlice.ts: TasksState + TasksActions (init, createTask, updateTask, transitionStatus, deleteTask, exportTasks), subscribe to IndexedDB
- [ ] T018 [P] Create src/store/uiSlice.ts: UIState (filters, sortKey, sortOrder, timeRange, modalOpen, editingTask) + UIActions, persist filters/sort/timeRange to localStorage

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Capture & Manage Tasks on Kanban (Priority: P1) 🎯 MVP

**Goal**: 用户能新建任务、在看板三列看到卡片、拖拽变更状态、编辑删除、刷新后数据恢复

**Independent Test**: 新建一条任务 → 看板显示 → 拖拽至进行中 → 拖拽至已完成 → 拖回进行中（完成时间清除） → 删除 → 刷新验证持久化

### Tests for User Story 1 (TDD for Core Logic)

- [ ] T019 [P] Write tests for filters in tests/unit/filters.test.ts: test applyFilters (type, priority, tag), test sortTasks (createdAt, priority, updatedAt)
- [ ] T020 Implement src/lib/filters.ts: applyFilters, sortTasks pure functions — ensure tests pass

### Implementation for User Story 1

#### Hooks

- [ ] T021 [US1] Create src/hooks/useTasks.ts: subscribe tasksSlice + uiSlice, apply filters + sort, return byStatus grouped tasks

#### UI Components (kanban)

- [ ] T022 [P] [US1] Create src/components/ui/Button.tsx with variants (primary, secondary, ghost, danger) per ui-components.md
- [ ] T023 [P] [US1] Create src/components/ui/Modal.tsx with open/title/onClose/children props
- [ ] T024 [P] [US1] Create src/components/ui/Badge.tsx with variant colors for type/priority/tag
- [ ] T025 [P] [US1] Create src/components/ui/EmptyState.tsx with message/actionLabel/onAction props
- [ ] T026 [US1] Create src/components/kanban/TaskCard.tsx: display title, type badge, priority badge, tags, relative time, edit/delete callbacks, wrapped with useSortable
- [ ] T027 [US1] Create src/components/kanban/KanbanColumn.tsx: SortableContext wrapper, column title + count, render TaskCard list, empty state when no tasks
- [ ] T028 [US1] Create src/components/kanban/KanbanBoard.tsx: DndContext + three KanbanColumn (todo/in_progress/done), handle onDragEnd to call transitionStatus
- [ ] T029 [US1] Create src/components/kanban/TaskModal.tsx: form for title/description/type/priority/tags, submit calls createTask or updateTask

#### Layout

- [ ] T030 [US1] Create src/components/layout/TopBar.tsx: logo, "新建" button (opens modal), "导出" button (calls exportTasks)
- [ ] T031 [US1] Create src/components/layout/Dashboard.tsx: compose TopBar + KanbanBoard, subscribe useTasks, handle modal state via uiSlice

#### Integration

- [ ] T032 [US1] Update src/App.tsx to render Dashboard, call tasksSlice.init on mount
- [ ] T033 [US1] Add smoke tests for KanbanBoard in tests/component/KanbanBoard.test.tsx: render with mock tasks, verify three columns, verify drag placeholder

**Checkpoint**: User Story 1 complete — MVP demoable (新建 → 看板 → 拖拽 → 完成 → 删除 → 持久化)

---

## Phase 4: User Story 2 - Track Progress with Statistics & Charts (Priority: P2)

**Goal**: 用户能看到 7 个指标卡片、类型分布环形图、完成趋势折线图，切换时间范围后刷新，任务变更时实时更新

**Independent Test**: 在有任务数据的前提下，查看指标区数值与图表，切换时间范围验证刷新，新增任务验证实时更新

### Tests for User Story 2 (TDD for Stats)

- [ ] T034 [P] Write tests for stats in tests/unit/stats.test.ts: test computeMetrics (total/todo/inProgress/done/completionRate/weeklyNew/weeklyDone), test computeTypeDistribution, test computeCompletionTrend (近30天)
- [ ] T035 Implement src/lib/stats.ts: computeMetrics, computeTypeDistribution, computeCompletionTrend pure functions — ensure tests pass

### Implementation for User Story 2

#### Hooks

- [ ] T036 [US2] Create src/hooks/useStats.ts: subscribe tasksSlice + uiSlice.timeRange, memo-compute metrics + typeDistribution + completionTrend

#### UI Components (stats)

- [ ] T037 [P] [US2] Create src/components/stats/StatTile.tsx: display label/value/hint with accent color
- [ ] T038 [US2] Create src/components/stats/StatBar.tsx: render 7 StatTile (total/todo/inProgress/done/completionRate/weeklyNew/weeklyDone) using useStats
- [ ] T039 [US2] Create src/components/stats/TypeDonut.tsx: ECharts donut chart for type distribution, hover tooltip
- [ ] T040 [US2] Create src/components/stats/TrendLine.tsx: ECharts line chart for completion trend (近30天), hover tooltip

#### Layout Integration

- [ ] T041 [US2] Update src/components/layout/Dashboard.tsx: add StatBar + TypeDonut + TrendLine above KanbanBoard, add time range selector (today/week/month/all) calling uiSlice.setTimeRange

#### Tests

- [ ] T042 [P] [US2] Add smoke tests for StatBar in tests/component/StatBar.test.tsx: render with mock metrics, verify 7 tiles display correct values

**Checkpoint**: User Story 2 complete — 统计指标与图表独立可用，与 US1 集成无冲突

---

## Phase 5: User Story 3 - Refine the Board with Filters & Sorting (Priority: P3)

**Goal**: 用户能按类型/优先级/标签筛选看板，按创建时间/优先级/更新时间排序，清除筛选恢复全部

**Independent Test**: 在有多种类型/优先级/标签卡片的前提下，选择筛选条件验证看板只显示匹配项，选择排序验证顺序，清除筛选恢复全部

### Implementation for User Story 3

#### UI Components (filter controls)

- [ ] T043 [P] [US3] Create src/components/layout/FilterBar.tsx: type selector (all/idea/issue/exploration), priority selector (all/high/medium/low), tag selector (from existing tags), sort selector (createdAt/priority/updatedAt + asc/desc), clear button
- [ ] T044 [US3] Update src/components/layout/Dashboard.tsx: add FilterBar above KanbanBoard, connect selectors to uiSlice actions

#### Integration

- [ ] T045 [US3] Verify useTasks already applies filters + sort from uiSlice (T021), no additional changes needed

**Checkpoint**: User Story 3 complete — 筛选排序独立可用，与 US1/US2 集成无冲突

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T046 [P] Create src/lib/export.ts: serializeTasks function returning HelmExport JSON structure, trigger browser download via Blob + URL.createObjectURL
- [ ] T047 [P] Verify TopBar "导出" button (T030) calls tasksSlice.exportTasks which uses export.ts
- [ ] T048 [P] Add keyboard accessibility: ensure Tab navigates through cards, Enter opens edit modal, Escape closes modal
- [ ] T049 [P] Add hover/focus states for cards: slight elevation + shadow on hover, visible focus ring
- [ ] T050 [P] Verify dark theme applied: html has class="dark", all components use Tailwind dark variants
- [ ] T051 Run quickstart.md validation: manually verify all 10 scenarios pass
- [ ] T052 Run quality gates: `tsc --noEmit` passes, `vitest run` passes, no lint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Uses useTasks hook from US1 but independently testable with mock data
  - User Story 3 (P3): Can start after Foundational - Uses useTasks hook from US1 but independently testable
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational complete → independent
- **User Story 2 (P2)**: Foundational complete → uses useStats which depends on tasksSlice (from Foundational), can test with mock tasks
- **User Story 3 (P3)**: Foundational complete → uses useTasks which applies filters/sort (from Foundational T019-T020), can test with mock tasks

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Types before stores/hooks
- Pure functions before hooks
- Hooks before components
- Components before layout integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T010)
- All Foundational tasks marked [P] can run in parallel within Phase 2 (T011, T013, T015, T017, T018)
- Once Foundational completes, User Stories 1, 2, 3 can start in parallel (if team capacity allows)
- Within US1: T022-T025 (ui components) can run in parallel
- Within US2: T037 (StatTile) can run in parallel with T034 (stats tests)
- Within US3: T043 (FilterBar) can run in parallel with other story work

---

## Parallel Example: User Story 1

```bash
# Launch all UI base components together:
Task: "Create src/components/ui/Button.tsx"
Task: "Create src/components/ui/Modal.tsx"
Task: "Create src/components/ui/Badge.tsx"
Task: "Create src/components/ui/EmptyState.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md scenarios 1-5, verify MVP works
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (kanban + CRUD)
   - Developer B: User Story 2 (stats + charts) — can use mock tasks for testing
   - Developer C: User Story 3 (filters + sort) — can use mock tasks for testing
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD is NON-NEGOTIABLE for core logic (state-machine, stats, filters, time) per constitution Principle V
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence