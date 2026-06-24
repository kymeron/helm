# HELM 部署与运维手册

> 面向运维者:把 HELM 部署到 Vercel 并接入 Upstash Redis 云端同步的完整步骤、故障排查与日常维护清单。

---

## 目录

1. [前置准备](#前置准备)
2. [Upstash Redis 配置](#upstash-redis-配置)
3. [Vercel 项目配置](#vercel-项目配置)
4. [首次部署与验证](#首次部署与验证)
5. [跨设备同步使用流程](#跨设备同步使用流程)
6. [常见问题与故障排查](#常见问题与故障排查)
7. [日常维护](#日常维护)
8. [成本与限额参考](#成本与限额参考)
9. [升级与回滚](#升级与回滚)

---

## 前置准备

| 资源 | 用途 | 是否必需 |
|------|------|----------|
| GitHub 账号 | 拉取 HELM 仓库 | 必需 |
| Vercel 账号 | 托管前端与 Serverless Function | 必需 |
| Upstash 账号 | 托管 Redis 快照存储 | 仅云端同步需要 |
| 域名(可选) | 自定义访问地址 | 可选 |

**推荐计划**:
- Vercel **Hobby** (免费) 即可,HELM 是纯静态前端 + 一个轻量 Function
- Upstash **Free** (256 MB / 10k 命令/天),个人使用足够

**Vercel 与 Upstash 的关系**:
- 它们是**完全独立**的两个服务,不要在 Vercel 控制台里找 Upstash 集成
- 我们通过**手动复制 Upstash 的 REST 凭据**到 Vercel 环境变量实现对接
- 这样既不依赖 Vercel 集成功能,又便于在不同云厂商间迁移

---

## Upstash Redis 配置

### 1. 创建数据库

1. 打开 https://console.upstash.com/ ,使用 GitHub 账号登录
2. 控制台首页 → **Create Database**
3. 填写:
   - **Name**: `helm-sync` (任意英文名)
   - **Region**:
     - 国内用户推荐 `ap-southeast-1` (新加坡) 或 `hkg1` (香港)
     - 欧美用户选 `us-east-1` / `eu-west-1` 等就近区域
   - **TLS**: 默认开启
   - **Eviction**: 关闭 (我们用 TTL 而非 Eviction)
4. 点击 **Create**

### 2. 获取凭据

数据库创建完成后,自动跳转到详情页。在 **REST API** 区域可看到:

```
UPSTASH_REDIS_REST_URL    = https://xxxx-xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN  = AXxx...xxxxx==
```

> ⚠️ **重要**:`REST TOKEN` 等同于数据库主密码,不要提交到 Git 仓库

### 3. 可选:验证凭据

在 Upstash 控制台的 **CLI** 标签页,执行:

```bash
PING
# 应返回: PONG

SET helm:test "hello"
# 应返回: OK

GET helm:test
# 应返回: "hello"
```

确认 REST 凭据可用后再继续 Vercel 配置。

---

## Vercel 项目配置

### 1. 导入仓库

1. 打开 https://vercel.com/dashboard
2. 点击 **Add New → Project**
3. 选 GitHub 仓库 `kymeron/helm` (或你 fork 的仓库)
4. 配置项:
   - **Framework Preset**: Vite (Vercel 会自动识别)
   - **Build Command**: `npm run build` (默认即可)
   - **Output Directory**: `dist` (默认即可)
   - **Install Command**: `npm install` (默认即可)
5. 先**不**点击 Deploy,继续下一步配置环境变量

### 2. 添加环境变量

在 **Environment Variables** 区域,新增:

| Name | Value | 适用环境 |
|------|-------|----------|
| `UPSTASH_REDIS_REST_URL` | `https://xxxx-xxxx.upstash.io` | Production / Preview / Development 全勾 |
| `UPSTASH_REDIS_REST_TOKEN` | `AXxx...xxxxx==` | 同上 |

> 三个环境**都必须勾上**,否则 Preview 部署无法使用同步功能

### 3. 部署

点击 **Deploy**,等待构建完成(约 1-2 分钟)。

### 4. 后续重新部署

- **代码变更** → 推送到 GitHub → Vercel 自动构建部署
- **环境变量变更** → 不会自动重新部署,需手动 Redeploy:
  1. Deployments 页面 → 最新部署 → 右侧 `⋯`
  2. 选择 **Redeploy**
  3. 建议**取消勾选** "Use existing Build Cache",确保 Function 重新注入最新环境变量

---

## 首次部署与验证

### 1. 健康检查

部署完成后,在浏览器中访问:

```
https://<your-project>.vercel.app/api/sync?token=test
```

**期望响应**(200 OK):

```json
{"tasks":[],"updatedAt":null}
```

**如果返回 503**:
```json
{"error":"Sync not configured"}
```

说明环境变量未注入。请检查:
1. Vercel → Settings → Environment Variables 里 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 都存在
2. 重新 Redeploy 且**未使用 Build Cache**

### 2. 端到端验证

1. 在 PC 浏览器打开 `https://<your-project>.vercel.app/`
2. 新建一条任务
3. 查看浏览器地址栏,应自动变成 `https://<your-project>.vercel.app/?token=IV69j5-xxxx`
4. 复制该完整 URL,在手机浏览器打开
5. **期望**:手机端 5 秒内看到 PC 端新建的任务

### 3. 离线 / 同步状态验证

| 状态 | 触发方式 | 期望表现 |
|------|----------|----------|
| 🟢 已同步 | 正常网络 | 顶部同步指示器绿色呼吸灯 |
| 🟡 同步中 | 首次加载 / 同步过程中 | 黄色脉冲 |
| 🟡 离线 | 关闭网络 | 黄色静态 |
| 🔴 同步出错 | API 500 / Upstash 限流 | 红色 |

---

## 跨设备同步使用流程

### 首次使用

1. **PC 端**:在浏览器访问 Vercel 部署地址
2. 系统自动生成匿名 token 并写入 URL: `https://xxx.vercel.app/?token=xxxx`
3. **手机端**:复制 PC 端完整 URL(包括 `?token=xxx`),在手机浏览器打开
4. 两端自动建立同步,数据 LWW 合并

### 多设备添加

- 新设备只需访问**任意已建立同步的设备分享的 URL**即可加入
- 每个设备的本地数据会与云端快照合并,新设备不会清空已有任务

### 清除浏览器数据后恢复

1. 清除 localStorage 后,URL 里的 `?token=xxx` 仍可识别身份
2. 若 URL 也丢失,本地数据无法恢复 (这是匿名 token 的设计取舍,详见 `specs/002-cross-device-sync/spec.md`)

---

## 常见问题与故障排查

### Q1: 同步指示器一直显示"连接中"

**可能原因**:
- Vercel Serverless Function 冷启动慢(首次访问 > 10 秒)
- 浏览器 fetch 卡住,未收到响应

**排查步骤**:
1. 打开浏览器 DevTools → Network → 过滤 `sync`
2. 查看请求是否返回 200,响应体是否包含 `tasks` 字段
3. 等待 30 秒看是否能切到"已同步"或"同步出错"
4. 若持续无响应,见 Q2 排查 Upstash 凭据

### Q2: `/api/sync?token=test` 返回 503

**原因**: Upstash 环境变量未注入到 Serverless Function

**解决**:
1. 确认 Vercel → Settings → Environment Variables 中有 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
2. **必须 Redeploy** 且取消勾选 "Use existing Build Cache"
3. Redeploy 后再访问 `/api/sync?token=test` 验证

### Q3: PC 和手机数据不一致

**原因 1(最常见)**:两端使用了不同的 token

**解决**:在 PC 端打开页面后,**显式复制浏览器地址栏里的完整 URL**(包含 `?token=xxx`)到手机端访问

**原因 2**:本地有未同步的变更,网络不稳定

**解决**:
1. 等待 10 秒,观察同步状态是否变 "已同步"
2. PC 端刷新页面触发重新拉取

**原因 3**:Vercel Function 返回 500

**解决**:
1. Vercel → Deployments → 最新部署 → **Functions** 标签
2. 查看 `/api/sync` 的执行日志
3. 常见错误: Upstash 凭据错误 / 超出 1 MB 限制

### Q4: Upstash 控制台看不到任何 Key

**原因**:HELM 使用匿名 token 作为 key 前缀,Upstash CLI 默认只列出有 TTL 的 key

**解决**:
1. 在 Upstash CLI 执行: `KEYS helm:*`
2. 应能看到 `helm:tasks:<token>` 形式的 key

### Q5: 部署后样式错乱

**原因**:Vite 静态资源路径配置问题

**解决**:
1. 确认 `vite.config.ts` 中 `base` 配置正确(默认 `/`)
2. Vercel 部署会自动处理,无需手动配置

---

## 日常维护

### 定期检查清单(每月)

- [ ] 登录 Upstash 控制台,检查 **Daily Commands** 使用量(免费层 10k/天)
- [ ] 登录 Vercel 控制台,检查 **Bandwidth** 与 **Function Invocations** 使用量
- [ ] 访问 `/api/sync?token=test` 确认返回 200
- [ ] 在 PC + 手机端各访问一次,确认数据同步正常

### 数据备份

- **客户端**:每个浏览器本地 IndexedDB 即是数据副本
- **云端**:Upstash 持久化数据,默认 TTL 90 天无访问会过期
- **导出备份**:应用内提供 JSON 导出功能,建议每月一次

### 清理云端数据

如需重置云端快照(例如想重新开始):

1. 在 PC 端打开页面,鼠标 hover 同步状态 → 记录当前 token
2. 登录 Upstash CLI:
   ```bash
   DEL helm:tasks:<token>
   ```
3. PC 端刷新页面,会拉取到空快照,然后本地数据会推上去

### 重新生成 token

如怀疑 token 泄露:

1. 打开 DevTools 控制台执行:
   ```js
   localStorage.removeItem('helm:cloud-sync-token')
   location.search = ''
   ```
2. 页面刷新后会生成新 token,URL 自动更新
3. 在其他设备访问新 URL 即可同步到新数据集

---

## 成本与限额参考

### Upstash Free 限额

| 项目 | 限额 |
|------|------|
| 数据库数 | 1 个 |
| 数据大小 | 256 MB |
| 每日命令数 | 10,000 |
| 单 key 大小 | 1 MB (我们限定 1 MB 上限) |

**HELM 典型用量估算**:
- 拉取:每 5 秒一次 = 17,280 次/天(超出免费层)
- 推送:本地变更后防抖,平均 100 次/天

> ⚠️ 如果频繁触发,可能超过 Upstash 免费层。解决方案:把客户端的 `PULL_INTERVAL_MS` 调大(例如 30 秒),或者升级 Upstash Pay-as-you-go($0.2/100k 命令)

### Vercel Hobby 限额

| 项目 | 限额 |
|------|------|
| 带宽 | 100 GB/月 |
| Serverless Function 执行时间 | 10s/次,100 GB-Hours/月 |
| 部署次数 | 无限(但有限速) |

HELM Function 每次执行 < 500ms,单次请求约 5 KB,远低于限额。

---

## 升级与回滚

### 升级 HELM 版本

```bash
git pull origin main
git push origin main
```

Vercel 会自动构建并部署新版本。**已有的云端快照与本地数据均不会丢失**(基于 token 的数据分区隔离)。

### 回滚到上一版本

1. Vercel → Deployments
2. 找到想回滚的部署记录 → 右侧 `⋯` → **Promote to Production**
3. 立即生效,**不会丢失云端或本地数据**

### 切换 Upstash 区域

如需更换 Upstash 数据库(例如迁移到更近的 region):

1. 在新 region 创建 Upstash 数据库
2. Vercel 环境变量更新为新数据库的 `REST URL` / `REST TOKEN`
3. Redeploy
4. **注意**:云端快照是按 token 隔离的,新数据库开始是空的,设备首次同步会以本地数据初始化

---

## 相关文档

- [README.md](../README.md) — 项目总体说明
- [specs/002-cross-device-sync/spec.md](../specs/002-cross-device-sync/spec.md) — 跨设备同步需求规格
- [specs/002-cross-device-sync/plan.md](../specs/002-cross-device-sync/plan.md) — 跨设备同步实施计划
- [specs/002-cross-device-sync/quickstart.md](../specs/002-cross-device-sync/quickstart.md) — 快速验证场景
- [.specify/memory/constitution.md](../.specify/memory/constitution.md) — 项目宪法

---

**版本**: 1.0.0 | **最后更新**: 2026-06-21
