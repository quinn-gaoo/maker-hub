import { EmailAuthForm } from "@/components/email-auth-form";
import { LoginButtons } from "@/components/login-buttons";
import { Badge } from "@/components/ui/badge";

const providerMeta = [
  { id: "google", label: "Google", enabled: true },
  { id: "github", label: "GitHub", enabled: true },
];

export default function LoginPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
      <div className="rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
        <Badge variant="outline" className="rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em]">
          Access
        </Badge>
        <div className="mt-6 space-y-4">
          <h1 className="font-heading text-4xl font-semibold tracking-[-0.08em] md:text-5xl">登录 MakerHub</h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            你现在可以继续使用 Google、GitHub 登录，也可以直接用邮箱注册和登录。
          </p>
        </div>
        <div className="mt-8 space-y-3 text-sm text-muted-foreground">
          <p>统一管理你的 AI 项目、图片、评论和主页展示。</p>
          <p>邮箱账号适合希望长期运营作品集的创作者。</p>
        </div>
      </div>
      <div className="grid gap-6">
        <EmailAuthForm />
        <LoginButtons providers={providerMeta} />
      </div>
    </section>
  );
}
