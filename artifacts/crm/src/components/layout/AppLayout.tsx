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
  Target,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Organisations", href: "/organisations", icon: Building2 },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Engagements", href: "/engagements", icon: Handshake },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "SDR Dashboard", href: "/sdr-dashboard", icon: BarChart2 },
  { name: "SDR Queue", href: "/sdr", icon: Target },
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

  const activePage = navigation.find((item) => {
    if (item.href === "/") return window.location.pathname === "/";
    return window.location.pathname.startsWith(item.href);
  });

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col hidden md:flex border-r border-sidebar-border/50">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-lg shadow-sidebar-primary/30 flex-shrink-0">
              <Building2 size={15} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">Skills4CRM</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest px-3 mb-2">Menu</p>
          {navigation.map((item) => {
            const [isActive] = useRoute(item.href);
            const match = item.href === "/" ? isActive : window.location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                  match
                    ? "bg-white/10 text-white"
                    : "text-sidebar-foreground/60 hover:bg-white/6 hover:text-white"
                )}
              >
                {match && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
                )}
                <item.icon
                  size={17}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    match ? "text-sidebar-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User panel */}
        <div className="p-3 border-t border-sidebar-border/60">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary/40 flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0">
              {user ? initials(user.fullName) : "?"}
            </div>
            <div className="text-sm min-w-0 flex-1">
              <p className="font-medium text-white text-[13px] leading-none truncate">
                {user?.fullName ?? "Unknown"}
              </p>
              {user && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] mt-1 px-1.5 py-0.5 rounded font-medium",
                    ROLE_COLOURS[user.role] ?? "bg-slate-500/20 text-slate-300"
                  )}
                >
                  <Shield size={9} />
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-6 h-6 flex items-center justify-center rounded-md text-sidebar-foreground/30 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex-shrink-0 border-b bg-white flex items-center justify-between px-6 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4 flex-1">
            {activePage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <activePage.icon size={15} className="text-muted-foreground/70" />
                <span className="font-semibold text-foreground">{activePage.name}</span>
              </div>
            )}
            <div className="relative w-full max-w-xs hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Quick search…"
                className="w-full pl-8 pr-4 py-1.5 bg-muted/60 border border-transparent focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 rounded-lg text-sm transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[11px] text-primary">
                  {initials(user.fullName)}
                </div>
                <span className="font-medium text-foreground text-[13px]">{user.fullName}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all ml-1"
            >
              <LogOut size={13} />
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
