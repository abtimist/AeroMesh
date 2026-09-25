export default function StatCard({ icon: Icon, label, value, trend, trendUp, iconColor = 'text-slate-400' }) {
  return (
    <div
      className="rounded-xl shadow-md p-4 min-w-[140px] transition-colors"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-1.5 rounded-lg ${iconColor}`}
          style={{ background: 'var(--color-surface-hover)' }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        {trend && (
          <span className={`text-[10px] font-medium ${trendUp ? 'text-red-500' : 'text-green-600'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-medium uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
    </div>
  );
}
