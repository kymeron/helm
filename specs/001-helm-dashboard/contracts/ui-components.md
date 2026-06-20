# UI Components Contract: HELM Personal Dashboard

**Feature**: 001-helm-dashboard
**Date**: 2026-06-19(初版) / 2026-06-20(对齐 M5/M6/M7)
**Status**: 与代码现状一致

本文档定义 HELM 各 UI 组件的 props 契约与职责。所有组件为函数式 React 组件,props 全类型化(宪法原则 III、IV)。

---

## 布局组件

### TopBar

顶部导航栏:logo + 搜索框 + 同步状态徽章 + 指标区显隐 + 全屏 + 时钟。**移动端紧凑布局**(`sm:` 起显示同步徽章,`lg:` 起显示完整标签)。

```typescript
interface TopBarProps {}
```

- 无 props,内部全部从 store 订阅
- 时钟:每秒刷新一次,显示 `YYYY-MM-DD HH:mm:ss`

### FilterBar

筛选 / 排序 / 清除控件条。**响应式宽度**(移动端可水平滚动)。

```typescript
interface FilterBarProps {}
```

- 无 props,内部全部从 store 订阅
- 标签下拉项从当前任务动态派生

### Dashboard

主布局容器,编排 StatBar → 图表区 → FilterBar → KanbanBoard。无 props,从 store 订阅。

```typescript
interface DashboardProps {}
```

- 挂载 `useSync({ enabled: initialized })`,启用 LAN 同步
- **响应式图表 grid**:`grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1.4fr_2fr]`
- main 区域 `overflow-y-auto`,独立滚动

---

## 统计组件

### StatTile

单个指标卡片。

```typescript
interface StatTileProps {
  label: string                   // 如「任务总数」
  value: number | string          // 数值或百分比字符串
  hint?: string                   // 可选副标题 / 单位
  accent?: 'default' | 'amber' | 'red' | 'teal' | 'green'
}
```

### StatBar

指标区横向条带,渲染 7 个 StatTile。无 props,从 `useStats` 订阅。

```typescript
interface StatBarProps {}
```

### TypeDonut

任务类型分布环形图(ECharts)。

```typescript
interface TypeDonutProps {
  data: { type: TaskType; count: number }[]
}
```

### TrendLine

完成与新建双线折线图(ECharts,近 30 天)。

```typescript
interface TrendLineProps {
  data: { date: string; created: number; completed: number }[]
}
```

### ActivityHeatmap *(M7 重制)*

活动热力图(**纯 SVG 自绘**,GitHub 风格)。53 周 × 7 天网格,6 级 teal 渐变。

```typescript
interface ActivityHeatmapProps {
  data: { date: string; count: number }[]   // 371 天,53 周对齐到当前周周日
}
```

---

## 看板组件

### KanbanBoard

三栏看板容器,承载 dnd-kit 的 DndContext。**移动端竖排**(`flex-col md:flex-row`)。无 props,从 store 订阅。

```typescript
interface KanbanBoardProps {}
```

### KanbanColumn

单列容器。**移动端最小高度 280px**(桌面 `min-h-0` 自适应);**双击列头空白处触发新建**(预填对应状态)。

```typescript
interface KanbanColumnProps {
  status: TaskStatus
  title: string                  // "待办" | "进行中" | "已完成"
  tasks: Task[]                  // 该列的任务(已筛选 + 排序)
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}
```

### TaskCard

任务卡片(dnd-kit `useSortable` 包装)。

```typescript
interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}
```

### TaskModal *(M5 移动端优化)*

新建 / 编辑模态框。**移动端底部弹出 + sticky 操作栏 + 自动聚焦 + Enter 提交**。

```typescript
interface TaskModalProps {
  open: boolean
  task: Task | null              // null = 新建模式;非 null = 编辑模式
  onClose: () => void
}

interface TaskInput {
  title: string
  description: string
  type: TaskType
  priority: Priority
  tags: string[]
}
```

**实现细节**:
- 标题输入框 `inputMode="text" enterKeyHint="done" autoComplete="off"`
- 延迟 250ms `auto-focus` 标题输入框(避免 iOS 抖动)
- `handleKeyDown`: Enter 提交(TEXTAREA 除外)+ 检测 IME 组合态
- 操作栏 sticky 在底部(`sticky bottom-0`),左侧 slot(删除 / 确认删除)+ 右侧 slot(取消 + 创建)
- 操作栏背景半透明(`bg-surface/95 backdrop-blur-sm`),防止遮挡时丢视觉锚点

### TaskDetailModal *(M5 新增)*

任务只读详情页。展示描述、类型、状态、优先级、标签、创建时间、完成时间、更新时间、ID。

```typescript
interface TaskDetailModalProps {
  open: boolean
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
}
```

---

## 通用 UI 组件

### Button

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}
```

### Modal *(M5 移动端适配)*

```typescript
interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}
```

**响应式**:
- 桌面: 居中,`max-h-[85dvh]`,圆角 `md:rounded-xl`
- 移动端: 底部弹出,`max-h-[90dvh]`,圆角 `rounded-t-xl`
- header sticky + `backdrop-blur`

### Badge

```typescript
interface BadgeProps {
  variant: 'type-idea' | 'type-issue' | 'type-exploration'
         | 'priority-high' | 'priority-medium' | 'priority-low'
         | 'tag'
  children: React.ReactNode
}
```

### EmptyState

```typescript
interface EmptyStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}
```

### SyncIndicator *(M6 新增)*

TopBar 同步状态徽章。从 `useSyncStatus` 订阅。

```typescript
interface SyncIndicatorProps {}
```

**状态映射**:
| status | 圆点色 | 标签 |
|--------|--------|------|
| `idle` | `bg-ink-muted` | 「未连接」 |
| `connecting` | `bg-warning animate-pulse` | 「连接中」 |
| `connected` | `bg-success` | 「已同步」 |
| `reconnecting` | `bg-warning animate-pulse` | 「重连中」 |
| `error` | `bg-danger` | 「同步出错」 |

hover `title` 显示推送 / 接收计数(便于调试)。

---

## 职责约束

- 组件**不得**直接调用 IndexedDB;数据经 store / hooks 获取。
- 组件**不得**包含业务逻辑(状态流转、统计计算);调用 store action 或 lib 纯函数。
- 展示型组件优先;交互通过回调上抛。
- **核心组件 vs 可选增量组件**:
  - 核心:`TaskCard` / `KanbanColumn` / `KanbanBoard` / `TaskModal` / `Modal` / `Badge` / `Button` / `EmptyState` / `StatTile` / `StatBar` / `TypeDonut` / `TrendLine`
  - M5 增量:`ActivityHeatmap`(替换 ECharts heatmap)/ `TaskDetailModal`(原仅在 Modal 内联)
  - M6 增量:`SyncIndicator`
  - **三者均可独立移除**,核心层不受影响(宪法原则 VI)

---

## 响应式断点约定

| 断点 | 适用 | Tailwind 前缀 |
|------|------|--------------|
| < 640px | 手机 | (无前缀) |
| ≥ 640px | 大手机 / 小平板 | `sm:` |
| ≥ 768px | iPad 竖屏 | `md:` |
| ≥ 1024px | iPad 横屏 / 笔记本 | `lg:` |
| ≥ 1280px | 桌面 | `xl:` |

桌面布局(`md:` 起)用并排三列看板;`< md` 用竖排堆叠。