# Research: HELM Personal Dashboard

**Feature**: 001-helm-dashboard
**Date**: 2026-06-19(初版) / 2026-06-20(对齐 M5/M6/M7)
**Status**: Complete

本文档记录 Phase 0 研究结论,解决 Technical Context 中的所有技术选型与最佳实践问题。所有决策已与 `.specify/memory/constitution.md` v1.1.0 对齐。

---

## R1. 状态管理方案:Zustand vs Redux Toolkit vs Context+useReducer

**Decision**: Zustand

**Rationale**:
- HELM 状态规模小(任务列表 + UI 偏好 + 同步状态),Zustand 的 store + selector 模型足够。
- 无 boilerplate(对比 Redux Toolkit 的 configureStore / createSlice / reducer 仪式感)。
- 天然支持订阅外部变更(IndexedDB → store,store → WebSocket),便于本地优先架构。
- 与 React 18 并发渲染兼容良好,selector 避免不必要重渲染。

**Alternatives considered**:
- Redux Toolkit:成熟但仪式感重,对单用户小应用过度。
- Context + useReducer:无中间件、无 selector,状态增长后性能与组织成本上升。

**v1.1 补充**: zustand v5 + React 18 的 `useSyncExternalStore` 要求 selector 返回值**引用稳定**;凡返回新数组引用的 selector 必须用 `useShallow` 包装。这一约束在 M6 中通过 `selectActiveTasks` + `useShallow` 落地。

---

## R2. 本地持久化:IndexedDB(idb) vs localStorage vs Dexie

**Decision**: IndexedDB(经 `idb` 封装)存任务数据;localStorage 存 UI 偏好

**Rationale**:
- 任务数据可能达数百~千条,含描述字段,localStorage 的 5MB 上限与同步阻塞会成瓶颈。
- IndexedDB 容量大(数百 MB)、异步非阻塞,符合宪法原则 II 的本地优先与性能目标。
- `idb` 是轻量 Promise 封装(~1KB),比 Dexie 更小、API 更贴近原生,符合 YAGNI。
- UI 偏好(筛选 / 排序 / 时间范围 / 指标区显隐)数据量极小且需同步读取,localStorage 足矣。

**Alternatives considered**:
- 纯 localStorage:5MB 上限 + 同步阻塞,200 条以上任务即有风险。
- Dexie:功能强但体积大(~30KB),HELM 不需要其高级查询能力。

---

## R3. 拖拽方案:@dnd-kit vs react-dnd vs vuedraggable

**Decision**: @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities

**Rationale**:
- 现代化、零运行时依赖、Tree-shakeable,体积小。
- 原生支持键盘可访问性(宪法非功能要求「键盘可操作」)。
- API 清晰:DndContext(拖拽根)+ SortableContext(排序容器)+ useSortable(项)。
- 与 React 18 并发模式兼容,性能优秀,满足 60fps 目标。
- 同时支持鼠标 / 触控,移动端无需额外方案。

**Alternatives considered**:
- react-dnd:API 复杂、HTML5 backend 需额外依赖、维护活跃度下降。
- vuedraggable:Vue 生态,与 React 技术栈不符。

---

## R4. 图表方案:ECharts vs Recharts vs Chart.js

**Decision**: ECharts(经 `echarts-for-react`)用于类型分布 + 完成与新建趋势。**活动热力图改纯 SVG 自绘**(M7)。

**Rationale**:
- 类型分布 + 双线折线图:ECharts 原生支持且视觉精致。
- 深色主题适配优秀(HELM 默认深色),内置 theme 配置。
- 性能好,大数据量(1000 点)下流畅,满足性能目标。
- echarts-for-react 提供声明式 React 封装,符合组件驱动原则。

**热力图改 SVG 的理由(M7)**:
- ECharts heatmap 在 53 周 × 7 网格下,格子色阶与项目主色 teal 难以精确对齐
- 自绘 SVG 更容易实现 GitHub 风格的 6 级渐变 + 中文月 / 日标签
- SVG 体积更小、加载更快,适合嵌入固定卡片

**Alternatives considered**:
- Recharts:React 原生但 SVG 渲染,大数据量性能弱、深色定制繁琐。
- Chart.js:轻量但 React 集成需手写 wrapper,深色主题配置不如 ECharts。

---

## R5. 状态机实现:自建纯函数 vs XState

**Decision**: 自建纯函数(`src/lib/state-machine.ts`)

