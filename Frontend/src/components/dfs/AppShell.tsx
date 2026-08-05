// Layout of the dashboard after login
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  Files,
  Upload,
  DownloadCloud,
  HardDrive,
  Settings,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDfs } from "@/lib/core/store";
import { Logo } from "./Logo";
import { StorageMeter } from "./StorageMeter";
import { UploadPanel } from "./UploadPanel";
import { initials } from "@/lib/core/format";
import { useState } from "react";

const NAV = [
  { label: "My Files", to: "/dashboard", icon: Files },
  { label: "Downloads", to: "/dashboard/downloads", icon: DownloadCloud },
  { label: "Storage", to: "/dashboard/storage", icon: HardDrive },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
];

export function AppShell({ title, actions, children }: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, authReady, signOut, storage, setUploadOpen } = useDfs();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (authReady && !user) void navigate({ to: "/signin" });
  }, [authReady, user, navigate]);

  if (!authReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-[12px] text-faint">Restoring session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full" style={{ background: "#05060f" }}>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[64px]" : "w-[260px]",
        )}
        style={{
          background: "rgba(5,6,15,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRightColor: "rgba(186,215,247,0.08)",
        }}
      >
        <div className="flex h-[68px] items-center justify-between px-3">
          <Link to="/" className={cn("px-1 text-foreground", collapsed && "hidden")}>
            <Logo />
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-200 hover:bg-hover hover:text-foreground"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 px-3">
          <button
            onClick={() => setUploadOpen(true)}
            className="flex h-10 items-center gap-3 rounded-md px-3 text-[15px] text-muted-foreground transition-colors duration-200 hover:bg-hover hover:text-foreground"
          >
            <Upload className="size-4 shrink-0" />
            {!collapsed && <span>Upload</span>}
          </button>

          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-[15px] transition-colors duration-200",
                  active
                    ? "border-l-2 border-accent bg-hover font-medium text-foreground"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 border-t border-border p-3">
          {!collapsed && storage && (
            <StorageMeter usedBytes={storage.usedBytes} quotaBytes={storage.quotaBytes} compact />
          )}
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-[12px]">
              {initials(user.name)}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px]">{user.name}</p>
                <button
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-1 text-[13px] text-faint transition-colors duration-200 hover:text-foreground"
                >
                  <LogOut className="size-3" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col relative z-0">
        <header
          className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-4 border-b border-border px-6"
          style={{
            background: "rgba(5,6,15,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottomColor: "rgba(186,215,247,0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <Link to="/" className="text-foreground md:hidden">
              <Logo mark={false} />
            </Link>
            <h1 className="text-[20px] font-medium tracking-[-0.01em]">{title}</h1>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>

        <nav
          className="sticky bottom-0 flex items-center justify-around border-t border-border md:hidden"
          style={{
            background: "rgba(5,6,15,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTopColor: "rgba(186,215,247,0.08)",
          }}
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                pathname === item.to ? "text-foreground" : "text-faint",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <UploadPanel />
    </div>
  );
}
