export default function StatCard({ icon: Icon, label, value, trend, trendUp, iconColor = 'text-slate-400' }) {
  return (
    <div
      className="rounded-xl shadow-lg p-3 min-w-[150px] transition-colors backdrop-blur-md bg-white/90 dark:bg-[#131920]/90"
      style={{
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={`p-1.5 rounded-lg ${iconColor}`}
          style={{ background: 'var(--color-surface-hover)' }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        {trend && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trendUp ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p className="text-2xl font-black leading-none tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
    </div>
  );
}
