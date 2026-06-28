"use client";

import { useState } from "react";

import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";
import { Button } from "@/components/ui/button";

type Mode = "login" | "register";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="space-y-7">
      <div className="inline-flex w-fit rounded-full border border-border bg-secondary p-1">
        <Button
          variant={mode === "login" ? "default" : "ghost"}
          onClick={() => setMode("login")}
          className="rounded-full  px-6 py-4"
        >
          邮箱登录
        </Button>
        <Button
          variant={mode === "register" ? "default" : "ghost"}
          onClick={() => setMode("register")}
          className="rounded-full px-6 py-4"
        >
          邮箱注册
        </Button>
      </div>

      {mode === "login" ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}
