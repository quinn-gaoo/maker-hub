"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Textarea } from "@/components/ui/textarea";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import type { CommentItem } from "@/types";

type CommentSectionProps = {
  projectId: string;
  comments: CommentItem[];
  canComment: boolean;
  currentUserId?: string;
  currentUserName?: string | null;
  currentUserAvatarUrl?: string | null;
};

export function CommentSection({
  projectId,
  comments,
  canComment,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
}: CommentSectionProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleSubmit() {
    setError("");

    const trimmed = content.trim();
    if (!trimmed) {
      setError("评论内容不能为空。");
      return;
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setError(`评论最多 ${MAX_COMMENT_LENGTH} 字。`);
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/bff/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId, content: trimmed }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "评论发送失败。");
        return;
      }

      setContent("");
      router.refresh();
    });
  }

  async function handleDelete(commentId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/bff/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "删除评论失败。");
        return;
      }

      router.refresh();
    });
  }

  function getDisplayName(comment: CommentItem) {
    return comment.author.name ?? comment.author.username ?? "Creator";
  }

  function getInitial(comment: CommentItem) {
    return getDisplayName(comment).slice(0, 1).toUpperCase();
  }

  const currentDisplayName = currentUserName || "Creator";
  const currentInitial = currentDisplayName.slice(0, 1).toUpperCase();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-2xl font-black tracking-[-0.05em]">评论</h2>
        <span className="text-sm font-semibold text-muted-foreground">{comments.length}</span>
      </div>

      {canComment ? (
        <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-accent text-sm font-bold text-foreground">
              {currentUserAvatarUrl ? (
                <img src={currentUserAvatarUrl} alt={currentDisplayName} className="h-full w-full object-cover" />
              ) : (
                currentInitial
              )}
            </span>
            <span className="font-semibold">{currentDisplayName}</span>
          </div>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="写下你的想法..."
            maxLength={MAX_COMMENT_LENGTH}
            className="min-h-28 resize-none rounded-lg bg-background/70 text-base"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-mono text-sm font-medium text-muted-foreground">
              {content.length}/{MAX_COMMENT_LENGTH}
            </span>
            <Button disabled={pending} onClick={handleSubmit} className="rounded-md px-5">
              <Send />
              发表评论
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">登录后即可发表评论。</p>
          <Link href="/login" className={buttonVariants()}>
            <LogIn />
            去登录
          </Link>
        </div>
      )}
      <div className="space-y-4">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-sm font-bold text-foreground">
                {comment.author.avatarUrl ? (
                  <img src={comment.author.avatarUrl} alt={getDisplayName(comment)} className="h-full w-full object-cover" />
                ) : (
                  getInitial(comment)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black">{getDisplayName(comment)}</span>
                  <span className="font-mono text-sm font-medium text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-foreground">{comment.content}</p>
                {currentUserId === comment.author.id ? (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => handleDelete(comment.id)} className="mt-3">
                    <Trash2 />
                    删除
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {comments.length === 0 ? <p className="text-sm text-muted-foreground">还没有评论，来成为第一个留言的人吧。</p> : null}
      </div>
    </section>
  );
}
