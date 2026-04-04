import {
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
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
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

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar">
      {/* Workspace header */}
      <div className="flex h-12 items-center gap-2 px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-background">
          <FileText className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 truncate text-sm font-semibold text-sidebar-foreground">
          Vi-Notes
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={toggleTheme}
        >
          {theme === "light" ? (
            <Moon className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="flex flex-col gap-0.5">
          <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {isAdmin ? "Admin" : "Workspace"}
          </p>

          {isAdmin ? (
            <>
              <NavItem
                icon={<LayoutDashboard />}
                label="All Sessions"
                active={activeView === "sessions"}
                onClick={() => onNavigate("sessions")}
              />
              <NavItem
                icon={<Users />}
                label="User Reports"
                active={activeView === "reports"}
                onClick={() => onNavigate("reports")}
              />
            </>
          ) : (
            <>
              <NavItem
                icon={<PenLine />}
                label="Write"
                active={activeView === "write"}
                onClick={() => onNavigate("write")}
              />
              <NavItem
                icon={<LayoutDashboard />}
                label="Sessions"
                active={isSessionsActive}
                onClick={() => onNavigate("sessions")}
              />
            </>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* User section */}
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-muted text-[10px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {user?.role ?? "writer"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
