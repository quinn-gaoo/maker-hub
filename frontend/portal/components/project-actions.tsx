"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { clientAuthFetch } from "@/lib/client-auth-fetch";
import { cn } from "@/lib/utils";

type ProjectActionsProps = {
  projectId: string;
};

export function ProjectActions({ projectId }: ProjectActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (pending) {
      return;
    }

    setError("");
    setPending(true);
    try {
      const response = await clientAuthFetch(`/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "删除失败。");
        return;
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/me/projects/${projectId}/edit`}
          className={cn(buttonVariants({ variant: "outline" }),
            "h-11 rounded-md bg-background/70 text-base"
          )
          }
        >
          <Pencil />
          编辑
        </Link>
        <Button variant="outline" disabled={pending} onClick={handleDelete}
          className="h-11 rounded-md bg-background/70 px-5 text-base"
        >
          <Trash2 />
          删除
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
