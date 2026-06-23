import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ProjectForm } from "@/components/project-form";
import { Badge } from "@/components/ui/badge";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-10 py-6 md:py-10">
      <div className="rounded-[1.75rem] border border-border/80 bg-card/70 p-8 shadow-sm md:p-14">
        <Badge variant="outline" className="rounded-full border-primary/30 bg-background/60 px-5 py-2 font-mono text-sm uppercase tracking-[0.22em] text-primary">
          <span className="mr-2 inline-block size-2 rounded-full bg-primary align-middle" />
          Publish
        </Badge>
        <div className="mt-7 space-y-4">
          <h1 className="font-heading text-4xl font-black tracking-[-0.08em] md:text-6xl">发布新的 AI 项目</h1>
          <p className="max-w-3xl text-xl leading-8 text-muted-foreground">
            上传 1 到 3 张宣传图，补充链接、描述和标签，让更多人看到你的作品。
          </p>
        </div>
      </div>
      <ProjectForm mode="create" />
    </section>
  );
}
