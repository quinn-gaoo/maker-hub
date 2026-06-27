"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_FEEDBACK_LENGTH = 500;

type FeedbackResponse = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  message?: string;
};

export function FeedbackForm() {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (pending) {
      return;
    }

    setError("");
    setSuccess("");

    const trimmed = content.trim();
    if (!trimmed) {
      setError("反馈内容不能为空。");
      return;
    }

    if (trimmed.length > MAX_FEEDBACK_LENGTH) {
      setError(`反馈最多 ${MAX_FEEDBACK_LENGTH} 字。`);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/bff/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });
      const payload = (await response.json().catch(() => null)) as FeedbackResponse | null;

      if (!response.ok || !payload?.id) {
        setError(payload?.message ?? "反馈提交失败。");
        return;
      }

      setContent("");
      setSuccess("已收到，感谢你的反馈。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={"说说你的想法...\n\n比如：\n· 遇到了什么 Bug?\n· 希望增加什么功能?\n· 哪里用起来不顺手?"}
        maxLength={MAX_FEEDBACK_LENGTH}
        className="min-h-60 resize-none rounded-xl bg-background/70 px-7 py-6 text-xl leading-8 placeholder:text-muted-foreground/80"
      />
      <div className="space-y-10">
        <span className="block font-mono text-base font-medium text-muted-foreground">
          {content.length}/{MAX_FEEDBACK_LENGTH}
        </span>
        <Button disabled={pending} onClick={handleSubmit} className="h-16 w-full rounded-md bg-[#f7b89f] text-lg font-bold text-white hover:bg-[#f4a789]">
          <Send />
          提交反馈
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
    </div>
  );
}
