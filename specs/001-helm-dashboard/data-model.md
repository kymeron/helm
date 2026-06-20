# Data Model: HELM Personal Dashboard

**Feature**: 001-helm-dashboard
**Date**: 2026-06-19(初版) / 2026-06-20(对齐 M6 同步 + 软删除)
**Source**: [spec.md](spec.md) FR-001 ~ FR-021 + FR-200 ~ FR-202

本文档定义 HELM 的核心数据实体、字段、校验规则与状态流转。类型定义的单一来源为 `src/types/task.ts`,本文档是其设计说明。

---

## 实体: Task(任务)

HELM 的唯一核心实体。代表一条想法/疑问/探索。

### 字段定义

| 字段 | 类型 | 必填 | 默认值 | 校验规则 | 说明 |
|------|------|------|--------|---------|------|
| id | string | 是 | (生成) | UUID v4;polyfill 三级降级 `randomUUID` → `getRandomValues` → `Math.random` | 唯一标识;种子任务使用固定 UUID 以保证 `seedIfEmpty` 幂等 |
| title | string | 是 | — | 非空,trim 后长度 1~50 | 简短描述 |
| description | string | 否 | "" | 长度 ≤ 2000 | 详细说明(纯文本) |
| type | TaskType | 是 | — | 枚举:`idea` \| `issue` \| `exploration` | 任务类型 |
| status | TaskStatus | 是 | `todo` | 枚举:`todo` \| `in_progress` \| `done` | 当前状态 |
| priority | Priority | 是 | `medium` | 枚举:`low` \| `medium` \| `high` | 优先级 |
| tags | string[] | 否 | [] | 每项非空、≤20 字符、去重(case-sensitive) | 自由标签 |
| createdAt | string | 是 | (生成) | ISO 8601 字符串 | 创建时间;不可变 |
| updatedAt | string | 是 | (生成) | ISO 8601 字符串 | 最近更新时间;每次写入刷新;**LWW 同步的版本向量** |
| completedAt | string \| null | 否 | null | ISO 8601 或 null | 完成时间(仅 `status === 'done'` 时有值) |
| **deletedAt** | **string \| null** | **否** | **null** | **ISO 8601 或 null** | **软删除墓碑;非空时 UI / 统计层通过 `selectActiveTasks` 过滤;LAN 同步通过此字段传播删除;30 天后由 `purgeTombstones` 物理 GC** |

### TypeScript 类型(对应 `src/types/task.ts`)

```typescript
export type TaskType = 'idea' | 'issue' | 'exploration'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: Priority
  tags: string[]
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  completedAt: string | null
  deletedAt: string | null  // 软删除墓碑(可选增量 LAN 同步)
}
```

### 校验规则(创建/编辑时)

1. `title` trim 后不得为空,长度 1~50。
2. `type` 必须为三个枚举值之一。
3. `status` 必须为三个枚举值之一;新建时若未指定则 `todo`。
4. `priority` 必须为三个枚举值之一;新建时若未指定则 `medium`。
5. `tags` 数组每项 trim 后非空、长度 ≤20,去重(case-sensitive)。
6. `createdAt` 在创建时设为 `new Date().toISOString()`,此后不可变。
7. `updatedAt` 在创建与每次字段变更时设为 `new Date().toISOString()`;**也是 LAN 同步的版本向量**。
8. `completedAt` 仅当 `status === 'done'` 时为 ISO 字符串,否则必须为 `null`。
9. `deletedAt` 在创建时为 `null`;删除时设为当前时间;`purgeTombstones` 仅清理 30 天以上的老墓碑。

---

## 状态机: TaskStatus 流转

### 合法流转表

| from \ to | todo | in_progress | done |
|-----------|------|-------------|------|
| todo | ✅ | ✅ | ✅ |
| in_progress | ✅ | ✅ | ✅ |
| done | ✅ | ✅ | ✅ |

**说明**: 所有状态间互相流转均合法(含自转与回退),spec 明确要求允许回退(US1 验收场景 6)。

### 完成时间联动规则

| 触发 | 动作 |
|------|------|
| 流转至 `done` | `completedAt = new Date().toISOString()` |
| 从 `done` 流转至其他 | `completedAt = null` |
| 其他流转(非涉及 done) | `completedAt` 保持不变 |

`updatedAt` 在每次状态流转时一律刷新。

### 纯函数 API(对应 `src/lib/state-machine.ts`)

```typescript
// 判断流转是否合法(本期全部合法,但保留函数以便未来约束)
function canTransition(from: TaskStatus, to: TaskStatus): boolean

// 应用流转,返回新 task 对象(不可变更新)
function applyTransition(task: Task, to: TaskStatus): Task
```

`applyTransition` 同时处理 `status`、`completedAt`、`updatedAt` 三个字段的联动更新。

---

## 派生数据: 统计指标与图表

这些不是存储实体,而是从 `Task[]` + 时间范围实时派生(对应 `src/lib/stats.ts`)。

### 指标(Metrics)

