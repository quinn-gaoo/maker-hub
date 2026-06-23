"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Mode = "login" | "register";

type ApiError = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export function EmailAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit() {
    setError("");

    startTransition(async () => {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : {
              name,
              email,
              password,
            };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => null)) as ApiError | null;
        if (!response.ok) {
          const message =
            result?.fieldErrors?.email ??
            result?.fieldErrors?.password ??
            result?.message ??
            (mode === "login" ? "登录失败。" : "注册失败。");
          throw new Error(message);
        }

        router.push("/");
        router.refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "提交失败。");
      }
    });
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader className="space-y-4">
        <div className="inline-flex w-fit rounded-full border border-border bg-muted p-1">
          <Button
            variant={mode === "login" ? "default" : "ghost"}
            size="sm"
            disabled={pending}
            onClick={() => setMode("login")}
            className="rounded-full"
          >
            邮箱登录
          </Button>
          <Button
            variant={mode === "register" ? "default" : "ghost"}
            size="sm"
            disabled={pending}
            onClick={() => setMode("register")}
            className="rounded-full"
          >
            邮箱注册
          </Button>
        </div>
        <div className="space-y-1">
          <CardTitle>{mode === "login" ? "继续登录" : "创建邮箱账号"}</CardTitle>
          <CardDescription>
            {mode === "login" ? "使用邮箱和密码直接登录。" : "创建一个 MakerHub 邮箱账号，之后可直接用密码登录。"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "register" ? (
          <label className="grid gap-2 text-sm font-medium">
            <span>昵称</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：Quinn" />
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-medium">
          <span>邮箱</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete={mode === "login" ? "email" : "username"}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          <span>密码</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" disabled={pending} onClick={submit}>
          {mode === "login" ? "登录" : "注册并登录"}
        </Button>
      </CardContent>
    </Card>
  );
}
