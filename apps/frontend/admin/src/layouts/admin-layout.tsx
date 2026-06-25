import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FolderKanban, FolderPlus, Inbox, LayoutDashboard, LogOut, MessageSquareText, ShieldCheck, Users } from "lucide-react";
import { Button } from "@makerhub/ui";

import { useAuth } from "@/contexts/auth-context";
import { cn } from "@makerhub/ui";

const navItems = [
  { to: "/", label: "总览", icon: LayoutDashboard },
  { to: "/users", label: "用户", icon: Users },
  { to: "/projects", label: "项目", icon: FolderKanban },
  { to: "/projects/official/new", label: "官方收录", icon: FolderPlus },
  { to: "/comments", label: "评论", icon: MessageSquareText },
  { to: "/feedback", label: "反馈", icon: Inbox },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 font-heading text-lg font-black tracking-[-0.05em]">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <ShieldCheck className="size-5" />
              </span>
              MakerHub Admin
            </Link>
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/8 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{session?.user?.name ?? session?.user?.email ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="size-4" />
              退出
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
