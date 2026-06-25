import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { CommentDeleteAction } from "@/components/comment-delete-action";
import { StatusBadge } from "@/components/status-badge";
import { getAdminComments } from "@/lib/api";
import type { AdminComment } from "@/types";

export function CommentsPage() {
  const [items, setItems] = useState<AdminComment[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const payload = await getAdminComments({ q: query.trim() || undefined, pageSize: 30 });
      setItems(payload.items);
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
          <CardTitle>评论管理</CardTitle>
          <CardDescription>快速检索并删除不合适的评论内容。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索评论内容、项目标题或作者" />
            <button className="rounded-md bg-foreground px-5 text-sm font-semibold text-background" onClick={() => void load()}>
              搜索
            </button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.authorName ?? item.authorUsername ?? "匿名用户"}</p>
                      <StatusBadge tone={item.status === "published" ? "success" : "danger"}>{item.status}</StatusBadge>
                    </div>
                    <p className="text-sm leading-7 text-foreground">{item.content}</p>
                    <p className="text-sm text-muted-foreground">
                      所属项目：{item.projectTitle} · {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <CommentDeleteAction commentId={item.id} onDeleted={() => void load()} />
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-muted-foreground">暂无评论数据。</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
