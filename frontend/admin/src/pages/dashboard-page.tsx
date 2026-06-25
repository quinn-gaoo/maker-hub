import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Inbox, MessageSquareText, Users } from "lucide-react";

import { getAdminDashboard } from "@/lib/api";
import type { AdminDashboardStats } from "@/types";

const metrics = [
  { key: "totalUsers", label: "用户总数", icon: Users },
  { key: "publishedProjects", label: "公开项目", icon: FolderKanban },
  { key: "totalComments", label: "评论总数", icon: MessageSquareText },
  { key: "pendingFeedback", label: "待处理反馈", icon: Inbox },
] as const;

export function DashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getAdminDashboard()
      .then(setStats)
      .catch((submissionError) => {
        setError(submissionError instanceof Error ? submissionError.message : "加载失败。");
      });
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-900/80 bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f2937_100%)] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] md:p-10">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-200">Overview</p>
        <h1 className="font-heading text-4xl font-black tracking-[-0.08em] md:text-5xl">后台总览</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-white/72">快速查看社区当前状态，包括用户、项目、评论与反馈处理情况。</p>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <Card key={item.key} className="rounded-[1.5rem]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm font-medium">{item.label}</span>
                <item.icon className="size-4" />
              </div>
              <p className="mt-4 font-mono text-4xl font-black tracking-[-0.05em]">
                {stats ? stats[item.key] : "--"}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>用户状态</CardTitle>
            <CardDescription>活跃、封禁和管理员数量。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>活跃用户：{stats?.activeUsers ?? "--"}</p>
            <p>封禁用户：{stats?.bannedUsers ?? "--"}</p>
            <p>管理员：{stats?.adminUsers ?? "--"}</p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>内容状态</CardTitle>
            <CardDescription>项目可见性与反馈处理情况。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>已发布项目：{stats?.publishedProjects ?? "--"}</p>
            <p>已隐藏项目：{stats?.hiddenProjects ?? "--"}</p>
            <p>待处理反馈：{stats?.pendingFeedback ?? "--"}</p>
            <p>已解决反馈：{stats?.resolvedFeedback ?? "--"}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
