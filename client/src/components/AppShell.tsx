import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type AppUser = { name: string; email: string; role: "user" | "admin" | "owner"; address: string };

const roleLabels = { admin: "System Administrator", user: "Normal User", owner: "Store Owner" } as const;

export function AppShell({ user, children }: { user: AppUser; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/login");
    },
  });
  const links = user.role === "admin"
    ? [{ href: "/admin", label: "Overview", icon: "▦" }, { href: "/admin/stores", label: "Stores", icon: "⌂" }, { href: "/admin/users", label: "People", icon: "◉" }]
    : user.role === "owner"
      ? [{ href: "/owner", label: "Owner dashboard", icon: "◒" }]
      : [{ href: "/stores", label: "Browse stores", icon: "⌂" }];

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href={user.role === "admin" ? "/admin" : user.role === "owner" ? "/owner" : "/stores"} className="brand-lockup">
          <span className="brand-mark">S</span>
          <span><strong>StoreMate</strong><small>ratings platform</small></span>
        </Link>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="side-nav" aria-label="Primary navigation">
          {links.map(link => <Link key={link.href} href={link.href} className={`side-link ${location === link.href ? "active" : ""}`}><span className="side-icon">{link.icon}</span>{link.label}</Link>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note"><span className="status-dot" />Live workspace<br /><small>Ratings stay useful when they stay current.</small></div>
          <button className="side-link side-button" onClick={() => logout.mutate()} disabled={logout.isPending}><span className="side-icon">↪</span>{logout.isPending ? "Signing out…" : "Sign out"}</button>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">S</span><strong>StoreMate</strong></div>
          <div className="topbar-spacer" />
          <Link href="/change-password" className="account-chip" title="Change password">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="account-copy"><strong>{user.name.split(" ")[0]}</strong><small>{roleLabels[user.role]}</small></span>
            <span className="chevron">⌄</span>
          </Link>
        </header>
        <section className="content-wrap">{children}</section>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow ?? "StoreMate workspace"}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="header-action">{action}</div>}</div>;
}

export function StatCard({ label, value, detail, tone = "ink" }: { label: string; value: string | number; detail: string; tone?: "ink" | "amber" | "blue" }) {
  return <div className={`stat-card tone-${tone}`}><div className="stat-label">{label}<span className="stat-spark">↗</span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}

export function LoadingState({ label = "Loading workspace…" }: { label?: string }) { return <div className="loading-state"><span className="spinner" />{label}</div>; }
export function EmptyState({ title, message }: { title: string; message: string }) { return <div className="empty-state"><span className="empty-icon">⌁</span><strong>{title}</strong><p>{message}</p></div>; }
export function ErrorState({ message = "Something went wrong. Please try again." }: { message?: string }) { return <div className="error-state">{message}</div>; }
export function SortButton({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <button className={`sort-button ${active ? "active" : ""}`} onClick={onClick}>{label} {active ? (direction === "asc" ? "↑" : "↓") : "↕"}</button>; }
export function RatingDisplay({ value }: { value: number | string | null | undefined }) { const n = Number(value ?? 0); return <span className="rating-display"><span className="rating-stars">{"★".repeat(Math.round(n))}{"☆".repeat(5 - Math.round(n))}</span><strong>{n ? n.toFixed(1) : "—"}</strong></span>; }
