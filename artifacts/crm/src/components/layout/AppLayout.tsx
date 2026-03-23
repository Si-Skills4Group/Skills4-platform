import { Link, useRoute, useLocation } from "wouter";
import {
  LayoutDashboard,
  Building2,
  Users,
  Handshake,
  CheckSquare,
  Settings,
  Search,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Organisations", href: "/organisations", icon: Building2 },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Engagements", href: "/engagements", icon: Handshake },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  crm_manager: "CRM Manager",
  engagement_user: "Engagement User",
  read_only: "Read Only",
};

const ROLE_COLOURS: Record<string, string> = {
  admin: "bg-rose-500/20 text-rose-300",
  crm_manager: "bg-blue-500/20 text-blue-300",
  engagement_user: "bg-emerald-500/20 text-emerald-300",
  read_only: "bg-slate-500/20 text-slate-300",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 size={18} strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">EngageCRM</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navigation.map((item) => {
            const [isActive] = useRoute(item.href);
            const match = item.href === "/" ? isActive : window.location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group relative",
                  match
                    ? "bg-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-white"
                )}
              >
                {match && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
                )}
                <item.icon
                  size={20}
                  className={cn(
                    "transition-colors",
                    match ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-white"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* User panel */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center font-bold text-xs text-primary-foreground flex-shrink-0">
              {user ? initials(user.fullName) : "?"}
            </div>
            <div className="text-sm min-w-0 flex-1">
              <p className="font-medium text-white leading-none truncate">
                {user?.fullName ?? "Unknown"}
              </p>
              {user && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs mt-1.5 px-1.5 py-0.5 rounded font-medium",
                    ROLE_COLOURS[user.role] ?? "bg-slate-500/20 text-slate-300"
                  )}
                >
                  <Shield size={10} />
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-border transition-all flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex-shrink-0 border-b bg-white flex items-center justify-between px-6 z-10 shadow-sm shadow-black/5">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search across CRM..."
                className="w-full pl-9 pr-4 py-2 bg-muted/50 border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-full text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{user.fullName}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    ROLE_COLOURS[user.role]?.replace("text-", "text-") ?? ""
                  )}
                  style={{ backgroundColor: "transparent" }}
                >
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8 relative">
          <div className="max-w-7xl mx-auto h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
