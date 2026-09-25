// DashboardLayout — the permanent page frame
// Topbar (full width, 56px) + Sidebar (72px left) + {children} fills rest

import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout({ children, alertCount }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Topbar spans full width */}
      <Topbar alertCount={alertCount} />

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
