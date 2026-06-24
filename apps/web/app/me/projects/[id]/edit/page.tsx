import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { apiInternalRequest } from "@/lib/backend";
import { ProjectForm } from "@/components/project-form";
import { Badge } from "@/components/ui/badge";
import type { ProjectDetail } from "@/types";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  try {
    const project = await apiInternalRequest<ProjectDetail>(`/projects/manage/${id}`);

    return (
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <section className="mx-auto w-full max-w-6xl space-y-10 py-6 md:py-10">
          <div className="rounded-[1.75rem] border border-border/80 bg-card/70 p-8 shadow-sm md:p-14">
            <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-50 px-5 py-2 font-mono text-sm uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-600 align-middle" />
              Edit
            </Badge>
            <div className="mt-7 space-y-4">
              <h1 className="font-heading text-4xl font-black tracking-[-0.08em] md:text-6xl">编辑项目</h1>
              <p className="max-w-3xl text-xl leading-8 text-muted-foreground">
                更新介绍、图片顺序和外链信息。修改后会在项目详情页立即生效。
              </p>
            </div>
          </div>
          <ProjectForm
            mode="edit"
            projectId={id}
            initialData={{
              title: project.title,
              description: project.description,
              projectUrl: project.projectUrl,
              githubUrl: project.githubUrl,
              tags: project.tags.map((tag) => tag.name),
              images: project.images.map((image) => image.imageUrl),
            }}
          />
        </section>
      </div>
    );
  } catch {
    notFound();
  }
}
