# Research: Cross-Device Sync for Vercel Deployment

**Date**: 2026-06-21
**Feature**: [spec.md](spec.md)

## Decision

采用 **Vercel KV (Upstash Redis) + Vercel Serverless Functions** 作为跨设备同步后端，客户端通过 HTTP API 推拉任务快照，身份识别使用匿名 token（URL 参数或 localStorage 持久化）。

## Rationale

1. **与 Vercel 原生集成**: 用户已使用 Vercel 部署，Vercel KV 可通过 Vercel 控制台一键创建并绑定环境变量，运维成本最低。
2. **无长期运行服务**: Vercel Serverless Functions 按需执行，无需维护一台常驻服务器，符合「部署友好」的用户故事。
3. **简单快照模型**: 个人使用场景任务量小（≤1000 条），将完整任务数组以 JSON 字符串存入 Redis 足够简单且满足需求。
4. **离线优先**: 客户端本地 IndexedDB 仍是核心存储，网络请求失败时不阻塞本地操作，仅影响同步状态。
5. **成本可控**: Vercel KV 免费额度对个人低频使用足够。

## Alternatives Considered

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| WebSocket on Vercel | 实时 | Vercel 无原生长连接支持，需第三方服务（PartyKit/Ably/Pusher），增加依赖与成本 | 过于复杂，不选 |
| Vercel Postgres | 结构化查询、关系数据 | 需要 schema 迁移，对简单快照过度设计 | 过度设计，不选 |
| Supabase / Firebase | 功能完整、实时订阅 | 引入额外供应商账号与 SDK，增加复杂度 | 不够原生，不选 |
| Cloudflare D1 + Workers | 边缘性能、成本低 | 需切换到 Cloudflare 生态，与 Vercel 部署割裂 | 不符合用户现有部署平台 |
| 纯客户端 P2P (WebRTC) | 无服务器 | NAT 穿透复杂、可靠性差、首次配对困难 | 不适合普通用户 |

## Sync Protocol

采用 **客户端主导的快照同步（client-authoritative snapshot sync）**：

1. 客户端在本地变更后，将完整任务数组推送到服务端，以用户 token 为 key 写入 Redis。
2. 客户端周期性（默认 5 秒）拉取服务端快照，与本地合并（LWW）。
3. 首次加载时，客户端先读取本地 IndexedDB，再拉取服务端快照合并，服务端优先（server wins）处理冲突。

身份 token：

- 首次访问时若 URL 无 token，生成一个随机 token 并存入 localStorage。
- 用户可通过分享带 `?token=xxx` 的 URL 在其他设备上访问同一份数据。
- token 仅作为数据分区键，无鉴权，符合 v1 单人使用假设。

## Conflict Resolution

复用现有 `mergeTasks` 的 LWW 策略：

- 以 `updatedAt` 作为版本向量，时间新者胜出。
- 删除通过 `deletedAt` 墓碑传播。
- 若服务端与本地各有新建任务，合并后保留全部（id 唯一）。

## Constitutional Impact

本 feature 涉及宪法 **Out of Scope** 中的「服务器侧持久化」与「公开互联网同步」。由于用户明确使用 Vercel 部署并遇到跨设备数据不一致问题，这是合理的 v1.1+ 演进。建议在 plan.md 的 Constitution Check 中标记为「需更新宪法」并提交给用户确认。