**Rationale**:
- HELM 状态机极简:3 状态 + 6 条流转(含回退),用纯函数 `canTransition(from, to)` + `applyTransition(task, to)` 即可。
- XState 体积大(~40KB)、学习成本高,对 3 状态机过度。
- 纯函数天然可测,符合宪法原则 V 的 TDD 要求。

**合法流转表**:

| from \ to | todo | in_progress | done |
|-----------|------|-------------|------|
| todo | - | ✅ | ✅ |
| in_progress | ✅ | - | ✅ |
| done | ✅ | ✅ | - |

**完成时间规则**: 流转到 `done` 时设置 `completedAt = now`;从 `done` 流转出去时清除 `completedAt`。

**Alternatives considered**:
- XState:过重,违反 YAGNI。

---

## R6. 统计聚合的实时性与性能

**Decision**: store 派生 + React useMemo 双层缓存

**Rationale**:
- `useStats()` 用 `useShallow(selectActiveTasks)` 获取任务(已过滤墓碑)+ `useMemo` 派生指标与图表数据。
- 任务变更触发 store 更新 → 组件重渲染 → useMemo 依赖变化自动重算,满足 FR-011 实时更新。
- 1000 条任务的聚合是纯计算(计数 + 分组 + 日期分桶),<50ms 可达,无需 Web Worker。
- 时间范围切换只改 `uiSlice.timeRange`,`useStats` 依赖变化即重算。

**Alternatives considered**:
- Web Worker:1000 条量级无需,违反 YAGNI。
- 预计算缓存:增加一致性复杂度,收益不抵成本。

---

## R7. 测试策略

**Decision**: Vitest + React Testing Library,分层覆盖

**Rationale**:
- Vitest 与 Vite 共享配置,零额外构建,速度快。
- RTL 贴近用户行为,符合「以用户故事验证」的 spec 哲学。

**覆盖分层**:
1. **纯逻辑(必测,TDD)**: state-machine / stats / filters / time / **sync** —— 单元测试,覆盖所有分支与边界。
2. **组件(smoke)**: TaskCard 渲染、KanbanBoard 拖拽行为、StatBar 数值显示 —— RTL 渲染 + fireEvent。
3. **集成(按需)**: 新建 → 看板 → 拖拽 → 完成 的端到端用户旅程,用 RTL 串起来。
4. **E2E(延后)**: Playwright 不在 v1 引入,除非用户明确要求。

**Alternatives considered**:
- Jest:配置重、与 Vite 集成需额外适配。
- 纯 Enzyme:已停止维护,RTL 是社区标准。

---

## R8. 深色主题与色板实现

**Decision**: Tailwind `darkMode: 'class'` + CSS 变量 + 固定类型色板

**Rationale**:
- `darkMode: 'class'`:在 `<html>` 加 `class="dark"` 默认启用深色,避免依赖系统偏好(HELM 深色为默认)。
- CSS 变量定义语义色(bg-surface / text-primary / accent 等),便于未来扩展浅色主题(v1 不做但留口子)。
- 类型色板固定为 Tailwind 色阶常量,集中在 `tailwind.config.ts`:
  - idea = amber-400
  - issue = red-400
  - exploration = teal-400
- 字体:UI 用系统无衬线栈;数据 / 数字用 `font-mono`(等宽),呼应极客风。

**Alternatives considered**:
- CSS-in-JS(styled-components):运行时开销,违反 Tailwind 基线原则。
- 纯内联色值:散落难维护。

---

## R9. 数据导出格式

**Decision**: 单个 JSON 文件,结构为 `{ version, exportedAt, tasks: Task[] }`

**Rationale**:
- 结构带版本号便于未来导入兼容。
- `tasks` 为完整 Task 数组(含 `deletedAt`),与 IndexedDB 存储结构一致,导入即全量替换。
- 导出触发浏览器下载(Blob + URL.createObjectURL),无需后端。

**Alternatives considered**:
- CSV:丢失类型 / 标签等结构化字段。
- 多文件 zip:过重,违反 YAGNI。

---

## R10. 项目初始化与构建

**Decision**: Vite + React-TS 模板

**Rationale**:
- `npm create vite@latest . -- --template react-ts` 一键生成基础结构。
- Vite 开发体验快(ESM + HMR),生产构建 Rollup 优化。
- 模板已含 tsconfig、eslint 基础配置,在其上扩展 strict + Tailwind 即可。

---

## R11. 移动端适配策略(增量 M5)

**Decision**: 渐进式响应式,Tailwind 断点 + 关键 iOS 适配点

