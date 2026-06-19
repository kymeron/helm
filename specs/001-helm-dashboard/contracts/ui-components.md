# UI Components Contract: HELM Personal Dashboard

**Feature**: 001-helm-dashboard
**Date**: 2026-06-19

本文件定义 HELM 各 UI 组件的 props 契约与职责。所有组件为函数式 React 组件，props 全类型化（宪法原则 III、IV）。

---

## 布局组件

### TopBar

顶部导航栏：logo + 操作按钮。

```typescript
interface TopBarProps {
  onCreateClick: () => void;   // 打开新建模态框
  onExportClick: () => void;   // 触发 JSON 导出
}
```

### Dashboard

主布局容器，编排指标区 → 图表区 → 看板区。无 props，从 store 订阅数据。

```typescript
// 无 props，内部使用 useTasks / useStats / uiSlice
interface DashboardProps {}
```

---

## 统计组件

### StatTile

单个指标卡片。

```typescript
interface StatTileProps {
  label: string;        // 如 "任务总数"
  value: number | string;  // 数值或百分比字符串
  hint?: string;        // 可选副标题/单位
  accent?: 'default' | 'amber' | 'red' | 'teal' | 'green';
}
```

### StatBar

指标区横向条带，渲染 7 个 StatTile。无 props，从 useStats 订阅。

```typescript
interface StatBarProps {}
```

### TypeDonut

任务类型分布环形图（ECharts）。

```typescript
interface TypeDonutProps {
  data: { type: TaskType; count: number }[];
}
```

### TrendLine

完成趋势折线图（ECharts）。

```typescript
interface TrendLineProps {
  data: { date: string; count: number }[];  // 近 30 天
}
```

---

## 看板组件

### KanbanBoard

三栏看板容器，承载 dnd-kit 的 DndContext。无 props，从 store 订阅。

```typescript
interface KanbanBoardProps {}
```

### KanbanColumn

单列容器。

```typescript
interface KanbanColumnProps {
  status: TaskStatus;
  title: string;        // "待办" | "进行中" | "已完成"
  tasks: Task[];        // 该列的任务（已筛选+排序）
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}
```

### TaskCard

任务卡片（dnd-kit useSortable 包装）。

```typescript
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}
```

### TaskModal

新建/编辑模态框。

```typescript
interface TaskModalProps {
  open: boolean;
  task: Task | null;     // null=新建模式；非 null=编辑模式
  onClose: () => void;
  onSubmit: (data: TaskInput) => void;
}

interface TaskInput {
  title: string;
  description: string;
  type: TaskType;
  priority: Priority;
  tags: string[];
}
```

---

## 通用 UI 组件

### Button

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}
```

### Modal

```typescript
interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}
```

### Badge

```typescript
interface BadgeProps {
  variant: 'type-idea' | 'type-issue' | 'type-exploration'
         | 'priority-high' | 'priority-medium' | 'priority-low'
         | 'tag';
  children: React.ReactNode;
}
```

### EmptyState

```typescript
interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

---

## 职责约束

- 组件**不得**直接调用 IndexedDB；数据经 store/hooks 获取。
- 组件**不得**包含业务逻辑（状态流转、统计计算）；调用 store action 或 lib 纯函数。
- 展示型组件优先；交互通过回调上抛。