| 字段 | 计算 |
|------|------|
| total | `tasks.length` |
| todo | `tasks.filter(t => t.status === 'todo').length` |
| inProgress | `tasks.filter(t => t.status === 'in_progress').length` |
| done | `tasks.filter(t => t.status === 'done').length` |
| completionRate | `done / total`(total = 0 时为 0) |
| weeklyNew | 近 7 天 `createdAt` 的任务数 |
| weeklyDone | 近 7 天 `completedAt` 的任务数 |
| averageCycleDays | 已完成任务的 `completedAt - createdAt` 平均天数 |

> **重要**: 所有指标与图表均基于 `selectActiveTasks` 过滤后的任务(即 `!t.deletedAt`)计算,墓碑记录不会污染统计。

### 图表数据

| 图表 | 数据结构 |
|------|---------|
| 类型分布环形图 | `{ type: TaskType; count: number }[]`(3 项,含 0) |
| 完成与新建趋势 | `{ date: 'YYYY-MM-DD'; created: number; completed: number }[]`(近 30 天) |
| 活动热力图 | `{ date: 'YYYY-MM-DD'; count: number }[]`(近 53 周 = 371 天;GitHub 风格对齐到当前周的周日) |

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
    - **(隐式)** 应用层通过 `selectActiveTasks` 在内存层过滤 `deletedAt`,不为墓碑单独建索引(避免双写开销)

### localStorage 结构

- **key**: `helm.ui-preferences`
- **value**: JSON 序列化的 `{ filters, sortKey, sortOrder, timeRange, showStats }`(由 `zustand/middleware` 的 `persist` 自动管理)

### 种子数据

- `seedIfEmpty()` 仅在 IndexedDB 完全为空时执行一次
- 5 条种子任务围绕 HELM 项目自身主题(idea / issue / exploration / sync / mobile / responsive)
- **种子任务使用固定 UUID**(`seed-0001-0000-0000-000000000001` ~ `...005`),确保 React StrictMode 在 dev 模式下 double-invoke effects 时,`db.put()` 的 upsert 语义不会产生重复

---

## 导出格式(对应 `src/lib/export.ts`)

```typescript
interface HelmExport {
  version: 1
  exportedAt: string   // ISO 8601
  tasks: Task[]        // 含 deletedAt;导入方决定是否保留墓碑
}
```

导出为 `helm-export-YYYYMMDD-HHMMSS.json` 文件下载。

---

## LAN 同步协议(对应 `src/lib/sync.ts` + `vite-plugin-sync.ts`)

> 本节描述**可选增量** M6 的数据流;不影响核心数据模型。

### 传输单元

```typescript
// 客户端 → Hub
interface StateMessage {
  type: 'state'
  tasks: Task[]   // 全量本地任务(含 deletedAt 墓碑)
}

// Hub → 客户端
interface SnapshotMessage {
  type: 'snapshot'
  tasks: Task[]   // Hub 持有的最新 state
}
```

### 合并算法 — LWW(Last-Write-Wins)

```typescript
function mergeTasks(local: Task[], remote: Task[]): Task[] {
  // 同 id 取 updatedAt 较大者;仅 local: 保留;仅 remote: 加入
}
```

**特性**:
- 稳定、幂等:对同一对 (local, remote) 多次调用结果一致
- 解决墓碑传播:remote 端的 `deletedAt` 也会通过 `updatedAt` 较新而胜出,接收端识别为删除

### 已知限制

- **离线新增**:设备 A 离线期间新增的任务 X,设备 B 在 A 重连前删除了不相关任务 Y;A 重连后收到不含 X 的 snapshot,Y 被同步过来,X 不会出现在 B 上(A 本地仍有 X)。这是 LWW 的固有限制,本期不解决。
- **Hub 不落盘**:dev server 重启后丢失最新 snapshot,需从任一设备重连重建;生产环境如需持久化同步,应自托管 Hub 并加磁盘落盘。

---

## Tombstone GC 策略

```typescript
// src/lib/db.ts
export async function purgeTombstones(ttlDays = 30): Promise<number>
```

- 仅物理清理 `deletedAt !== null && Date.now() - new Date(deletedAt) > ttlDays * 86400000` 的记录
- 建议在应用启动后跑一次(`init` 中调用)
- 30 天的 TTL 远大于任何设备的同步重连窗口,可保证删除事件有充足时间广播到所有 LAN 节点

---

## 兼容性

### UUID 生成降级

iPad Safari < 15.4 不支持 `crypto.randomUUID`。`src/lib/db.ts` 顶部实现的 `uuid()` 三级降级:

```typescript
function uuid(): string {
  if (c.randomUUID) return c.randomUUID()          // Chrome / Firefox / Safari 15.4+
  if (c.getRandomValues) return /* RFC 4122 v4 via getRandomValues */  // 旧 Safari
  return /* Math.random-based fallback */           // 极端兜底
}
```

### 时区

所有 ISO 8601 字符串带 `Z` 后缀(UTC)。统计中的「今天 / 本周 / 本月」按**本地时区**计算(为对齐用户直觉);活动热力图按 UTC 对齐周,与 GitHub 一致。