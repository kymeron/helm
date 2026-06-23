# Tasks: HELM Cross-Device Data Sync

**Input**: Design documents from `/specs/002-cross-device-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sync-api.md

**Tests**: Core sync logic (merge, token, snapshot) requires unit tests per Constitution Principle V.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create project structure for Vercel KV cloud sync.

- [x] T001 Install `@vercel/kv` dependency and add `api/` directory for Vercel serverless routes
- [x] T002 Add environment variable type declarations for `KV_URL` / `KV_REST_API_URL` / `KV_REST_API_TOKEN` in `src/vite-env.d.ts`
- [x] T003 Create `src/types/sync.ts` with `CloudSnapshot`, `SyncStatus`, and cloud sync error types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Implement `src/lib/token.ts`: generate URL-safe token, read token from URL query/localStorage, persist token, and reflect active token in URL
- [x] T005 Implement serverless API route `api/sync.ts`: handle `GET` (fetch snapshot from KV) and `POST` (write snapshot to KV) with token validation and 1 MB size limit
- [x] T006 Implement `src/lib/cloudSync.ts`: build sync URL helper, push snapshot `POST` helper, pull snapshot `GET` helper, and parse responses
- [x] T007 Extend existing `src/lib/sync.ts` with `mergeCloudSnapshot(localTasks, remoteTasks)` using LWW by `updatedAt` and tombstone propagation
- [x] T008 Add unit tests for `src/lib/token.ts` in `tests/unit/token.test.ts`
- [x] T009 Add unit tests for `mergeCloudSnapshot` in `tests/unit/sync.test.ts`

**Checkpoint**: Foundation ready - token lifecycle, serverless API, and merge logic are tested and user story implementation can now begin.

---

## Phase 3: User Story 1 - Cross-Device Sync (Priority: P1) 🎯 MVP

**Goal**: Changes made on any device are synchronized to other devices within seconds.

**Independent Test**: Create a task on PC; open the same `?token=xxx` URL on mobile; the task appears within 5 seconds.

### Tests for User Story 1

- [x] T010 [P] [US1] Contract test for `GET /api/sync?token=` in `tests/contract/sync-get.test.ts`
- [x] T011 [P] [US1] Contract test for `POST /api/sync?token=` in `tests/contract/sync-post.test.ts`
- [x] T012 [P] [US1] Unit test for `useCloudSync` push trigger in `tests/unit/useCloudSync.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Implement `src/hooks/useCloudSync.ts`: subscribe to task store changes, debounce push (1s), periodic pull (5s), and merge remote snapshots
- [x] T014 [US1] Mount `useCloudSync` in `src/App.tsx` (or root provider) when `KV_URL` is configured
- [x] T015 [US1] Update `src/components/ui/SyncIndicator.tsx` to display cloud sync states: `idle`, `syncing`, `synced`, `offline`, `error`
- [x] T016 [US1] Verify end-to-end via quickstart.md Scenario 1 (PC → mobile sync)

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Offline-First Resilience (Priority: P2)

**Goal**: Local operations continue to work when sync is unavailable; changes sync automatically when connectivity returns.

**Independent Test**: Enable offline mode, create/edit/delete tasks, restore connectivity, and verify all changes appear on a second device.

### Tests for User Story 2

- [x] T017 [P] [US2] Unit test for offline push queue / retry behavior in `tests/unit/useCloudSync.test.ts`
- [x] T018 [P] [US2] Unit test for conflict merge when server and local have divergent updates in `tests/unit/sync.test.ts`

### Implementation for User Story 2

- [x] T019 [US2] Add offline detection and retry logic to `src/hooks/useCloudSync.ts` (network failure → `offline` state → automatic retry on reconnect)
- [x] T020 [US2] Ensure local CRUD remains immediate and unblocked during sync errors
- [x] T021 [US2] Verify end-to-end via quickstart.md Scenario 2 (offline edit then sync)
- [x] T022 [US2] Verify end-to-end via quickstart.md Scenario 3 (conflict merge)

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Identity & Device Recognition (Priority: P2)

**Goal**: Multiple devices can access the same dataset via a shared anonymous token.

**Independent Test**: Open HELM on PC and mobile with the same `?token=xxx`; both devices display identical task data.

### Tests for User Story 3

- [x] T023 [P] [US3] Unit test for token generation uniqueness and URL-safe format in `tests/unit/token.test.ts`
- [x] T024 [P] [US3] Unit test for token precedence (URL query > localStorage > generate new) in `tests/unit/token.test.ts`

### Implementation for User Story 3

- [x] T025 [US3] Ensure `src/lib/token.ts` correctly reads `?token=` from URL on initial load and persists it to `localStorage`
- [x] T026 [US3] Ensure the active token is always reflected in the browser URL (replaceState) so users can share/bookmark
- [x] T027 [US3] Verify end-to-end via quickstart.md Scenario 1 using shared URL token across devices

**Checkpoint**: User Story 3 is independently functional.

---

## Phase 6: User Story 4 - Vercel Deployment Friendly (Priority: P3)

**Goal**: Sync works on Vercel without maintaining a long-running server and gracefully degrades when not configured.

**Independent Test**: Deploy to Vercel with KV bound; mobile and PC sync. Then remove KV config; app still works locally without errors.

### Tests for User Story 4

- [x] T028 [P] [US4] Unit test that `useCloudSync` stays in `idle` when `KV_URL` is missing in `tests/unit/useCloudSync.test.ts`
- [x] T029 [P] [US4] Unit test for snapshot size guard (reject > 1 MB) in `tests/unit/cloudSync.test.ts`

### Implementation for User Story 4

- [x] T030 [US4] Add `KV_URL` existence check in `src/hooks/useCloudSync.ts` to disable cloud sync when KV is not configured
- [x] T031 [US4] Add snapshot payload size guard in `api/sync.ts` and `src/lib/cloudSync.ts`
- [x] T032 [US4] Update deployment documentation in `specs/002-cross-device-sync/quickstart.md` with Vercel KV binding steps
- [x] T033 [US4] Verify end-to-end via quickstart.md Scenario 4 (no KV graceful fallback)

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [x] T034 [P] Add error telemetry / user-facing toast for persistent sync errors
- [x] T035 [P] Update README.md with Vercel KV sync setup instructions
- [x] T036 Run full test suite: `npx tsc -b --noEmit` and `npm run test`
- [x] T037 Run quickstart.md validation scenarios end-to-end
- [x] T038 Code cleanup: remove unused LAN sync code paths if superseded, or keep both as independent options

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion.
  - User stories can proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2 → P3).
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational / US1 - Builds on sync hook but independently testable via offline scenarios.
- **User Story 3 (P2)**: Can start after Foundational - Token utilities are foundational; story verifies multi-device identity flow.
- **User Story 4 (P3)**: Can start after Foundational - Deployment-specific verification.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel (within Phase 2).
- Once Foundational phase completes, US1, US3, and US4 can start in parallel; US2 depends on US1 sync hook existing.
- All tests for a user story marked [P] can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test PC → mobile sync independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test cross-device sync → Deploy/Demo (MVP!)
3. User Story 2 → Test offline resilience → Deploy/Demo
4. User Story 3 → Test shared token across devices → Deploy/Demo
5. User Story 4 → Test Vercel deployment and graceful fallback → Deploy/Demo

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story should be independently completable and testable.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
