/**
 * IndexedDB wrapper for HELM task persistence.
 * Uses 'idb' library for Promise-based API.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Task, TaskInput, TaskStatus, TaskType, Priority } from '@/types/task'

/**
 * Generate a RFC 4122 v4 UUID.
 * Prefers the native `crypto.randomUUID()` (Chrome / Firefox / Safari 15.4+),
 * and falls back to a `crypto.getRandomValues()`-based generator for
 * older Safari / iPad Safari where `randomUUID` is unavailable.
 */
function uuid(): string {
  const c = (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined) as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    // Per RFC 4122 §4.4: set version (4) and variant (10xx) bits.
    // Cast to number: with noUncheckedIndexedAccess, indexed access
    // on Uint8Array returns `number | undefined`.
    const b6 = bytes[6] as number
    const b8 = bytes[8] as number
    bytes[6] = (b6 & 0x0f) | 0x40
    bytes[8] = (b8 & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return (
      hex.slice(0, 8) + '-' +
      hex.slice(8, 12) + '-' +
      hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' +
      hex.slice(20)
    )
  }
  // Last resort: Math.random-based UUID (low entropy but still unique
  // enough for a single-user local DB). Should never hit in practice.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface HelmDB extends DBSchema {
  tasks: {
    key: string
    value: Task
    indexes: {
      'by-status': TaskStatus
      'by-type': TaskType
      'by-created': string
      'by-completed': string
    }
  }
}

const DB_NAME = 'helm-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<HelmDB>> | null = null

function getDB(): Promise<IDBPDatabase<HelmDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HelmDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' })
        store.createIndex('by-status', 'status')
        store.createIndex('by-type', 'type')
        store.createIndex('by-created', 'createdAt')
        store.createIndex('by-completed', 'completedAt')
      },
    })
  }
  return dbPromise
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDB()
  return db.getAll('tasks')
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const db = await getDB()
  return db.get('tasks', id)
}

export async function createTask(input: TaskInput): Promise<Task> {
  const db = await getDB()
  const now = new Date().toISOString()
  const task: Task = {
    id: uuid(),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    type: input.type,
    status: 'todo',
    priority: input.priority ?? 'medium',
    tags: input.tags?.map(t => t.trim()).filter(t => t.length > 0) ?? [],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    deletedAt: null,
  }
  await db.put('tasks', task)
  return task
}

export async function updateTask(id: string, updates: Partial<TaskInput>): Promise<Task | null> {
  const db = await getDB()
  const existing = await db.get('tasks', id)
  if (!existing) return null
  
  const updated: Task = {
    ...existing,
    title: updates.title?.trim() ?? existing.title,
    description: updates.description?.trim() ?? existing.description,
    type: updates.type ?? existing.type,
    priority: updates.priority ?? existing.priority,
    tags: updates.tags?.map(t => t.trim()).filter(t => t.length > 0) ?? existing.tags,
    updatedAt: new Date().toISOString(),
  }
  await db.put('tasks', updated)
  return updated
}

export async function updateTaskStatus(id: string, status: TaskStatus, completedAt: string | null): Promise<Task | null> {
  const db = await getDB()
  const existing = await db.get('tasks', id)
  if (!existing) return null
  
  const updated: Task = {
    ...existing,
    status,
    completedAt,
    updatedAt: new Date().toISOString(),
  }
  await db.put('tasks', updated)
  return updated
}

export async function deleteTask(id: string): Promise<boolean> {
  const db = await getDB()
  const existing = await db.get('tasks', id)
  if (!existing) return false
  // Soft delete: set deletedAt so the tombstone propagates through the
  // LAN sync layer. Hard GC of rows older than `deletedAt + TOMBSTONE_TTL`
  // can be added later (see `purgeTombstones`).
  const now = new Date().toISOString()
  const updated: Task = {
    ...existing,
    deletedAt: now,
    updatedAt: now,
  }
  await db.put('tasks', updated)
  return true
}

/**
 * Hard-remove soft-deleted tasks older than 30 days. Safe to call
 * periodically (e.g. on app boot) to keep IndexedDB tidy.
 */
export async function purgeTombstones(ttlDays = 30): Promise<number> {
  const db = await getDB()
  const all = await db.getAll('tasks')
  const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000
  const stale = all.filter(
    (t) => t.deletedAt && new Date(t.deletedAt).getTime() < cutoff,
  )
  const tx = db.transaction('tasks', 'readwrite')
  await Promise.all(stale.map((t) => tx.store.delete(t.id)))
  await tx.done
  return stale.length
}

export async function clearAllTasks(): Promise<void> {
  const db = await getDB()
  await db.clear('tasks')
}

/**
 * Bulk-insert or update a list of tasks in a single transaction.
 * Used by the LAN sync layer to reconcile local IndexedDB with a
 * remote snapshot in one round-trip.
 */
export async function bulkPutTasks(tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return
  const db = await getDB()
  const tx = db.transaction('tasks', 'readwrite')
  await Promise.all(tasks.map((t) => tx.store.put(t)))
  await tx.done
}

// ============================================
// Seed data — initialize sample tasks if DB is empty
// ============================================

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0)
  return d.toISOString()
}

interface SeedTask {
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: Priority
  tags: string[]
  createdDaysAgo: number
  completedDaysAgo?: number
}

const seedTasks: SeedTask[] = [
  // --- Todo ---
  { title: '添加 JSON 导入功能', description: '从 JSON 文件恢复任务,作为本地持久化的最后兜底。', type: 'idea', status: 'todo', priority: 'high', tags: ['feature'], createdDaysAgo: 2 },
  { title: '修复移动端新建按钮溢出', description: '当软键盘弹出时提交按钮会被遮挡。', type: 'issue', status: 'todo', priority: 'medium', tags: ['bug', 'mobile'], createdDaysAgo: 1 },

  // --- In Progress ---
  { title: '重构活动热力图配色', description: '使色阶与项目主题一致,GitHub 风格 + teal 主色。', type: 'exploration', status: 'in_progress', priority: 'medium', tags: ['ui'], createdDaysAgo: 5 },

  // --- Done ---
  { title: '搭建局域网同步层', description: '基于 Vite 插件的 WebSocket hub,tombstone 实现删除同步。', type: 'idea', status: 'done', priority: 'high', tags: ['sync'], createdDaysAgo: 12, completedDaysAgo: 2 },
  { title: '适配移动端布局', description: 'TopBar / Modal / Kanban 全部响应式化。', type: 'idea', status: 'done', priority: 'medium', tags: ['mobile', 'responsive'], createdDaysAgo: 8, completedDaysAgo: 1 },
]

export async function seedIfEmpty(): Promise<void> {
  const db = await getDB()
  const existing = await db.getAll('tasks')
  if (existing.length > 0) return

  for (const seed of seedTasks) {
    const createdAt = daysAgo(seed.createdDaysAgo)
    const updatedAt = seed.completedDaysAgo != null ? daysAgo(seed.completedDaysAgo) : createdAt
    const completedAt = seed.completedDaysAgo != null ? daysAgo(seed.completedDaysAgo) : null

    const task: Task = {
      id: uuid(),
      title: seed.title,
      description: seed.description,
      type: seed.type,
      status: seed.status,
      priority: seed.priority,
      tags: seed.tags,
      createdAt,
      updatedAt,
      completedAt,
      deletedAt: null,
    }
    await db.put('tasks', task)
  }
}