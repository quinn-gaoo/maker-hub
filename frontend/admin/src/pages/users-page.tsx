import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { StatusBadge } from "@/components/status-badge";
import { UserAdminActions } from "@/components/user-admin-actions";
import { useAuth } from "@/contexts/auth-context";
import { getAdminUsers } from "@/lib/api";
import type { AdminUser } from "@/types";

export function UsersPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const payload = await getAdminUsers({ q: query.trim() || undefined, pageSize: 30 });
      setUsers(payload.items);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "加载失败。");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>用户管理</CardTitle>
          <CardDescription>管理用户状态和管理员权限。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索昵称、邮箱、用户名" />
            <button className="rounded-md bg-foreground px-5 text-sm font-semibold text-background" onClick={() => void load()}>
              搜索
            </button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black">{user.name ?? user.username ?? user.email ?? user.id}</p>
                      <StatusBadge tone={user.status === "active" ? "success" : "danger"}>{user.status}</StatusBadge>
                      <StatusBadge tone={user.role === "admin" ? "warning" : "neutral"}>{user.role}</StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{user.username ?? "no-username"} · {user.email ?? "no-email"} · {user.projectCount} 个项目 · {user.commentCount} 条评论
                    </p>
                  </div>
                  <UserAdminActions user={user} onUpdated={() => void load()} disabled={session?.user?.id === user.id} />
                </div>
              </div>
            ))}
            {users.length === 0 ? <p className="text-sm text-muted-foreground">暂无用户数据。</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
