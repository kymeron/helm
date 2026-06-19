import { StatTile } from '@/components/stats/StatTile'
import { useStats } from '@/hooks/useStats'

function StatBar() {
  const { metrics } = useStats()

  const cycleDays = metrics.averageCycleDays.toFixed(1)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StatTile
        index={0}
        label="进行中"
        value={String(metrics.inProgress).padStart(2, '0')}
        hint="当前活跃"
        accent="default"
      />
      <StatTile
        index={1}
        label="本周新增"
        value={String(metrics.weeklyNew).padStart(2, '0')}
        hint="近 7 天"
        accent="idea"
      />
      <StatTile
        index={2}
        label="本周完成"
        value={String(metrics.weeklyDone).padStart(2, '0')}
        hint="近 7 天"
        accent="accent"
      />
      <StatTile
        index={3}
        label="平均完成周期"
        value={cycleDays}
        unit="天"
        hint={`累计完成 ${metrics.done}`}
        accent="default"
      />
    </div>
  )
}

export { StatBar }
