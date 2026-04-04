import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  PenLine,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  const iconOnly = label.trim().length === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        iconOnly ? "justify-center" : "gap-2.5",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function Sidebar({
  activeView,
  onNavigate,
  onLogout,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "VN";

  const isSessionsActive =
    activeView === "sessions" || activeView === "sessionDetail";

  const handleNavigate = (view: string) => {
    onNavigate(view);
    onCloseMobile();
  };

  const handleLogout = () => {
    onCloseMobile();
    onLogout();
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r bg-sidebar transition-all duration-300 md:sticky md:top-0 md:z-20",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Workspace header */}
        <div
          className={cn(
            "flex h-14 items-center gap-2 px-3",
            collapsed ? "justify-center px-2" : "",
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-foreground text-background">
            <FileText className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="flex-1 truncate text-sm font-semibold text-sidebar-foreground">
              Vi-Notes
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0 text-muted-foreground",
              collapsed ? "hidden md:inline-flex" : "",
            )}
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </Button>

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground md:hidden"
              onClick={onCloseMobile}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden h-7 w-7 shrink-0 text-muted-foreground md:inline-flex",
              collapsed ? "ml-0" : "ml-1",
            )}
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea
          className={cn("flex-1 py-2", collapsed ? "px-1.5" : "px-2")}
        >
          <div className="flex flex-col gap-0.5">
            {!collapsed && (
              <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {isAdmin ? "Admin" : "Workspace"}
              </p>
            )}

            {isAdmin ? (
              <>
                <NavItem
                  icon={<LayoutDashboard />}
                  label={collapsed ? "" : "All Sessions"}
                  active={activeView === "sessions"}
                  onClick={() => handleNavigate("sessions")}
                />
                <NavItem
                  icon={<Users />}
                  label={collapsed ? "" : "User Reports"}
                  active={activeView === "reports"}
                  onClick={() => handleNavigate("reports")}
                />
              </>
            ) : (
              <>
                <NavItem
                  icon={<PenLine />}
                  label={collapsed ? "" : "Write"}
                  active={activeView === "write"}
                  onClick={() => handleNavigate("write")}
                />
                <NavItem
                  icon={<LayoutDashboard />}
                  label={collapsed ? "" : "Sessions"}
                  active={isSessionsActive}
                  onClick={() => handleNavigate("sessions")}
                />
              </>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* User section */}
        <div className={cn("px-2 py-2", collapsed ? "px-1.5" : "")}>
          <div
            className={cn(
              "flex items-center rounded-md px-2 py-1.5",
              collapsed ? "justify-center px-1.5" : "gap-2",
            )}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-muted text-[10px] font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 truncate">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {user?.name ?? "User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {user?.role ?? "writer"}
                  </p>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
