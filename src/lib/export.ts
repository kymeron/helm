/**
 * Data export utilities for HELM.
 */

import type { Task, HelmExport } from '@/types/task'

/**
 * Serialize tasks into export format.
 */
export function serializeTasks(tasks: Task[]): HelmExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
  }
}

/**
 * Trigger browser download of tasks as JSON file.
 */
export function downloadTasks(tasks: Task[]): void {
  const exportData = serializeTasks(tasks)
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `helm-export-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}