<!--
Sync Impact Report
- Version change: 0.0.0 (template) → 1.0.0
- Modified principles: N/A (initial ratification)
- Added sections:
  - Core Principles (5 principles)
  - Technology & Design Constraints
  - Development Workflow
  - Governance
- Removed sections: N/A
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ compatible (Constitution Check section generic)
  - .specify/templates/spec-template.md — ✅ compatible (no mandatory section conflicts)
  - .specify/templates/tasks-template.md — ✅ compatible (task phases align with workflow)
- Follow-up TODOs: None
-->

# HELM Constitution

## Core Principles

### I. Simplicity First (YAGNI)

HELM MUST remain as simple as possible while satisfying the current feature spec.

- Build ONLY what the current spec requires; do not speculatively add features,
  abstractions, or configuration for hypothetical future needs.
- Three similar lines of code are preferred over a premature abstraction.
- Complexity MUST be justified against a concrete, current requirement — not a
  future possibility.
- When faced with a decision, choose the simpler option unless it violates
  another principle.

**Rationale**: HELM is a personal tool to reduce decision fatigue, not amplify it.
Over-engineering a personal dashboard contradicts its purpose.

### II. Local-First & Offline-Capable

HELM MUST function fully without any backend service or network connection.

- All task data MUST persist in the browser (localStorage / IndexedDB).
- No runtime dependency on remote APIs for core features (CRUD, kanban, stats).
- Data export/import (JSON) MUST be supported so users own and can migrate
  their data.
- A backend/sync layer MAY be added later as a non-breaking enhancement, but
  the local-first contract MUST remain intact.

**Rationale**: The user opens HELM after work to capture fleeting ideas; any
network/auth friction destroys the moment. Local-first guarantees instant access
and data sovereignty.

### III. Type-Safe by Default

All HELM source code MUST be written in TypeScript with strict typing.

- `strict: true` in tsconfig; no `any` without an inline justification comment.
- Shared data shapes (Task, Stats, etc.) MUST be defined as interfaces/types
  in a single source of truth and reused across the app.
- Public component props and store APIs MUST be fully typed.

**Rationale**: A single-user app still accumulates state; types catch regressions
early and make AI-assisted refactoring safe.

### IV. Component-Driven UI

The HELM UI MUST be composed of small, reusable, independently testable
components.

- Each visual unit (Card, Column, StatTile, Chart) MUST be its own component.
- Business logic MUST live in stores/services, NOT inside components.
- Components MUST be presentational where possible; data fetching happens via
  hooks/store subscriptions.
- Tailwind CSS utility classes are the styling baseline; custom CSS is reserved
  for animations or theming tokens.

**Rationale**: A dashboard's value is in its parts composing cleanly. Component
boundaries keep the codebase navigable for both humans and AI agents.

### V. Test-First for Core Logic (NON-NEGOTIABLE)

Core business logic (task state machine, stats aggregation, filtering/sorting)
MUST be developed test-first.

- Write the test → confirm it fails → implement → confirm it passes.
- Red-Green-Refactor cycle is strictly enforced for: state transitions, stats
  computations, and any pure utility functions.
- UI components SHOULD have at least smoke tests; full visual regression testing
  is deferred until explicitly requested.

**Rationale**: The state machine and stats are HELM's brain — a bug there
silently corrupts the user's trust in their own data. Tests make that trust
verifiable.

## Technology & Design Constraints

**Project Type**: Single-page web application (SPA), PC browser target.

**Language**: TypeScript (strict mode).

**Framework**: React 18+ (function components, hooks).

**Build Tooling**: Vite.

**Styling**: Tailwind CSS (dark theme as default; geek/minimal aesthetic).

**State Management**: Zustand (lightweight, no boilerplate).

**Charts**: ECharts (via `echarts-for-react`) for all statistical visualizations.

**Drag & Drop**: `@dnd-kit/core` + `@dnd-kit/sortable` for kanban card movement.

**Storage**: IndexedDB (via `idb` wrapper) for task persistence; localStorage
for user preferences only.

**Testing**: Vitest + React Testing Library for unit/component tests;
Playwright reserved for future e2e if requested.

**Target Platform**: Modern evergreen browsers (Chrome / Edge / Safari latest),
minimum viewport width 1280px.

**Performance Goals**: First contentful paint ≤ 2s; drag interactions at 60fps;
stats computation over ≤ 1000 tasks in ≤ 50ms.

**Design Constraints**:
- Dark theme is the default and primary theme.
- Color palette: cool deep-blue/teal base (nautical "helm" motif).
- Type colors: idea = amber, issue = red, exploration = teal.
- Monospace font for numeric/data displays; sans-serif for UI text.
- No external icon CDN — bundle icons locally.

**Out of Scope (v1)**: Multi-user collaboration, server-side persistence,
authentication, mobile/responsive layout below 1280px, push notifications.

## Development Workflow

**Spec-Kit Driven**: Every feature follows the spec-kit pipeline —
`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-implement` → `/speckit-analyze`. No feature code is written without an
approved spec.md and plan.md.

**Branching**: One feature branch per spec, named `###-feature-name` (matching
the spec directory under `/specs/`).

**Commit Convention**: Conventional Commits
(`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Each task or logical
group of tasks gets its own commit.

**Quality Gates (before merge)**:
1. `tsc --noEmit` passes with zero errors.
2. `vitest run` passes with no failing tests.
3. New core-logic code has accompanying tests (Principle V).
4. No `any` types without inline justification.
5. Lint (`eslint`) reports zero errors.

**Constitution Check**: Every plan.md MUST include a Constitution Check section
verifying the feature against Principles I–V. Violations require a Complexity
Tracking entry with justification.

**AI Coding Etiquette**:
- AI agents MUST read the relevant spec.md/plan.md before editing code.
- AI agents MUST NOT create files unless absolutely necessary for the task.
- AI agents MUST prefer editing existing files over creating new ones.
- AI agents MUST NOT add comments/docstrings to code they did not change.
- AI agents MUST run the quality gates before declaring a task complete.

**Incremental Delivery**: Each user story (P1 → P2 → P3) MUST be independently
demoable. Stop and validate at each checkpoint before proceeding.

## Governance

This constitution is the supreme authority for HELM development decisions. It
supersedes ad-hoc preferences, framework defaults, and AI agent suggestions
where they conflict.

**Amendment Procedure**:
1. Propose the amendment with rationale.
2. Verify no existing principle is silently violated by the change.
3. Bump `CONSTITUTION_VERSION` per semantic versioning:
   - MAJOR: principle removal/redefinition or backward-incompatible governance.
   - MINOR: new principle/section added or materially expanded guidance.
   - PATCH: clarifications, wording, typo fixes, non-semantic refinements.
4. Update `LAST_AMENDED_DATE` to today (ISO `YYYY-MM-DD`).
5. Re-run the consistency propagation checklist across plan/spec/tasks
   templates and runtime guidance docs.

**Compliance Review**: Every `/speckit-plan` invocation MUST re-check the
constitution. Every `/speckit-analyze` invocation MUST report any drift.

**Runtime Guidance**: For day-to-day development decisions, consult the current
plan.md of the active feature. When plan.md is silent, this constitution
governs.

**Version**: 1.0.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-19
