import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { ProjectStatusActions } from "@/components/project-status-actions";
import { StatusBadge } from "@/components/status-badge";
import { getAdminProjects } from "@/lib/api";
import type { AdminProject } from "@/types";

export function ProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const payload = await getAdminProjects({ q: query.trim() || undefined, status: status || undefined, pageSize: 30 });
      setProjects(payload.items);
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
          <CardTitle>项目管理</CardTitle>
          <CardDescription>管理项目状态，查看哪些项目属于官方收录。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目标题或作者" />
            <Input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="published / hidden / deleted" />
            <button className="rounded-md bg-foreground px-5 text-sm font-semibold text-background" onClick={() => void load()}>
              筛选
            </button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black">{project.title}</p>
                      <StatusBadge tone={project.status === "published" ? "success" : project.status === "hidden" ? "warning" : "danger"}>
                        {project.status}
                      </StatusBadge>
                      {project.isOfficial ? (
                        <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 px-3 py-1 font-mono text-[11px] font-semibold text-amber-700">
                          官方收录
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      作者：@{project.authorUsername ?? "no-username"} · {project.viewCount} 次浏览 · {project.commentCount} 条评论
                    </p>
                  </div>
                  <ProjectStatusActions project={project} onUpdated={() => void load()} />
                </div>
              </div>
            ))}
            {projects.length === 0 ? <p className="text-sm text-muted-foreground">暂无项目数据。</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
