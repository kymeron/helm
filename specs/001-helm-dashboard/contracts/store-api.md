# Store API Contract: HELM Personal Dashboard

**Feature**: 001-helm-dashboard
**Date**: 2026-06-19

本文件定义 Zustand store 的公开 API 契约。store 连接 lib 纯逻辑与 UI 组件，负责持久化与状态协调（宪法原则 IV）。

---

## tasksSlice（src/store/tasksSlice.ts）

任务数据 store。持有任务全量，提供 CRUD 与状态流转，自动持久化到 IndexedDB。

### State

```typescript
interface TasksState {
  tasks: Task[];
  loading: boolean;      // 初始化从 IndexedDB 加载中
  error: string | null;
}
```

### Actions

```typescript
interface TasksActions {
  // 初始化：从 IndexedDB 加载全部任务
  init: () => Promise<void>;

  // 新建任务（id/createdAt/updatedAt 自动生成，status 默认 todo）
  createTask: (input: TaskInput) => Promise<Task>;

  // 更新任务字段（updatedAt 自动刷新；状态变更走 transitionStatus）
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>;

  // 状态流转（应用状态机：联动 completedAt + updatedAt）
  transitionStatus: (id: string, to: TaskStatus) => Promise<void>;

  // 删除任务（二次确认由 UI 层负责）
  deleteTask: (id: string) => Promise<void>;

  // 导出全部任务为 JSON 文件
  exportTasks: () => Promise<void>;
}
```

### 持久化约定

- 每个 mutation action 在更新内存状态后，同步写入 IndexedDB（fire-and-forget，错误进 error 状态）。
- `init` 在应用启动时调用一次，从 IndexedDB 全量加载到 `tasks`。

---

## uiSlice（src/store/uiSlice.ts）

UI 偏好 store。持有筛选/排序/时间范围，自动持久化到 localStorage。

### State

```typescript
type TimeRange = 'today' | 'week' | 'month' | 'all';
type SortKey = 'createdAt' | 'priority' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

interface Filters {
  type: TaskType | 'all';
  priority: Priority | 'all';
  tag: string | null;    // null = 不按标签筛选
}

interface UIState {
  filters: Filters;
  sortKey: SortKey;
  sortOrder: SortOrder;
  timeRange: TimeRange;
  modalOpen: boolean;
  editingTask: Task | null;   // null = 新建模式
}
```

### Actions

```typescript
interface UIActions {
  setFilterType: (type: TaskType | 'all') => void;
  setFilterPriority: (priority: Priority | 'all') => void;
  setFilterTag: (tag: string | null) => void;
  clearFilters: () => void;

  setSort: (key: SortKey, order: SortOrder) => void;

  setTimeRange: (range: TimeRange) => void;

  openCreateModal: () => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
}
```

### 持久化约定

- filters / sortKey / sortOrder / timeRange 持久化到 localStorage（key: `helm.ui-preferences`）。
- modalOpen / editingTask 为瞬时态，不持久化。

---

## Hooks（src/hooks/）

### useTasks

订阅 tasksSlice + uiSlice，返回筛选+排序后的任务（按状态分组）。

```typescript
interface UseTasksResult {
  byStatus: Record<TaskStatus, Task[]>;   // 三列各自的任务
  loading: boolean;
  error: string | null;
}

function useTasks(): UseTasksResult;
```

### useStats

订阅 tasksSlice + uiSlice.timeRange，返回指标与图表数据（memo 化）。

```typescript
interface UseStatsResult {
  metrics: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    completionRate: number;   // 0~1
    weeklyNew: number;
    weeklyDone: number;
  };
  typeDistribution: { type: TaskType; count: number }[];
  completionTrend: { date: string; count: number }[];
}

function useStats(): UseStatsResult;
```

---

## 与 lib 的依赖关系

| store/hook | 依赖的 lib 纯函数 |
|-----------|------------------|
| tasksSlice.transitionStatus | `state-machine.applyTransition` |
| useTasks | `filters.applyFilters`, `filters.sortTasks` |
| useStats | `stats.computeMetrics`, `stats.computeTypeDistribution`, `stats.computeCompletionTrend`, `time.getRange` |
| tasksSlice.exportTasks | `export.serializeTasks` |

lib 层为纯函数，无副作用，便于 TDD（宪法原则 V）。
