# Data Model: HELM Personal Dashboard

**Feature**: 001-helm-dashboard
**Date**: 2026-06-19
**Source**: [spec.md](file:///Users/liushengjie/Workspace/helm001/specs/001-helm-dashboard/spec.md) FR-001 ~ FR-018

本文件定义 HELM 的核心数据实体、字段、校验规则与状态流转。类型定义的单一来源为 `src/types/task.ts`，本文件是其设计说明。

---

## 实体：Task（任务）

HELM 的唯一核心实体。代表一条想法/疑问/探索。

### 字段定义

| 字段 | 类型 | 必填 | 默认值 | 校验规则 | 说明 |
|------|------|------|--------|---------|------|
| id | string | 是 | （生成） | UUID v4 或 crypto.randomUUID() | 唯一标识 |
| title | string | 是 | — | 非空，trim 后长度 1~50 | 简短描述 |
| description | string | 否 | "" | 长度 ≤ 2000 | 详细说明（纯文本） |
| type | TaskType | 是 | — | 枚举：`idea` \| `issue` \| `exploration` | 任务类型 |
| status | TaskStatus | 是 | `todo` | 枚举：`todo` \| `in_progress` \| `done` | 当前状态 |
| priority | Priority | 是 | `medium` | 枚举：`low` \| `medium` \| `high` | 优先级 |
| tags | string[] | 否 | [] | 每项非空、≤20 字符、去重 | 自由标签 |
| createdAt | string | 是 | （生成） | ISO 8601 字符串 | 创建时间 |
| updatedAt | string | 是 | （生成） | ISO 8601 字符串 | 最近更新时间 |
| completedAt | string \| null | 否 | null | ISO 8601 或 null | 完成时间（仅 status=done 时有值） |

### TypeScript 类型（对应 src/types/task.ts）

```typescript
export type TaskType = 'idea' | 'issue' | 'exploration';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  completedAt: string | null;
}
```

### 校验规则（创建/编辑时）

1. `title` trim 后不得为空，长度 1~50。
2. `type` 必须为三个枚举值之一。
3. `status` 必须为三个枚举值之一；新建时若未指定则 `todo`。
4. `priority` 必须为三个枚举值之一；新建时若未指定则 `medium`。
5. `tags` 数组每项 trim 后非空、长度 ≤20，去重（大小写敏感）。
6. `createdAt` 在创建时设为 `new Date().toISOString()`，此后不可变。
7. `updatedAt` 在创建与每次字段变更时设为 `new Date().toISOString()`。
8. `completedAt` 仅当 `status === 'done'` 时为 ISO 字符串，否则必须为 `null`。

---

## 状态机：TaskStatus 流转

### 合法流转表

| from \ to | todo | in_progress | done |
|-----------|------|-------------|------|
| todo | ✅ | ✅ | ✅ |
| in_progress | ✅ | ✅ | ✅ |
| done | ✅ | ✅ | ✅ |

**说明**: 所有状态间互相流转均合法（含自转与回退），spec 明确要求允许回退（US1 验收场景 6）。

### 完成时间联动规则

| 触发 | 动作 |
|------|------|
| 流转至 `done` | `completedAt = new Date().toISOString()` |
| 从 `done` 流转至其他 | `completedAt = null` |
| 其他流转（非涉及 done） | `completedAt` 保持不变 |

### 纯函数 API（对应 src/lib/state-machine.ts）

```typescript
// 判断流转是否合法（本期全部合法，但保留函数以便未来约束）
function canTransition(from: TaskStatus, to: TaskStatus): boolean;

// 应用流转，返回新 task 对象（不可变更新）
function applyTransition(task: Task, to: TaskStatus): Task;
```

`applyTransition` 同时处理 `status`、`completedAt`、`updatedAt` 三个字段的联动更新。

---

## 派生数据：统计指标与图表

这些不是存储实体，而是从 `Task[]` + 时间范围实时派生（对应 `src/lib/stats.ts`）。

### 指标（StatTile 数据）

| 指标 | 计算 |
|------|------|
| total | `tasks.length` |
| todo | `tasks.filter(t => t.status === 'todo').length` |
| inProgress | `tasks.filter(t => t.status === 'in_progress').length` |
| done | `tasks.filter(t => t.status === 'done').length` |
| completionRate | `done / total`（total=0 时为 0） |
| weeklyNew | 近 7 天 `createdAt` 的任务数 |
| weeklyDone | 近 7 天 `completedAt` 的任务数 |

### 图表数据

| 图表 | 数据结构 |
|------|---------|
| 类型分布环形图 | `{ type: TaskType; count: number }[]`（3 项，含 0） |
| 完成趋势折线图 | `{ date: 'YYYY-MM-DD'; count: number }[]`（近 30 天，含 0） |

---

## 存储模型

### IndexedDB 结构

- **数据库名**: `helm-db`
- **版本**: 1
- **Object Store**: `tasks`
  - keyPath: `id`
  - 索引:
    - `by-status`: `status`
    - `by-type`: `type`
    - `by-created`: `createdAt`
    - `by-completed`: `completedAt`

### localStorage 结构

- **key**: `helm.ui-preferences`
- **value**: JSON 序列化的 `{ filters: {...}, sort: {...}, timeRange: 'today'|'week'|'month'|'all' }`

---

## 导出格式（对应 src/lib/export.ts）

```typescript
interface HelmExport {
  version: 1;
  exportedAt: string;   // ISO 8601
  tasks: Task[];
}
```

导出为 `helm-export-YYYYMMDD-HHMMSS.json` 文件下载。
