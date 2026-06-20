# Store API Contract: HELM Personal Dashboard

**Feature**: 001-helm-dashboard
**Date**: 2026-06-19(初版) / 2026-06-20(对齐 M5/M6/M7)
**Status**: 与代码现状一致

本文档定义 Zustand store 的公开 API 契约。store 连接 lib 纯逻辑与 UI 组件,负责持久化与状态协调(宪法原则 IV);**可选同步层**作为额外副作用接入,**不修改** 核心契约。

---

## tasksSlice(`src/store/tasksSlice.ts`)

任务数据 store。持有任务全量(含 `deletedAt` 墓碑),提供 CRUD、软删除、状态流转;自动持久化到 IndexedDB。

### State

```typescript
interface TasksState {
  tasks: Task[]            // 全量(含 deletedAt 墓碑)
  loading: boolean         // 初始化从 IndexedDB 加载中
  error: string | null
  initialized: boolean     // init() 是否已完成;UI 据此挂载 useSync
}
```

### Actions

```typescript
interface TasksActions {
  // 初始化:从 IndexedDB 加载全部任务;首次启动调用 seedIfEmpty()
  init: () => Promise<void>

  // 新建任务(id/createdAt/updatedAt/deletedAt 自动生成,status 默认 todo)
  createTask: (input: TaskInput) => Promise<Task>

  // 更新任务字段(updatedAt 自动刷新;状态变更走 transitionStatus)
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>

  // 状态流转(应用状态机:联动 completedAt + updatedAt)
  transitionStatus: (id: string, to: TaskStatus) => Promise<void>

  // 软删除任务:设 deletedAt = now,不物理删除;UI 与 selectActiveTasks 隐藏
  deleteTask: (id: string) => Promise<void>

  // 全量替换本地任务(供 LAN 同步层使用;清空 IndexedDB → 批量 put → 更新内存)
  replaceAllTasks: (tasks: Task[]) => Promise<void>

  // 导出全部任务为 JSON 文件
  exportTasks: () => Promise<void>

  // 错误状态清除
  clearError: () => void
}
```

### Selectors

```typescript
// 过滤软删除后的活跃任务;UI 与统计层应使用此 selector
function selectActiveTasks(state: TasksState): Task[]
```

> **重要**: zustand v5 内部使用 React 18 的 `useSyncExternalStore`,**任何返回新数组引用的 selector 都会触发无限重渲染直至 unmount**。`selectActiveTasks` 因内部 `filter()` 每次返回新引用,**必须**通过 `useShallow` 包装:

```typescript
// ✅ 正确
const tasks = useTasksStore(useShallow(selectActiveTasks))

// ❌ 错误 - 会导致页面空白
const tasks = useTasksStore(selectActiveTasks)
```

### 持久化约定

- 每个 mutation action 在更新内存状态后,同步写入 IndexedDB(fire-and-forget,错误进 `error` 状态)。
- `init` 在应用启动时调用一次,从 IndexedDB 全量加载到 `tasks`;`initialized` 标记为 true。
- `replaceAllTasks` 是同步层的特殊 action:为保证 LWW 合并结果落地,先 `clearAllTasks` 再 `bulkPutTasks`,最后才更新内存,确保内存与 IndexedDB 状态一致。

---

## uiSlice(`src/store/uiSlice.ts`)

UI 偏好 store。持有筛选 / 排序 / 时间范围 / 搜索 / 指标区显隐 / 模态状态;**持久化偏好到 localStorage**(由 `zustand/middleware` 的 `persist` 接管)。

### State

```typescript
type TimeRange = 'today' | 'week' | 'month' | 'all'
type SortKey = 'createdAt' | 'priority' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

interface Filters {
  type: TaskType | 'all'
  priority: Priority | 'all'
  tag: string | null    // null = 不按标签筛选
}

interface UIState {
  filters: Filters
  sortKey: SortKey
  sortOrder: SortOrder
  timeRange: TimeRange
  searchQuery: string         // 全文搜索关键词
  showStats: boolean          // 指标区显隐
  modalOpen: boolean
  editingTask: Task | null    // null = 新建模式
  defaultStatus: TaskStatus | null  // 双击列头新建时预填的状态
}
```

### Actions

```typescript
interface UIActions {
  // 筛选
  setFilterType: (type: TaskType | 'all') => void
  setFilterPriority: (priority: Priority | 'all') => void
  setFilterTag: (tag: string | null) => void
  clearFilters: () => void

  // 排序
  setSort: (key: SortKey, order: SortOrder) => void

  // 时间范围
  setTimeRange: (range: TimeRange) => void

  // 搜索
  setSearchQuery: (query: string) => void

  // 指标区显隐
  toggleStats: () => void

  // 模态框
  openCreateModal: (status?: TaskStatus) => void   // 可选预填状态(双击列头)
  openEditModal: (task: Task) => void
  closeModal: () => void
}
```

