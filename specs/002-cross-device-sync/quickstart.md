# Quickstart: Cross-Device Sync Validation

**Feature**: [spec.md](spec.md)

## Prerequisites

1. HELM 项目已部署到 Vercel 或本地运行 `vercel dev`。
2. 已在 Vercel 控制台创建 **Vercel KV** 存储并绑定到项目。
3. 已设置环境变量 `KV_URL`（Vercel KV 自动注入）。

## Vercel KV Setup

1. 进入项目 Vercel Dashboard → Storage → Create Database → KV。
2. 绑定到 HELM 项目。
3. 重新部署项目，使 `KV_URL` / `KV_REST_API_URL` / `KV_REST_API_TOKEN` 环境变量生效。

## Local Development

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link and run dev server with KV access
vercel link
vercel env pull .env.development.local
vercel dev
```

## Validation Scenarios

### Scenario 1: PC 新建，手机可见

1. 在 PC 浏览器打开部署地址，新建一条任务。
2. 复制浏览器地址栏中的 URL（含 `?token=xxx`）。
3. 在手机浏览器中打开同一 URL。
4. **Expected**: 手机端在 5 秒内显示 PC 端新建的任务。

### Scenario 2: 离线编辑后恢复同步

1. 在 PC 端关闭网络（DevTools → Network → Offline）。
2. 新建/编辑若干任务。
3. 恢复网络。
4. **Expected**: 本地任务继续保留，同步状态从「离线」恢复为「已同步」；打开手机端同一 token，能看到 PC 端的离线变更。

### Scenario 3: 冲突合并

1. 在 PC 和手机端分别离线编辑**同一条任务**的不同字段（如 PC 改标题，手机改优先级）。
2. 两台设备先后恢复网络。
3. **Expected**: 最终双方显示的任务以 `updatedAt` 最新的那次修改为准，无重复任务。

### Scenario 4: 未配置 KV 时优雅降级

1. 在本地临时移除 `KV_URL` 环境变量或启动普通 `npm run dev`。
2. 打开应用并进行本地 CRUD。
3. **Expected**: 应用正常工作，同步状态显示「未配置」或「不可用」，无报错。

## Expected Sync States

- `idle`: 同步层未启用（未配置 KV）。
- `connecting`: 正在尝试连接/同步。
- `synced`: 已与服务器快照对齐。
- `offline`: 网络或服务不可用，仅本地模式。
- `error`: 同步出现错误，已降级本地模式。

## Troubleshooting

- **手机与 PC 数据不一致**: 检查两台设备是否使用同一 `token`（URL 中的 `?token=xxx` 一致）。
- **KV 写入失败**: 检查 Vercel KV 是否已绑定，环境变量是否生效。
- **Payload Too Large**: 任务数据超过 1 MB，建议清理已完成任务或导出备份。
