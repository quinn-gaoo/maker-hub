import { useState } from "react";
import { Button } from "@makerhub/ui";

import { updateAdminProject } from "@/lib/api";
import type { AdminProject } from "@/types";

type ProjectStatusActionsProps = {
  project: AdminProject;
  onUpdated: () => void;
};

const OPTIONS: AdminProject["status"][] = ["published", "hidden", "deleted"];

export function ProjectStatusActions({ project, onUpdated }: ProjectStatusActionsProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant="outline"
            disabled={pending || project.status === status}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                await updateAdminProject(project.id, { status });
                onUpdated();
              } catch (submissionError) {
                setError(submissionError instanceof Error ? submissionError.message : "更新失败。");
              } finally {
                setPending(false);
              }
            }}
          >
            {status === "published" ? "发布" : status === "hidden" ? "隐藏" : "删除"}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
