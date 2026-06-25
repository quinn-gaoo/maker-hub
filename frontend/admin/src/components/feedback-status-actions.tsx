import { useState } from "react";
import { Button } from "@makerhub/ui";

import { updateAdminFeedback } from "@/lib/api";
import type { AdminFeedback } from "@/types";

type FeedbackStatusActionsProps = {
  feedback: AdminFeedback;
  onUpdated: () => void;
};

const OPTIONS: AdminFeedback["status"][] = ["new", "reviewed", "resolved"];

export function FeedbackStatusActions({ feedback, onUpdated }: FeedbackStatusActionsProps) {
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
            disabled={pending || feedback.status === status}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                await updateAdminFeedback(feedback.id, { status });
                onUpdated();
              } catch (submissionError) {
                setError(submissionError instanceof Error ? submissionError.message : "更新失败。");
              } finally {
                setPending(false);
              }
            }}
          >
            {status === "new" ? "新建" : status === "reviewed" ? "处理中" : "已解决"}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
