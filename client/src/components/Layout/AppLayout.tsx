import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export default function AppLayout({
  activeView,
  onNavigate,
  onLogout,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
