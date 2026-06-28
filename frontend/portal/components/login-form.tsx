"use client";

import { useState } from "react";
import { ArrowRightCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthSessionResponse } from "@/types";

type ApiError = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (pending) {
      return;
    }

    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json().catch(() => null)) as (AuthSessionResponse & ApiError) | null;
      if (!response.ok || !result?.authenticated || !result.user) {
        const message = result?.fieldErrors?.email ?? result?.fieldErrors?.password ?? result?.message ?? "登录失败。";
        throw new Error(message);
      }

      router.push("/");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "提交失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-7"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-4">
        <label className="grid gap-2">
          <span className="text-[14px] font-semibold text-foreground">邮箱</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-12 rounded-sm border-input bg-background pl-11 pr-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-[14px] font-semibold text-foreground">密码</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
              autoComplete="current-password"
              className="h-12 rounded-sm border-input bg-background pl-11 pr-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
          </div>
        </label>
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Button
        type="submit"
        className="h-12 w-full font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
        disabled={pending}
      >
        <ArrowRightCircle className="size-[18px]" />
        登录
      </Button>
    </form>
  );
}
