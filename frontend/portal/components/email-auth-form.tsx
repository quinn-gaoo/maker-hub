"use client";

import { useEffect, useState } from "react";
import { ArrowRightCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AuthSessionResponse } from "@/types";

type Mode = "login" | "register";

type ApiError = {
  message?: string;
  fieldErrors?: Record<string, string>;
  cooldownSeconds?: number;
};

type VerificationCodeResponse = {
  message: string;
  cooldownSeconds: number;
  expiresInSeconds: number;
};

export function EmailAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
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

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  async function sendVerificationCode() {
    if (sendingCode) {
      return;
    }

    setError("");
    setNotice("");

    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/email-verification-code", {
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
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : {
            name,
            email,
            password,
            verificationCode: verificationCode.trim().toUpperCase(),
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as (AuthSessionResponse & ApiError) | null;
      if (!response.ok || !result?.authenticated || !result.user) {
        const message =
          result?.fieldErrors?.email ??
          result?.fieldErrors?.password ??
          result?.fieldErrors?.verificationCode ??
          result?.message ??
          (mode === "login" ? "登录失败。" : "注册失败。");
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
        submit();
      }}
    >
      <div className="inline-flex w-fit rounded-full border border-border bg-secondary p-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || sendingCode}
          onClick={() => switchMode("login")}
          className={cn(
            "h-11 min-w-[124px] rounded-full px-6 text-[14px] font-semibold text-muted-foreground hover:text-foreground",
            mode === "login" && "bg-background text-foreground shadow-sm",
          )}
        >
          邮箱登录
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || sendingCode}
          onClick={() => switchMode("register")}
          className={cn(
            "h-11 min-w-[124px] rounded-full px-6 text-[14px] font-semibold text-muted-foreground hover:text-foreground",
            mode === "register" && "bg-background text-foreground shadow-sm",
          )}
        >
          邮箱注册
        </Button>
      </div>

      <div className="space-y-4">
        {mode === "register" ? (
          <label className="grid gap-2">
            <span className="text-[14px] font-semibold text-foreground">昵称</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：Quinn"
                className="h-14 rounded-[14px] border-input bg-background pl-11 pr-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
              />
            </div>
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-[14px] font-semibold text-foreground">邮箱</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete={mode === "login" ? "email" : "username"}
              className="h-14 rounded-[14px] border-input bg-background pl-11 pr-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
          </div>
        </label>

        {mode === "register" ? (
          <div className="grid gap-2">
            <span className="text-[14px] font-semibold text-foreground">验证码</span>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.toUpperCase())}
                placeholder="例如：MKH-123456"
                autoComplete="one-time-code"
                className="h-14 rounded-[14px] border-input bg-background px-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
              />
              <Button
                variant="outline"
                className="h-14 rounded-[14px] border-input bg-background px-5 text-[14px] font-semibold text-foreground shadow-none hover:bg-secondary"
                disabled={pending || sendingCode || cooldown > 0}
                onClick={sendVerificationCode}
              >
                {cooldown > 0 ? `${cooldown}s 后重试` : sendingCode ? "发送中..." : "发送验证码"}
              </Button>
            </div>
          </div>
        ) : null}

        <label className="grid gap-2">
          <span className="text-[14px] font-semibold text-foreground">密码</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "login" ? "输入密码" : "至少 8 位"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="h-14 rounded-[14px] border-input bg-background pl-11 pr-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/15"
            />
          </div>
        </label>
      </div>

      {notice ? <p className="text-sm font-medium text-emerald-600">{notice}</p> : null}
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Button
        type="submit"
        className="h-14 w-full rounded-[14px] bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
        disabled={pending || sendingCode}
      >
        <ArrowRightCircle className="size-[18px]" />
        {mode === "login" ? "登录" : "注册并登录"}
      </Button>
    </form>
  );
}
