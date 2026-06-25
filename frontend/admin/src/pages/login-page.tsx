import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

export function LoginPage() {
  const navigate = useNavigate();
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!loading && session?.authenticated && session.user?.isAdmin) {
    return <Navigate to="/projects/official/new" replace />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 md:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-slate-900/80 bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f2937_100%)] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] md:p-12">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-200">Admin Access</p>
          <h1 className="font-heading text-4xl font-black tracking-[-0.08em] md:text-6xl">管理后台登录</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/70">
            登录后可以从管理后台创建官方收录项目，并对站点内容进行统一维护。
          </p>
        </section>

        <Card className="rounded-[2rem] border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle>管理员登录</CardTitle>
            <CardDescription>使用已具备管理员权限的账号登录。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="grid gap-2 text-sm font-medium">
              <span>邮箱</span>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>密码</span>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              className="w-full"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setError("");
                try {
                  await signIn({ email: email.trim(), password });
                  navigate("/projects/official/new", { replace: true });
                } catch (submissionError) {
                  setError(submissionError instanceof Error ? submissionError.message : "登录失败。");
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "登录中..." : "登录管理后台"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
