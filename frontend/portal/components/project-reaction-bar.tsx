"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clientAuthFetch } from "@/lib/client-auth-fetch";
import { cn } from "@/lib/utils";
import type { ProjectReactionResponse } from "@/types";

type ProjectReactionBarProps = {
  projectId: string;
  initialUpvoteCount: number;
  initialDownvoteCount: number;
  initialReaction: "up" | "down" | null;
  isAuthenticated: boolean;
  compact?: boolean;
};

export function ProjectReactionBar({
  projectId,
  initialUpvoteCount,
  initialDownvoteCount,
  initialReaction,
  isAuthenticated,
  compact = false,
}: ProjectReactionBarProps) {
  const [pending, setPending] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(initialUpvoteCount);
  const [downvoteCount, setDownvoteCount] = useState(initialDownvoteCount);
  const [currentReaction, setCurrentReaction] = useState<"up" | "down" | null>(initialReaction);
  const [error, setError] = useState("");

  async function submitReaction(reaction: "up" | "down") {
    if (pending) {
      return;
    }

    setError("");
    setPending(true);
    try {
      const response = await clientAuthFetch(`/projects/${projectId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction }),
      });

      const payload = (await response.json().catch(() => null)) as
        | (ProjectReactionResponse & { message?: string })
        | { message?: string }
        | null;

      if (
        !response.ok ||
        !payload ||
        !("upvoteCount" in payload) ||
        !("downvoteCount" in payload) ||
        !("currentReaction" in payload)
      ) {
        throw new Error(payload?.message ?? "操作失败。");
      }

      setUpvoteCount(payload.upvoteCount);
      setDownvoteCount(payload.downvoteCount);
      setCurrentReaction(payload.currentReaction);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "操作失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn(compact ? "contents" : "space-y-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={currentReaction === "up" ? "default" : "outline"}
          size={compact ? "sm" : "default"}
          disabled={pending || !isAuthenticated}
          onClick={() => submitReaction("up")}
          className={cn("rounded-sm h-7", currentReaction === "up" ? "" : "bg-background/80")}
        >
          <ThumbsUp className="size-4" />
          <span className="font-mono">{upvoteCount}</span>
        </Button>
        <Button
          variant={currentReaction === "down" ? "default" : "outline"}
          size={compact ? "sm" : "default"}
          disabled={pending || !isAuthenticated}
          onClick={() => submitReaction("down")}
          className={cn("rounded-sm h-7", currentReaction === "down" ? "" : "bg-background/80")}
        >
          <ThumbsDown className="size-4" />
          <span className="font-mono">{downvoteCount}</span>
        </Button>
        {!isAuthenticated && !compact ? <p className="text-sm text-muted-foreground">登录后可以点赞或点踩。</p> : null}
      </div>
      {error ? <p className={cn("text-sm text-destructive", compact && "w-full")}>{error}</p> : null}
    </div>
  );
}
