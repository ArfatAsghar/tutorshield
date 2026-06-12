import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, ClipboardCheck, MapPin, FileText, MessageSquare, CreditCard, Star, LogOut, GraduationCap, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import type { ReactNode } from "react";

const parentNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tutors", label: "Find Tutors", icon: Users },
  { to: "/progress", label: "Progress", icon: FileText },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

const tutorNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/verification", label: "Verification", icon: ClipboardCheck },
  { to: "/attendance", label: "Attendance", icon: MapPin },
  { to: "/progress", label: "Reports", icon: FileText },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/payments", label: "Earnings", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = user?.role === "tutor" ? tutorNav : parentNav;

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card relative">
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
        <Link to="/dashboard" className="flex items-center px-6 h-16 border-b border-border group">
          <Logo />
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 group ${
                  active ? "bg-primary text-primary-foreground shadow-emerald" : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5"
                }`}
              >
                {active && <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-gold" />}
                <Icon className={`w-4 h-4 transition-transform ${active ? "" : "group-hover:scale-110"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-trust ring-2 ring-gold/30 flex items-center justify-center text-primary-foreground font-display font-semibold shadow-emerald overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate capitalize">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                {user?.role === "tutor" ? <GraduationCap className="w-3 h-3 text-gold" /> : null}
                {user?.role}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={async () => { await logout(); navigate({ to: "/" }); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button size="sm" variant="ghost" onClick={async () => { await logout(); navigate({ to: "/" }); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="md:hidden border-b border-border bg-card overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link key={item.to} to={item.to}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) {
    navigate({ to: "/auth" });
    return null;
  }
  return <AppShell>{children}</AppShell>;
}
