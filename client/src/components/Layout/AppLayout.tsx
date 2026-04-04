import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-12 items-center border-b bg-background/95 px-3 backdrop-blur md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-semibold">Vi-Notes</span>
        </div>
        {children}
      </main>
    </div>
  );
}
