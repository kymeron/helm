/**
 * IndexedDB wrapper for HELM task persistence.
 * Uses 'idb' library for Promise-based API.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Task, TaskInput, TaskStatus, TaskType, Priority } from '@/types/task'

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
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    type: input.type,
    status: 'todo',
    priority: input.priority ?? 'medium',
    tags: input.tags?.map(t => t.trim()).filter(t => t.length > 0) ?? [],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
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
  await db.delete('tasks', id)
  return true
}

export async function clearAllTasks(): Promise<void> {
  const db = await getDB()
  await db.clear('tasks')
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
  { title: 'Design landing page hero section', description: 'Create a bold hero with animated gradient mesh background and CTA.', type: 'idea', status: 'todo', priority: 'high', tags: ['design', 'frontend'], createdDaysAgo: 2 },
  { title: 'Fix memory leak in chart renderer', description: 'ECharts instances not being disposed on unmount.', type: 'issue', status: 'todo', priority: 'medium', tags: ['bug', 'performance'], createdDaysAgo: 3 },
  { title: 'Research WebGPU for data visualization', description: 'Evaluate if WebGPU can replace Canvas for large datasets.', type: 'exploration', status: 'todo', priority: 'low', tags: ['research', 'graphics'], createdDaysAgo: 5 },
  { title: 'Add keyboard shortcuts palette', description: 'Cmd+K to open command palette for quick task actions.', type: 'idea', status: 'todo', priority: 'medium', tags: ['ux', 'feature'], createdDaysAgo: 1 },
  { title: 'API rate limit hitting 429 errors', description: 'GitHub API calls exceeding 5000/hour limit during sync.', type: 'issue', status: 'todo', priority: 'high', tags: ['backend', 'urgent'], createdDaysAgo: 4 },
  { title: 'Evaluate Tailwind v4 migration', description: 'Assess breaking changes and benefits of upgrading.', type: 'exploration', status: 'todo', priority: 'medium', tags: ['tooling', 'research'], createdDaysAgo: 6 },

  // --- In Progress ---
  { title: 'Build task export to Notion', description: 'Sync completed tasks to Notion database via API.', type: 'idea', status: 'in_progress', priority: 'high', tags: ['integration', 'feature'], createdDaysAgo: 8 },
  { title: 'Resolve flaky E2E tests', description: 'Playwright tests failing intermittently on CI.', type: 'issue', status: 'in_progress', priority: 'medium', tags: ['testing', 'ci'], createdDaysAgo: 7 },
  { title: 'Explore vector search for task search', description: 'Use embeddings for semantic task search.', type: 'exploration', status: 'in_progress', priority: 'low', tags: ['ai', 'research'], createdDaysAgo: 10 },
  { title: 'Dark mode toggle persistence', description: 'Theme preference not saved to localStorage.', type: 'idea', status: 'in_progress', priority: 'medium', tags: ['ux', 'bug'], createdDaysAgo: 5 },
  { title: 'Optimize IndexedDB batch writes', description: 'Batch create/update operations to reduce transactions.', type: 'issue', status: 'in_progress', priority: 'high', tags: ['performance', 'backend'], createdDaysAgo: 9 },

  // --- Done ---
  { title: 'Set up CI/CD pipeline', description: 'GitHub Actions for lint, test, build, and deploy.', type: 'idea', status: 'done', priority: 'medium', tags: ['devops'], createdDaysAgo: 12, completedDaysAgo: 2 },
  { title: 'Fix authentication redirect loop', description: 'OAuth callback redirecting infinitely after login.', type: 'issue', status: 'done', priority: 'high', tags: ['bug', 'auth'], createdDaysAgo: 15, completedDaysAgo: 3 },
  { title: 'Document API endpoints', description: 'Write OpenAPI spec for all REST endpoints.', type: 'exploration', status: 'done', priority: 'low', tags: ['docs'], createdDaysAgo: 18, completedDaysAgo: 5 },
  { title: 'Implement task drag-and-drop', description: 'DnD-kit sortable columns with drag overlay.', type: 'idea', status: 'done', priority: 'medium', tags: ['feature', 'ux'], createdDaysAgo: 10, completedDaysAgo: 1 },
  { title: 'Resolve CSS specificity conflicts', description: 'Tailwind utilities overridden by base styles.', type: 'issue', status: 'done', priority: 'medium', tags: ['css', 'bug'], createdDaysAgo: 20, completedDaysAgo: 6 },
  { title: 'Add favicon and meta tags', description: 'SVG favicon and Open Graph tags for sharing.', type: 'idea', status: 'done', priority: 'low', tags: ['polish'], createdDaysAgo: 14, completedDaysAgo: 4 },
  { title: 'Profile React render performance', description: 'Identify unnecessary re-renders with DevTools profiler.', type: 'exploration', status: 'done', priority: 'medium', tags: ['performance'], createdDaysAgo: 22, completedDaysAgo: 7 },
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
      id: crypto.randomUUID(),
      title: seed.title,
      description: seed.description,
      type: seed.type,
      status: seed.status,
      priority: seed.priority,
      tags: seed.tags,
      createdAt,
      updatedAt,
      completedAt,
    }
    await db.put('tasks', task)
  }
}