import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@makerhub/ui";

import { FeedbackStatusActions } from "@/components/feedback-status-actions";
import { StatusBadge } from "@/components/status-badge";
import { getAdminFeedback } from "@/lib/api";
import type { AdminFeedback } from "@/types";

export function FeedbackPage() {
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const payload = await getAdminFeedback({ status: status || undefined, pageSize: 30 });
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
          <CardTitle>反馈管理</CardTitle>
          <CardDescription>处理来自前台用户的反馈内容。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="new / reviewed / resolved" />
            <button className="rounded-md bg-foreground px-5 text-sm font-semibold text-background" onClick={() => void load()}>
              筛选
            </button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge tone={item.status === "resolved" ? "success" : item.status === "reviewed" ? "warning" : "neutral"}>
                      {item.status}
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                  </div>
                  <p className="text-sm leading-7 text-foreground">{item.content}</p>
                  <FeedbackStatusActions feedback={item} onUpdated={() => void load()} />
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-muted-foreground">暂无反馈数据。</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
