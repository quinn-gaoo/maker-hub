"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectActionsProps = {
  projectId: string;
};

export function ProjectActions({ projectId }: ProjectActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/bff/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "删除失败。");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Link
          href={`/me/projects/${projectId}/edit`}
          className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-md bg-background/70 text-base")}
        >
          <Pencil />
          编辑项目
        </Link>
        <Button variant="outline" disabled={pending} onClick={handleDelete} className="h-12 rounded-md bg-background/70 px-5 text-base">
          <Trash2 />
          删除
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
