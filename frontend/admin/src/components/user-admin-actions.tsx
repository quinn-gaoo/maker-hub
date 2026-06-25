import { useState } from "react";
import { Button } from "@/components/ui/button";

import { updateAdminUser } from "@/lib/api";
import type { AdminUser } from "@/types";

type UserAdminActionsProps = {
  user: AdminUser;
  onUpdated: () => void;
  disabled?: boolean;
};

export function UserAdminActions({ user, onUpdated, disabled }: UserAdminActionsProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(next: Partial<Pick<AdminUser, "status" | "role">>) {
    setPending(true);
    setError("");
    try {
      await updateAdminUser(user.id, {
        status: next.status ?? user.status,
        role: next.role ?? user.role,
      });
      onUpdated();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "更新失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending || disabled || user.status === "active"} onClick={() => void submit({ status: "active" })}>
          启用
        </Button>
        <Button size="sm" variant="outline" disabled={pending || disabled || user.status === "banned"} onClick={() => void submit({ status: "banned" })}>
          封禁
        </Button>
        <Button size="sm" variant="outline" disabled={pending || disabled || user.role === "user"} onClick={() => void submit({ role: "user" })}>
          普通用户
        </Button>
        <Button size="sm" variant="outline" disabled={pending || disabled || user.role === "admin"} onClick={() => void submit({ role: "admin" })}>
          管理员
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
