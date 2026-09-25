import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../hooks';

export default function DashboardLayout({ children, alertCount }) {
  const { dark, toggle } = useTheme();

  return (
    <div className="flex flex-col h-screen overflow-hidden transition-colors" style={{ background: 'var(--color-page-bg)' }}>
      {/* Topbar spans full width */}
      <Topbar alertCount={alertCount} dark={dark} onToggleDark={toggle} />

      {/* Below topbar: sidebar + main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