**Rationale**:

| 维度 | 决策 | 理由 |
|------|------|------|
| 断点 | `sm: 640` / `md: 768` / `lg: 1024` / `xl: 1280` | 沿用 Tailwind 默认;`md+` 为桌面布局 |
| viewport meta | `width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover` | 保留用户缩放,支持 iPad 横竖屏 + 刘海屏 |
| 看板布局 | `flex-col md:flex-row` | 桌面并排、移动端竖排 |
| 模态框 | `items-end md:items-center` + `max-h-[90dvh]` | 移动端底部弹出 + 键盘安全视口 |
| 输入框 | `font-size: 16px` + `@supports (-webkit-touch-callout: none)` | 仅 iOS Safari 应用,防止自动缩放 |
| 键盘体验 | `enterKeyHint="done"` + auto-focus + Enter 提交 | 移动端键盘交互优化 |
| 导航 | 顶部 sticky + backdrop-blur | 滚动时保持可访问 |
| 图标 | Tailwind 文本图标 + lucide-react | 不引入重型图标库 |

**Alternatives considered**:
- React Native Web:过重,违反 YAGNI。
- PWA + Service Worker:涉及离线缓存策略,v1 仅 IndexedDB 即可。
- 重新设计移动端 UI:成本高,渐进式响应式已能满足个人使用。

---

## R12. 局域网同步方案(增量 M6)

**Decision**: Vite 插件内嵌 WebSocket Hub,客户端 LWW + 软删除墓碑

**Rationale**:

| 维度 | 决策 | 理由 |
|------|------|------|
| 拓扑 | Star(所有设备 → Hub → 其他设备) | 单用户 LAN 场景足够;无需 P2P |
| Hub | Vite dev server 内嵌 WebSocketServer(`ws` 库) | 零额外进程,开发体验原生 |
| 协议 | `{ type: 'state' \| 'snapshot', tasks }` JSON | 简洁,可手工调试 |
| 冲突合并 | LWW(`updatedAt` 作版本向量) | 单用户场景无需向量时钟 |
| 删除传播 | `deletedAt` 软删除墓碑 | LWW 无法区分「从未存在 vs 被删除」 |
| 重连 | 指数退避 1s → 30s | 不阻塞本地 CRUD |
| 持久化 | Hub 仅内存 | 简单优于复杂;重启可从设备重连重建 |
| 鉴权 | 无 | 家用 LAN,公开网络应自托管 |

**关键 Bug 防御**:
- **echo 抑制**:`applyingRemoteRef` 标志,接收 snapshot 时设 true,合并 + `replaceAllTasks` 后清除;订阅回调检查该标志跳过推送
- **payload 校验**:`onmessage` 中验证 `{ type: 'snapshot', tasks: Task[] }` 形状;长度 > 0 时抽样校验字段类型
- **selector 引用稳定**:`useTasks` / `useStats` 必须用 `useShallow(selectActiveTasks)`;否则 `replaceAllTasks` 触发新数组引用 → 无限渲染 → 页面空白

**Alternatives considered**:
- 真实后端 + 数据库:违反 YAGNI 与本地优先原则;且需要鉴权 / 部署。
- CRDT(Y.js / Automerge):过重,单用户场景 LWW 已足够。
- 仅文件服务器(NFS / Dropbox):无法解决实时并发;且无 LAN 鉴权保护。
- BroadcastChannel API(同源多标签同步):不能跨设备,仅作未来增强。

---

## R13. 旧浏览器兼容(增量 M5)

**Decision**: `crypto.randomUUID` 三级降级

**Rationale**:
- iPad Safari < 15.4 不支持 `crypto.randomUUID`,会抛 `TypeError`
- 必须有降级路径才能让旧设备(常见于「在家用旧 iPad 记想法」)使用

**降级链**:
```typescript
1. crypto.randomUUID()                  // Chrome / Firefox / Safari 15.4+
2. crypto.getRandomValues() → RFC 4122 // 旧 Safari(15.4 以下)
3. Math.random()                        // 极端兜底(几乎不可达)
```

**Alternatives considered**:
- `nanoid` 库:增加 ~1KB 依赖,本场景不必要。
- 时间戳 + 计数器:有碰撞风险。

---

## 结论

所有 Technical Context 项已明确,无 `NEEDS CLARIFICATION` 残留。技术选型与宪法 v1.1.0 六原则一致(M5/M6 作为可选增量严格遵守原则 VI「设备与网络边界清晰」)。