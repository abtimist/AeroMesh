import { useTheme } from '../hooks';

export default function AQILegend({ isVisible }) {
  const { dark } = useTheme();

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-6 right-6 z-[500] pointer-events-none transition-all duration-300">
      <div 
        className="rounded-2xl p-3 flex flex-col gap-2 backdrop-blur-xl shadow-2xl border pointer-events-auto"
        style={{
          background: dark ? 'rgba(15, 15, 20, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: dark ? '#cbd5e1' : '#64748b' }}>
          Air Quality Index
        </div>
        
        <div className="flex w-full h-2 rounded-full overflow-hidden my-1">
          <div className="flex-1 bg-[#10b981]"></div>
          <div className="flex-1 bg-[#f59e0b]"></div>
          <div className="flex-1 bg-[#ef4444]"></div>
          <div className="flex-1 bg-[#b91c1c]"></div>
          <div className="flex-1 bg-[#7f1d1d]"></div>
        </div>
        
        <div className="flex justify-between text-[10px] font-medium px-1" style={{ color: dark ? '#94a3b8' : '#94a3b8' }}>
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
          <span>300+</span>
        </div>
      </div>
    </div>
  );
}
