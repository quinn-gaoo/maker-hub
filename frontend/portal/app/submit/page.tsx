import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ProjectForm } from "@/components/project-form";
import { Badge } from "@/components/ui/badge";
import { privateRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "发布项目",
  robots: privateRobots,
};

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-10 py-6 md:py-10">
        <div className="rounded-md border border-border/80 bg-card/70 p-8 shadow-sm ">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-background/60 px-5 py-2 font-mono text-sm uppercase tracking-[0.22em] text-primary">
            <span className="mr-2 inline-block size-2 rounded-full bg-primary align-middle" />
            Publish
          </Badge>
          <div className="mt-7 space-y-4">
            <h1 className="font-heading text-3xl font-black ">发布你新创作的 <span className=" font-mono">vibe coding</span> 项目</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              上传 1 到 3 张宣传图，补充链接、描述和标签，让更多人看到你的作品。
            </p>
          </div>
        </div>
        <ProjectForm mode="create" />
      </section>
    </div>
  );
}
