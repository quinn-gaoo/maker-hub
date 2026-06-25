import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { apiGet } from "@/lib/backend";
import { auth } from "@/lib/auth";
import { ProjectCard } from "@/components/project-card";
import { ProjectActions } from "@/components/project-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import type { PaginatedResponse, ProjectCard as ProjectCardType } from "@/types";

export default async function MyProjectsPage() {
  const session = await auth();
  if (!session?.user?.username) {
    redirect("/login");
  }

  const projects = await apiGet<PaginatedResponse<ProjectCardType>>(`/users/${session.user.username}/projects`);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6 md:px-8 md:py-10">
      <section className="rounded-[1.75rem] border border-border/80 bg-card/70 p-8 shadow-sm md:p-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-6">
            <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-50 px-5 py-2 font-mono text-sm uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-600 align-middle" />
              Manage
            </Badge>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-black tracking-[-0.08em] md:text-6xl">我的项目</h1>
              <p className="max-w-xl text-xl leading-8 text-muted-foreground">
                管理你已经公开发布的 AI 作品。可以编辑内容、调整图片，或者移除不再需要展示的项目。
              </p>
            </div>
            <p className="text-base font-medium text-muted-foreground">{projects.total} 个项目</p>
          </div>
          <Link href="/submit" className={buttonVariants({ size: "lg", className: "h-16 rounded-md px-8 text-lg font-bold" })}>
            <Plus />
            新建项目
          </Link>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {projects.items.map((project) => (
          <div key={project.id} className="space-y-3">
            <ProjectCard project={project} />
            <ProjectActions projectId={project.id} />
          </div>
        ))}
      </section>
    </div>
  );
}
