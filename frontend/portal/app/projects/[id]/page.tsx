import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Eye, GitBranch } from "lucide-react";

import { apiGet, apiRequest } from "@/lib/backend";
import { auth } from "@/lib/auth";
import { CommentSection } from "@/components/comment-section";
import { ProjectReactionBar } from "@/components/project-reaction-bar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ProjectDetail } from "@/types";
import type { ProjectViewCountResponse } from "@/types";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCount(value: number) {
  if (value >= 1000) {
    return `${Number((value / 1000).toFixed(1))}k`;
  }

  return value.toString();
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await apiGet<ProjectDetail>(`/projects/${id}`);
  return {
    title: `${project.title} | MakerHub`,
    description: project.description.slice(0, 140),
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const [project, session] = await Promise.all([apiGet<ProjectDetail>(`/projects/${id}`), auth()]);
  const viewCount = await apiRequest<ProjectViewCountResponse>(`/projects/${id}/views`, {
    method: "POST",
  })
    .then((payload) => payload.viewCount)
    .catch(() => project.viewCount);
  const publishedAt = new Date(project.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const galleryImages = project.images.length > 0
    ? project.images
    : project.coverImageUrl
      ? [{ id: `${project.id}-cover`, imageUrl: project.coverImageUrl, sortOrder: 0 }]
      : [];
  const authorName = project.author.name ?? project.author.username ?? "Creator";
  const authorInitial = (project.author.username ?? project.author.name ?? "M").slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 py-12 px-4 md:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" />
        返回发现页
      </Link>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_370px] xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="min-w-0 space-y-8">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {project.author.username ? (
                <Link href={`/u/${project.author.username}`} className="inline-flex items-center gap-2 font-mono transition-colors hover:text-foreground">
                  <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-accent text-xs font-bold text-foreground">
                    {project.author.avatarUrl ? (
                      <img src={project.author.avatarUrl} alt={authorName} className="h-full w-full object-cover" />
                    ) : (
                      authorInitial
                    )}
                  </span>
                  @{project.author.username}
                </Link>
              ) : (
                <span className="font-mono">@creator</span>
              )}
              <span className="text-border">·</span>
              <span className="font-mono">{publishedAt}</span>
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-black leading-tight tracking-[-0.07em] md:text-5xl lg:text-6xl">{project.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {project.isOfficial ? (
                  <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 px-3 py-1 font-mono font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
                    官网收录
                  </Badge>
                ) : null}
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Eye className="size-4" />
                  {formatCount(viewCount)} 次浏览
                </span>
                <span className="h-5 w-px bg-border" />
                <ProjectReactionBar
                  projectId={project.id}
                  initialUpvoteCount={project.upvoteCount}
                  initialDownvoteCount={project.downvoteCount}
                  initialReaction={project.currentReaction}
                  isAuthenticated={Boolean(session?.user)}
                  compact
                />
                <span className="h-5 w-px bg-border" />
                {project.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="rounded-full px-3 py-1 font-mono font-medium">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-border/50 bg-card/70 p-5 text-base leading-8 text-foreground ">
              {project.description}
            </div>

            <div className="flex flex-wrap gap-3">
              {project.githubUrl ? (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  <GitBranch />
                  GitHub
                </a>
              ) : null}
              <a href={project.projectUrl} target="_blank" rel="noreferrer noopener" className={buttonVariants({ size: "lg" })}>
                <ExternalLink />
                访问作品
              </a>
            </div>

            {galleryImages.length > 0 ? (
              <div className="space-y-4 pt-2">
                <h2 className="font-heading text-2xl font-black ">作品截图</h2>
                <div className="grid gap-4 ">
                  {galleryImages.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                      <img src={image.imageUrl} alt={project.title} className="aspect-4/3 h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <CommentSection
              projectId={project.id}
              comments={project.comments}
              canComment={Boolean(session?.user)}
              currentUserId={session?.user?.id}
              currentUserName={session?.user?.name ?? session?.user?.username}
              currentUserAvatarUrl={session?.user?.image}
            />
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-border/80 bg-card/70 p-6 shadow-sm">
            <p className="mb-6 text-sm font-semibold text-muted-foreground">创作者</p>
            <div className="flex items-center gap-4">
              <Link href={project.author.username ? `/u/${project.author.username}` : "#"} className="grid size-16 place-items-center overflow-hidden rounded-full bg-accent text-lg font-black text-foreground">
                {project.author.avatarUrl ? (
                  <img src={project.author.avatarUrl} alt={authorName} className="h-full w-full object-cover" />
                ) : (
                  authorInitial
                )}
              </Link>
              <div className="min-w-0">
                <p className="font-heading truncate text-lg font-black">{authorName}</p>
                <p className="truncate font-mono text-sm text-muted-foreground">@{project.author.username ?? "creator"}</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-5 text-sm">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4" />
                发布于
              </span>
              <span className="font-mono font-semibold">{publishedAt}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-card/70 p-6 shadow-sm">
            <p className="mb-6 text-sm font-semibold text-muted-foreground">互动数据</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="mb-3 text-xs text-muted-foreground">浏览</p>
                <p className="font-mono text-3xl font-black tracking-[-0.06em]">{formatCount(viewCount)}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="mb-3 text-xs text-muted-foreground">点赞</p>
                <p className="font-mono text-3xl font-black tracking-[-0.06em]">{project.upvoteCount}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="mb-3 text-xs text-muted-foreground">点踩</p>
                <p className="font-mono text-3xl font-black tracking-[-0.06em]">{project.downvoteCount}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="mb-3 text-xs text-muted-foreground">评论</p>
                <p className="font-mono text-3xl font-black tracking-[-0.06em]">{project.comments.length}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

    </div>
  );
}
