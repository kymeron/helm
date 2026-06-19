# HELM · 驾驶舱

> 取自轮船的「舵」(helm) —— 寓意指引方向、掌控航向。
> 面向个人使用的 PC 端驾驶舱看板:记录想法、跟踪进度、用数据辅助决策。

[![Stack](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Build](https://img.shields.io/badge/Vite-6-646cff)](https://vite.dev)
[![Type](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org)
[![Storage](https://img.shields.io/badge/Storage-IndexedDB-blueviolet)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## ✨ 功能特性

- **任务卡片**:支持三种类型(Idea / Issue / Exploration)与三级优先级(Low / Medium / High)
- **三栏看板**:Todo / In Progress / Done,基于 `@dnd-kit` 实现流畅拖拽
- **统计分析**:基于 ECharts 的完成趋势、类型分布、状态条形、活跃度热力图
- **筛选与排序**:按类型、优先级、标签筛选,支持按时间/优先级排序
- **本地优先**:数据全部存储在浏览器 IndexedDB,无需后端、无需联网
- **数据可迁移**:支持 JSON 格式导出与导入,数据主权归用户
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

# 启动开发服务器(http://localhost:5173)
npm run dev

# 构建生产版本(dist/)
npm run build

# 本地预览生产版本
npm run preview
```

### 测试与质量检查

```bash
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
| 构建 | Vite 6 | 开发与构建 |
| 样式 | Tailwind CSS 3 | 原子化样式 |
| 状态管理 | Zustand 5 | 轻量全局状态(tasks / ui) |
| 拖拽 | @dnd-kit | 看板卡片拖拽 |
| 图表 | ECharts 5 | 统计可视化 |
| 存储 | IndexedDB (idb) | 本地数据持久化 |
| 测试 | Vitest + Testing Library | 单元测试 |

---

## 📁 项目结构

```
helm/
├── src/
│   ├── components/
│   │   ├── kanban/         # 看板相关:Board / Column / Card / Modal
│   │   ├── layout/         # 页面骨架:Dashboard / TopBar / FilterBar
│   │   ├── stats/          # 统计图表:Tiles / Charts / Heatmap
│   │   └── ui/             # 基础 UI:Button / Badge / Modal / EmptyState
│   ├── hooks/              # 自定义 Hooks:useTasks / useStats
│   ├── lib/                # 纯函数:db / filters / stats / state-machine / time / export
│   ├── store/              # Zustand 切片:tasksSlice / uiSlice
│   ├── styles/             # 全局样式(theme.css)
│   ├── types/              # 类型定义(task.ts)
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   └── unit/               # 单元测试(filters / state-machine / stats / time)
├── specs/001-helm-dashboard # Spec Kit 设计产物(spec / plan / tasks / contracts)
├── .specify/                # Spec Kit 工具与宪法
├── PRD.md                  # 产品需求文档
├── index.html
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
}
```

- **类型颜色**:Idea=琥珀 / Issue=红 / Exploration=青
- **状态流转**:todo ⇄ in_progress ⇄ done,允许任意方向回退
- **存储位置**:浏览器 IndexedDB(`helm-db` / `tasks` store),首次启动时自动写入示例数据

### 导出格式

```typescript
interface HelmExport {
  version: 1
  exportedAt: string  // ISO 8601
  tasks: Task[]
}
```

---

## 🏛️ 设计原则 (Constitution)

HELM 严格遵循 `.specify/memory/constitution.md` 中定义的核心原则:

1. **Simplicity First (YAGNI)** — 只构建当前规格需要的能力,克制抽象
2. **Local-First & Offline-Capable** — 无后端、无网络依赖,数据归用户
3. **Type-Safe by Default** — TypeScript strict,共享类型单一来源
4. *(完整原则见 [constitution.md](.specify/memory/constitution.md))*

---

## 🗺️ 路线图

| 阶段 | 内容 |
|------|------|
| ✅ M1 | 任务 CRUD + 三栏看板 + 拖拽 |
| ✅ M2 | 指标卡片 + ECharts 图表可视化 |
| ✅ M3 | 筛选排序 + 深色主题 + 交互动效 |
| 🚧 M4 | 数据导入/导出、归档视图 |

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
| [.specify/memory/constitution.md](.specify/memory/constitution.md) | 项目宪法 |

---

## 📝 License

本项目为个人项目,未指定开源协议。如需复用,请联系作者。