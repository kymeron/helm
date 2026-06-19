/**
 * Hook to subscribe to tasks and compute statistics.
 */

import { useMemo } from 'react'
import { useTasksStore, useUIStore } from '@/store'
import { computeMetrics, computeTypeDistribution, computeTrend, computeHeatmapData } from '@/lib/stats'
import type { Metrics, TypeDistribution, TrendDay, HeatmapDay } from '@/lib/stats'

interface UseStatsResult {
  metrics: Metrics
  typeDistribution: TypeDistribution[]
  trendData: TrendDay[]
  heatmapData: HeatmapDay[]
}

export function useStats(): UseStatsResult {
  const tasks = useTasksStore((s) => s.tasks)
  const timeRange = useUIStore((s) => s.timeRange)

  return useMemo(() => {
    const metrics = computeMetrics(tasks)
    const typeDistribution = computeTypeDistribution(tasks)
    const trendData = computeTrend(tasks)
    const heatmapData = computeHeatmapData(tasks)

    return {
      metrics,
      typeDistribution,
      trendData,
      heatmapData,
    }
  }, [tasks, timeRange])
}