### 持久化约定

通过 `zustand/middleware` 的 `persist` 持久化到 localStorage:

- **持久化**: `filters`、`sortKey`、`sortOrder`、`timeRange`、`showStats`
- **不持久化**(瞬时态): `searchQuery`、`modalOpen`、`editingTask`、`defaultStatus`
- **key**: `helm.ui-preferences`

---

## syncStatusStore(`src/hooks/useSync.ts` 内)

> M6 增量:同步层独立的轻量子 store,便于非 React 代码也能更新徽章状态。

```typescript
type SyncStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface SyncStatusInfo {
  status: SyncStatus
  peerCount: number          // 同 Hub 上的其他客户端数(估算)
  error: string | null
  pushesSent: number         // 累计推送次数
  snapshotsReceived: number  // 累计接收次数
}

// useSyncStatus: zustand store,导出 setStatus / reset actions
export const useSyncStatus: UseBoundStore<...>
```

---

## Hooks(`src/hooks/`)

### useTasks

订阅 `tasksSlice` + `uiSlice`,应用筛选 + 排序 + 搜索,返回按状态分组的任务。

```typescript
interface UseTasksResult {
  byStatus: Record<TaskStatus, Task[]>   // 三列各自的任务
  loading: boolean
  error: string | null
  allTasks: Task[]                        // 全部已筛选+排序+搜索后的任务
}

function useTasks(): UseTasksResult
```

**实现注意**: `useTasksStore(useShallow(selectActiveTasks))` —— 必须 `useShallow` 包装。

### useStats

订阅 `tasksSlice` + `uiSlice.timeRange`,返回指标与图表数据(memo 化)。

```typescript
interface UseStatsResult {
  metrics: Metrics                          // 7 个核心指标
  typeDistribution: TypeDistribution[]       // 环形图数据
  trendData: TrendDay[]                      // 双线折线图(创建+完成)
  heatmapData: HeatmapDay[]                  // 活动热力图(53 周)
}

function useStats(): UseStatsResult
```

### useSync *(M6 增量)*

建立 WebSocket 连接、推送本地变更、接收远端 snapshot;在 Dashboard 顶层调用一次。

```typescript
interface UseSyncOptions {
  enabled?: boolean   // 默认 true;设为 false 时完全跳过同步层
}

function useSync(opts?: UseSyncOptions): void
```

行为:
- mount: 连接 `${origin}/__helm-sync`,`onopen` 时立即推送本地 state
- 订阅 `useTasksStore`:`state.tasks` 变化(且非远端 snapshot 触发)时推送新 state
- `onmessage`: 收到 `{ type: 'snapshot', tasks }` 后 → LWW 合并 → `replaceAllTasks` → IndexedDB 写入
- 断连: 指数退避重连(1s → 30s)
- unmount: 关闭连接,清理订阅

---

## 与 lib 的依赖关系

| store/hook | 依赖的 lib 纯函数 |
|-----------|------------------|
| tasksSlice.transitionStatus | `state-machine.applyTransition` |
| tasksSlice.deleteTask | `db.deleteTask`(软删除,设 `deletedAt`) |
| tasksSlice.replaceAllTasks | `db.clearAllTasks` + `db.bulkPutTasks` |
| useTasks | `filters.applyFilters` + `filters.sortTasks` |
| useStats | `stats.computeMetrics` + `stats.computeTypeDistribution` + `stats.computeTrend` + `stats.computeHeatmapData` + `time.getRange` |
| useSync | `sync.mergeTasks` + `sync.buildSyncUrl` |
| tasksSlice.exportTasks | `export.serializeTasks` |

`lib/` 层为纯函数,无副作用,便于 TDD(宪法原则 V)。

---

## 错误处理约定

- 所有 action 内部 try/catch;错误信息进 `error` 状态
- UI 通过 `error` 渲染错误页(见 `Dashboard.tsx` 的 error 分支)+ 「重试」按钮
- `clearError()` 清除错误状态,通常与重试动作捆绑

---

## 同步层(可选增量)的 store 影响

> 重要约束:**M6 同步层不修改 `tasksSlice` 与 `uiSlice` 的核心契约**。

- 新增的 `useSync` hook 与 `useSyncStatus` store 是**独立模块**,不影响现有 action
- `useSync` 内部调用 `tasksSlice.replaceAllTasks` —— 这是**核心 action 的合法客户端**,非破坏性扩展
- `tasksSlice.subscribe` 是 zustand v5 的官方订阅 API,用于推送本地变更

这条约束对应宪法原则 VI「设备与网络边界清晰」:同步失败不应影响核心 CRUD。