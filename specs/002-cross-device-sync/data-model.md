# Data Model: Cross-Device Sync

**Feature**: [spec.md](spec.md)

## 概述

本迭代在现有 HELM 任务模型基础上，新增服务端持久化副本与设备身份标识。服务端不引入新的实体表，仅使用 Redis 字符串 key 存储每个用户 token 对应的完整任务快照。

## 实体

### UserToken（用户身份标识）

代表一个用户的数据分区键。

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | 随机生成的唯一标识，作为 Redis key 的组成部分 |
| createdAt | string (ISO 8601) | 首次生成时间 |

**约束**:

- token 长度 ≥ 16 字节随机字符串，URL-safe。
- 无密码、无邮箱，仅做数据分区。
- 泄露 token 即泄露任务数据（单人使用场景下可接受）。

### ServerSnapshot（服务端任务快照）

存储在 Redis 中的 value，为完整任务数组的 JSON 序列化。

| 字段 | 类型 | 说明 |
|------|------|------|
| tasks | `Task[]` | 与服务端同步的最新完整任务列表 |
| updatedAt | string (ISO 8601) | 服务端快照最后更新时间 |

**Redis key 格式**: `helm:tasks:{token}`

**TTL**: 默认 90 天无访问则过期，防止长期未使用数据无限占用。

### Task（复用现有实体）

核心任务实体保持不变，新增与服务端同步的语义：

```typescript
interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  completedAt: string | null
  deletedAt: string | null
}
```

所有字段已包含冲突合并所需信息（`updatedAt` 用于 LWW，`deletedAt` 用于删除传播）。

## 状态转换

### 客户端同步状态机

```
[未配置] -- 检测到环境变量 --> [可用]
[可用] -- 无 token --> [生成本地 token]
[可用] -- 有 token --> [尝试拉取快照]
[拉取成功] -- 本地有变更 --> [推送快照]
[拉取成功] -- 定时触发 --> [再次拉取]
[推送成功] -- 收到响应 --> [更新本地 syncAt]
[网络错误] -- 任意操作 --> [标记离线，继续本地 CRUD]
[离线] -- 网络恢复 --> [重试拉取/推送]
```

## 合并规则

服务端快照与本地 IndexedDB 数据合并时：

1. 以 task id 为键构建本地 map 与服务端 map。
2. 对同一 id：
   - 若任一方 `deletedAt` 非空且 `updatedAt` 较新，则结果含 `deletedAt`（软删除）。
   - 否则比较 `updatedAt`，取较新的一方作为该任务最终状态。
3. 仅存在于服务端或本地的任务，全部保留。
4. 合并结果写回本地 IndexedDB，并触发 UI 刷新。

## 设计约束

- 服务端不保留任务历史版本，仅保留最新快照。
- 不引入服务端生成的时间戳；`updatedAt` 由客户端生成并信任。
- 不引入增量 diff，首次实现使用完整快照以降低复杂度。
