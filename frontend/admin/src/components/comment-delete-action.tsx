import { useState } from "react";
import { Button } from "@/components/ui/button";

import { deleteAdminComment } from "@/lib/api";

type CommentDeleteActionProps = {
  commentId: string;
  onDeleted: () => void;
};

export function CommentDeleteAction({ commentId, onDeleted }: CommentDeleteActionProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            await deleteAdminComment(commentId);
            onDeleted();
          } catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : "删除失败。");
          } finally {
            setPending(false);
          }
        }}
      >
        删除评论
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
