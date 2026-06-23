# HELM · 驾驶舱

> 取自轮船的「舵」(helm)—— 寓意指引方向、掌控航向。
> 面向个人使用的驾驶舱看板:记录想法、跟踪进度、用数据辅助决策。PC / iPad / 手机均可使用,同 WiFi 下数据互通;部署到 Vercel 后,跨设备通过 Vercel KV 云端同步。

[![Stack](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Build](https://img.shields.io/badge/Vite-6-646cff)](https://vite.dev)
[![Type](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org)
[![Storage](https://img.shields.io/badge/Storage-IndexedDB-blueviolet)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![Cloud](https://img.shields.io/badge/Cloud-Vercel_KV-000000)](https://vercel.com/docs/storage/vercel-kv)
[![Sync](https://img.shields.io/badge/Sync-LAN_WebSocket_+_Vercel_KV-teal)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## ✨ 功能特性

- **任务卡片**:支持三种类型(Idea / Issue / Exploration)与三级优先级(Low / Medium / High),含描述、标签、创建/完成时间
- **三栏看板**:Todo / In Progress / Done,基于 `@dnd-kit` 实现流畅拖拽;移动端竖排堆叠
- **双击列头新建**:在「待办 / 进行中 / 已完成」标题行双击,直接以对应状态弹出新建表单
- **统计分析**:
  - 7 个核心指标卡片(总数 / 待办 / 进行中 / 已完成 / 完成率 / 本周新增 / 本周完成)
  - ECharts 环形图(类型分布)+ 双线折线图(完成与新建趋势)
  - **活动热力图**(纯 SVG,GitHub 风格,53 周 × 7 天,HELM teal 主色 6 级渐变)
- **筛选 / 排序 / 搜索**:按类型、优先级、标签筛选;按创建时间 / 优先级 / 更新时间排序;全文搜索
- **任务详情**:点击卡片查看只读详情页(描述、时间线、ID)
- **软删除墓碑**:删除时仅设 `deletedAt`,30 天后 GC;保证跨设备删除可传播
- **本地优先**:数据全部存储在浏览器 IndexedDB,无需后端、无需联网;支持 JSON 导出 / 导入
- **局域网同步(可选)**:同 WiFi 下,多台设备(PC + iPad + 手机)通过 WebSocket 自动同步;LWW 冲突合并 + 软删除墓碑
- **Vercel 云端同步(可选)**:部署到 Vercel 后,通过 Vercel KV 在 PC / 手机间同步完整任务快照;无长连接、离线可继续编辑
- **响应式适配**:iPad / 手机端自动切换紧凑布局,模态框底部弹出,键盘安全视口
- **兼容旧 iPad Safari**:`crypto.randomUUID` 三级降级(router → getRandomValues → Math.random)
- **深色极客风**:等宽字体点缀、冷色调呼应航海意象

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9(或 pnpm / yarn)

### 安装与启动

```bash
# 安装依赖
npm install

# 启动开发服务器(默认 http://localhost:5173,绑定 0.0.0.0)
npm run dev

# 构建生产版本(dist/)
npm run build

# 本地预览生产版本
npm run preview
```

> LAN 同步默认在开发态启用。Vite dev server 绑定 `0.0.0.0`,iPad / 手机可通过 `http://<电脑 IP>:5173` 访问,并自动加入同一同步 Hub。

### 测试与质量检查

```bash
# 类型检查
npx tsc --noEmit

# 运行单元测试(Vitest)
npm test

# 监听模式运行测试
npm run test:watch

# 代码检查(ESLint)
npm run lint
```

---

## 🧱 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | React 18 | UI 组件化 |
| 语言 | TypeScript (strict) | 类型安全 |
| 构建 | Vite 6 | 开发与构建;内嵌 WebSocket 同步插件 |
| 样式 | Tailwind CSS 3 | 原子化样式 + 响应式断点 |
| 状态管理 | Zustand 5 | 轻量全局状态(tasks / ui / sync) |
| 拖拽 | @dnd-kit | 看板卡片拖拽 |
| 图表 | ECharts 5 | 环形图 + 折线图 |
| 自绘可视化 | 纯 SVG | 活动热力图(53 周 × 7 天) |
| 同步 | ws (WebSocket) | 开发态内嵌同步 Hub |
| 云端同步 | Vercel KV + Serverless Functions | Vercel 部署跨设备快照同步 |
| 存储 | IndexedDB (idb) | 本地数据持久化 |
| 测试 | Vitest + Testing Library | 单元测试 |

---

## 📁 项目结构

```
helm/
├── api/
│   └── sync.ts             # Vercel Serverless Function:GET/POST 任务快照
├── src/
│   ├── components/
│   │   ├── kanban/         # 看板:Board / Column / Card / Modal(新建编辑)/ TaskDetailModal(只读详情)
│   │   ├── layout/         # 页面骨架:Dashboard / TopBar / FilterBar
│   │   ├── stats/          # 统计图表:Tiles / Charts / ActivityHeatmap
│   │   └── ui/             # 基础 UI:Button / Badge / Modal / EmptyState / SyncIndicator
│   ├── hooks/              # 自定义 Hooks:useTasks / useStats / useSync / useCloudSync
│   ├── lib/                # 纯函数:db / filters / stats / state-machine / time / export / sync / token / cloudSync
│   ├── store/              # Zustand 切片:tasksSlice / uiSlice
│   ├── styles/             # 全局样式(theme.css)
│   ├── types/              # 类型定义(task.ts / sync.ts)
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   └── unit/               # 单元测试(filters / state-machine / stats / sync / time / token / useCloudSync)
├── specs/001-helm-dashboard # Spec Kit 设计产物(spec / plan / tasks / contracts)
├── specs/002-cross-device-sync # 跨设备同步设计产物
├── .specify/                # Spec Kit 工具与宪法
├── vite-plugin-sync.ts     # 开发态 WebSocket 同步 Hub(/__helm-sync 端点)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 📦 数据模型

核心实体为 `Task`,定义见 [src/types/task.ts](src/types/task.ts):

```typescript
interface Task {
  id: string
  title: string
  description: string
  type: 'idea' | 'issue' | 'exploration'
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  completedAt: string | null
  deletedAt: string | null   // 软删除墓碑
}
```

- **类型颜色**:Idea = 琥珀 / Issue = 红 / Exploration = 青
- **状态流转**:todo ⇄ in_progress ⇄ done,允许任意方向回退
- **存储位置**:浏览器 IndexedDB(`helm-db` / `tasks` store),首次启动时自动写入 5 条示例数据
- **软删除墓碑**:`deletedAt` 非空时视为已删除,UI 隐藏但保留记录,30 天后由 `purgeTombstones` 物理清理

### 导出格式

```typescript
interface HelmExport {
  version: 1
  exportedAt: string  // ISO 8601
  tasks: Task[]
}
```

---

## 🔁 局域网同步

> 本功能为**可选增量**,默认在 `npm run dev` 时启用,生产构建不内置同步服务。

### 工作原理

- **Hub**:Vite 插件 (`vite-plugin-sync.ts`) 在 dev server 内嵌 WebSocket Server,监听 `/__helm-sync` 路径
- **客户端**:`src/hooks/useSync.ts` 在 Dashboard 挂载时连接 Hub,自动重连(指数退避 1s → 30s)
- **协议**:
  - `{ type: 'state', tasks }` — 客户端 → Hub,本地变更广播
  - `{ type: 'snapshot', tasks }` — Hub → 客户端,新设备连入时回放最新 state
- **冲突合并**:`mergeTasks()` 使用 LWW(Last-Write-Wins),按 `updatedAt` 比较
- **删除传播**:依赖 `deletedAt` 墓碑字段;接收端识别到墓碑后立即在本地反映删除

### 已知限制

| 限制 | 说明 |
|------|------|
| Hub 不落盘 | dev server 重启后丢失最新 snapshot,需从某台设备重连重建 |
| 无鉴权 | 任何同 WiFi 用户可加入,仅适合家用或受信任网络 |
| 离线新增 | 重连后通过 LWW 推送,但若对端已删除不相关任务可能产生覆盖 |

### 关闭同步

若仅需本地使用,可在 [Dashboard.tsx](src/components/layout/Dashboard.tsx) 中将 `useSync({ enabled: initialized })` 改为 `useSync({ enabled: false })`,同步层将完全跳过。

---

## ☁️ Vercel 云端同步

> 本功能为**可选增量**,用于 Vercel 生产部署场景,让 PC 与手机在不同网络下也能保持数据一致。

### 工作原理

- **服务端**:`api/sync.ts` 是 Vercel Serverless Function,通过 `@vercel/kv` 读写 Redis 中的任务快照
- **客户端**:`src/hooks/useCloudSync.ts` 在 Dashboard 挂载后自动拉取/推送快照,默认 5 秒拉取一次,本地变更 1 秒防抖后推送
- **身份标识**:匿名 token,优先从 URL `?token=xxx` 读取,其次 localStorage,都没有则自动生成;token 会同步写回 URL 方便分享
- **冲突合并**:复用 `mergeCloudSnapshot()` 做 LWW(Last-Write-Wins),按 `updatedAt` 比较
- **离线可用**:网络失败时降级为本地模式,恢复后自动重试;未配置 KV 时 `/api/sync` 返回 503,客户端保持 `idle`

### 部署配置

1. 在 Vercel Dashboard 中为项目创建 **KV** 数据库并绑定。
2. 重新部署,环境变量 `KV_URL` / `KV_REST_API_URL` / `KV_REST_API_TOKEN` 会自动注入 Serverless Function。
3. 在 PC 端打开部署地址,复制带 `?token=xxx` 的 URL 到手机浏览器,即可看到同一份数据。

### 已知限制

| 限制 | 说明 |
|------|------|
| 完整快照 | v1 使用完整任务数组快照,任务量极大时建议后续升级为增量同步 |
| 单 token | 分享 URL 即分享数据,适合单人使用;多用户协作不在 v1 范围 |
| 1 MB 上限 | 单快照最大 1 MB,超过会返回 413 |

---

## 📱 移动端适配要点

| 维度 | 实现 |
|------|------|
| viewport | 响应式 meta;`viewport-fit=cover`;`maximum-scale=5.0` |
| TopBar | 紧凑布局:小屏仅图标 / 中屏 icon + 短标签 / 大屏完整 |
| Kanban | 竖排堆叠(`flex-col md:flex-row`),列最小高度 280px |
| Modal | 桌面端居中 / 移动端底部弹出 + 圆角;sticky 操作栏 |
| 键盘安全 | 输入框字号 ≥ 16px;`enterKeyHint="done"`;回车提交;`dvh` 视口 |
| 主题 | 与桌面端完全一致;关闭 `-webkit-tap-highlight-color` |

---

## 🏛️ 设计原则 (Constitution)

HELM 严格遵循 `.specify/memory/constitution.md`(v1.2.0)中定义的核心原则:

1. **Simplicity First (YAGNI)** — 只构建当前规格需要的能力,克制抽象
2. **Local-First & Offline-Capable** — 无后端、无网络依赖,数据归用户
3. **Type-Safe by Default** — TypeScript strict,共享类型单一来源
4. **Component-Driven UI** — 小而独立的可复用组件,业务逻辑在 store
5. **Test-First for Core Logic** — 状态机、统计、筛选、同步合并等纯逻辑 TDD
6. **设备与网络边界清晰** — 核心本地能力 MUST 离线可用;LAN 同步、Vercel KV 云端同步与移动端响应式作为可选增量接入,失败不影响核心层

*(完整原则见 [constitution.md](.specify/memory/constitution.md))*

---

## 🗺️ 路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| ✅ M1 | 任务 CRUD + 三栏看板 + 拖拽 | 已完成 |
| ✅ M2 | 指标卡片 + ECharts 图表可视化 | 已完成 |
| ✅ M3 | 筛选排序 + 深色主题 + 交互动效 | 已完成 |
| ✅ M4 | JSON 导入 / 导出 + 软删除墓碑 | 已完成 |
| ✅ M5 | 移动端适配(iPad / 手机响应式布局) | 已完成 |
| ✅ M6 | 局域网同步(WebSocket + LWW + 墓碑广播) | 已完成 |
| ✅ M7 | 视觉打磨(活动热力图 GitHub 风格重制) | 已完成 |
| ✅ M8 | Vercel KV 云端同步(跨设备数据一致) | 已完成 |
| 🔜 M9 | 待规划:浅色主题 / 多用户协作 / 增量同步 | — |

更多需求与待确认项见 [PRD.md](PRD.md)。

---

## 📚 文档导航

| 文档 | 内容 |
|------|------|
| [PRD.md](PRD.md) | 产品需求、用户痛点、功能架构 |
| [specs/001-helm-dashboard/spec.md](specs/001-helm-dashboard/spec.md) | 功能规格 |
| [specs/001-helm-dashboard/plan.md](specs/001-helm-dashboard/plan.md) | 实施计划 |
| [specs/001-helm-dashboard/data-model.md](specs/001-helm-dashboard/data-model.md) | 数据模型 |
| [specs/001-helm-dashboard/contracts/](specs/001-helm-dashboard/contracts/) | 组件 / Store 契约 |
| [specs/002-cross-device-sync/spec.md](specs/002-cross-device-sync/spec.md) | 跨设备同步规格 |
| [specs/002-cross-device-sync/plan.md](specs/002-cross-device-sync/plan.md) | 跨设备同步实施计划 |
| [.specify/memory/constitution.md](.specify/memory/constitution.md) | 项目宪法 |

---

## 📝 License

本项目为个人项目,未指定开源协议。如需复用,请联系作者。