// StatCard — KPI Metric Card
// Used in the floating KPIStrip at the bottom of the map
// Props: icon (Lucide component), label (string), value (string|number), trend (string), trendUp (bool)

export default function StatCard({ icon: Icon, label, value, trend, trendUp, iconColor = 'text-slate-400' }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-slate-100 p-4 min-w-[140px]">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-1.5 rounded-lg bg-slate-50 ${iconColor}`}>
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        {trend && (
          <span className={`text-[10px] font-medium ${trendUp ? 'text-red-500' : 'text-green-600'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
    </div>
  );
}
