import Topbar from '../components/Topbar';
import { useTheme } from '../hooks';

export default function DashboardLayout({ children, alertCount, activeNode, setActiveNode }) {
  const { dark, toggle } = useTheme();

  return (
    <div className="flex flex-col h-screen overflow-hidden transition-colors" style={{ background: 'var(--color-page-bg)' }}>
      {/* Topbar spans full width */}
      <Topbar alertCount={alertCount} dark={dark} onToggleDark={toggle} activeNode={activeNode} setActiveNode={setActiveNode} />

      {/* Below topbar: main content */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
