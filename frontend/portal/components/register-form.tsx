"use client";

import { useEffect, useState } from "react";
import { ArrowRightCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientApiPath } from "@/lib/client-api";
import type { AuthSessionResponse } from "@/types";

type ApiError = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

type VerificationCodeResponse = {
  message: string;
  cooldownSeconds: number;
  expiresInSeconds: number;
};

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendVerificationCode() {
    if (sendingCode) {
      return;
    }

    setError("");
    setNotice("");
    setSendingCode(true);

    try {
      const response = await fetch(clientApiPath("/auth/email-verification-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = (await response.json().catch(() => null)) as (VerificationCodeResponse & ApiError) | null;
      if (!response.ok || typeof result?.cooldownSeconds !== "number" || typeof result?.message !== "string") {
        const message = result?.fieldErrors?.email ?? result?.message ?? "验证码发送失败。";
        throw new Error(message);
      }

      setCooldown(result.cooldownSeconds);
      setNotice(result.message);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "验证码发送失败。");
    } finally {
      setSendingCode(false);
    }
  }

  async function submit() {
    if (pending) {
      return;
    }

    setError("");
    setNotice("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          verificationCode: verificationCode.trim().toUpperCase(),
        }),
      });

      const result = (await response.json().catch(() => null)) as (AuthSessionResponse & ApiError) | null;
      if (!response.ok || !result?.authenticated || !result.user) {
        const message =
          result?.fieldErrors?.email ??
          result?.fieldErrors?.password ??
          result?.fieldErrors?.verificationCode ??
          result?.message ??
          "注册失败。";
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
          <span className="text-sm font-semibold text-foreground">昵称</span>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4.5  -translate-y-1/2 text-muted-foreground" />
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：Quinn"
              className="h-12 rounded-sm border-input bg-background pl-11 pr-4 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-foreground">邮箱</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4.5  -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              className="h-12 rounded-sm border-input bg-background pl-11 pr-4 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
          </div>
        </label>

        <div className="grid gap-2">
          <span className="text-sm font-semibold text-foreground">验证码</span>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.toUpperCase())}
              placeholder="例如：MKH-123456"
              autoComplete="one-time-code"
              className="h-12 rounded-sm border-input bg-background px-4 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-sm border-input bg-background px-5 text-sm font-semibold text-foreground shadow-none"
              disabled={pending || sendingCode || cooldown > 0}
              onClick={() => {
                void sendVerificationCode();
              }}
            >
              {cooldown > 0 ? `${cooldown}s 后重试` : sendingCode ? "发送中..." : "发送验证码"}
            </Button>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-foreground">密码</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4.5  -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位"
              autoComplete="new-password"
              className="h-12 rounded-sm border-input bg-background pl-11 pr-4 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
          </div>
        </label>
      </div>

      {notice ? <p className="text-sm font-medium text-emerald-600">{notice}</p> : null}
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Button
        type="submit"
        className="h-12 w-full rounded-sm bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
        disabled={pending || sendingCode}
      >
        <ArrowRightCircle className="size-[18px]" />
        注册并登录
      </Button>
    </form>
  );
}
