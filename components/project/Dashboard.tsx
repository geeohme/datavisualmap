'use client'
import type { ProjectStats } from '@/lib/db/stats'

const ROWS: { key: keyof ProjectStats; label: string; color: string }[] = [
  { key: 'total', label: 'Total', color: 'text-neutral-900' },
  { key: 'unmapped', label: 'Unmapped', color: 'text-neutral-500' },
  { key: 'mapped', label: 'Mapped', color: 'text-blue-600' },
  { key: 'confirmed', label: 'Confirmed', color: 'text-emerald-600' },
  { key: 'in_review', label: 'In review', color: 'text-amber-600' },
  { key: 'not_needed', label: 'Not needed', color: 'text-neutral-400' },
  { key: 'blocked', label: 'Blocked', color: 'text-red-600' },
]

export function Dashboard({ stats }: { stats: ProjectStats }) {
  return (
    <div className="border-y bg-neutral-50 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Status</div>
      <ul className="space-y-1 text-sm">
        {ROWS.map(r => (
          <li key={r.key} className="flex justify-between">
            <span className={r.color}>{r.label}</span>
            <span className="tabular-nums text-neutral-700">{stats[r.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
