import { EmailAuthForm } from "@/components/email-auth-form";
import { LoginButtons } from "@/components/login-buttons";
import { Badge } from "@/components/ui/badge";
import { isOAuthProviderEnabled } from "@/lib/oauth";
import { CircleUserRound, FolderKanban, MessageCircleMore } from "lucide-react";

const providerMeta = [
  { id: "google", label: "Google", enabled: isOAuthProviderEnabled("google") },
  { id: "github", label: "GitHub", enabled: isOAuthProviderEnabled("github") },
];

export default function LoginPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-8%] top-[4%] h-56 w-56 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute bottom-[10%] right-[4%] h-72 w-72 rounded-full bg-accent/35 blur-3xl" />
      </div>
      <div className="mx-auto w-full max-w-[1340px] px-4 py-6 md:px-8 md:py-12">
        <section className="flex justify-center gap-8 ">
          <div className=" flex-col rounded-md border border-border bg-card/90 p-10 shadow-xl/5 backdrop-blur-sm md:p-8 hidden xl:flex">
            <Badge variant="outline" className="w-fit rounded-full border-border bg-secondary px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary-foreground">
              <span className="mr-3 inline-block size-3 rounded-full bg-primary" />
              Access
            </Badge>
            <div className="mt-12 space-y-5">
              <h1 className="font-heading text-[46px] font-semibold leading-none tracking-[-0.07em] text-foreground">登录 MakerHub</h1>
              <p className=" text-sm leading-6 text-muted-foreground">
                支持 Google、GitHub、邮箱登录/注册。选择一个你喜欢的方式，加入这个安静的创作者社区。
              </p>
            </div>
            <div className="mt-8 space-y-8">
              <div className="flex items-start gap-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border bg-secondary text-primary">
                  <FolderKanban className="size-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-md font-semibold tracking-[-0.03em] text-foreground">管理项目、图片、评论、主页</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    发布作品后随时编辑内容、调整图片顺序、回复评论，完全掌控你的展示页面。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border bg-secondary text-primary">
                  <CircleUserRound className="size-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-md font-semibold tracking-[-0.03em] text-foreground">拥有自己的创作者主页</h2>
                  <p className=" text-sm leading-6 text-muted-foreground">
                    <span className="font-mono text-foreground">@你的用户名</span> 将成为别人找到你的方式。把你的作品集中展示在个人主页上。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border bg-secondary text-primary">
                  <MessageCircleMore className="size-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-md font-semibold tracking-[-0.03em] text-foreground">参与互动、收集真实反馈</h2>
                  <p className=" text-sm leading-6 text-muted-foreground">
                    给喜欢的作品点赞、评论，也能收到来自其他创作者的鼓励和建议。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:min-w-[600px] md:w-auto rounded-md border border-border bg-card/90 p-4 shadow-xl/5 backdrop-blur-sm md:p-8">
            <EmailAuthForm />
            <div className="my-10 flex items-center gap-4 text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[14px]">或</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <LoginButtons providers={providerMeta} />
          </div>
        </section>
      </div>
    </div>
  );
}
