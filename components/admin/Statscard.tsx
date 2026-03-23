import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  change: string
  isPositive: boolean
  icon: LucideIcon
  accent?: string
}

export function StatsCard({ title, value, change, isPositive, icon: Icon, accent }: StatsCardProps) {
  return (
    <div
      className="group p-8 rounded-2xl border transition-all hover:shadow-lg"
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-1">
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: 'var(--text-soft)', fontWeight: '400', letterSpacing: '0.12em' }}
          >
            {title}
          </p>
          <h2
            className="tracking-tight transition-all group-hover:scale-105 origin-left"
            style={{
              color: 'var(--text-dark)',
              fontSize: '3rem',
              fontWeight: '300',
              lineHeight: '1',
              letterSpacing: '-0.03em',
            }}
          >
            {value}
          </h2>
        </div>

        <div
          className="p-3 rounded-xl transition-all group-hover:scale-110 border"
          style={{
            backgroundColor: accent || 'rgba(244, 132, 95, 0.12)',
            borderColor: 'rgba(166, 145, 141, 0.1)',
          }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--text-dark)', strokeWidth: 1.5 }} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{
            backgroundColor: isPositive ? 'rgba(45, 156, 156, 0.1)' : 'rgba(138, 154, 166, 0.1)',
            borderColor: isPositive ? 'rgba(45, 156, 156, 0.3)' : 'rgba(138, 154, 166, 0.3)',
            color: 'var(--text-dark)',
            fontWeight: '400',
          }}
        >
          {change}
        </span>
        <span className="text-xs tracking-wide" style={{ color: 'var(--text-soft)', fontWeight: '400' }}>
          from last month
        </span>
      </div>
    </div>
  )
}