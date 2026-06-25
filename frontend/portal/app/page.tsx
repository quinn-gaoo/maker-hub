import Link from "next/link";
import { ArrowDown, Flame, Grid2X2, Rocket } from "lucide-react";

import { auth } from "@/lib/auth";
import { apiGet } from "@/lib/backend";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCard } from "@/components/project-card";
import { cn } from "@/lib/utils";
import type { HomeStats, PaginatedResponse, ProjectCard as ProjectCardType } from "@/types";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const params = ((await searchParams) ?? {}) as Record<string, string | undefined>;
  const page = params.page ?? "1";
  const tag = params.tag ?? "";
  const q = params.q ?? "";
  const rawSort = params.sort ?? "latest";
  const sort = ["latest", "top", "discussed"].includes(rawSort) ? rawSort : "latest";
  const query = new URLSearchParams();
  query.set("page", page);
  query.set("sort", sort);
  if (tag) {
    query.set("tag", tag);
  }
  if (q) {
    query.set("q", q);
  }

  const [projects, stats] = await Promise.all([
    apiGet<PaginatedResponse<ProjectCardType>>(`/projects?${query.toString()}`),
    apiGet<HomeStats>("/stats/home"),
  ]);

  const featuredProjects = projects.items.slice(0, 3);
  const currentPage = Number(projects.page);
  const pageSize = Number(projects.pageSize);
  const totalPages = Math.max(1, Math.ceil(projects.total / pageSize));
  const sortOptions = [
    { value: "latest", label: "最新" },
    { value: "top", label: "高赞" },
    { value: "discussed", label: "热议" },
  ];

  function buildHref(overrides: Record<string, string | number | null>) {
    const next = new URLSearchParams();
    next.set("page", String(overrides.page ?? page));
    next.set("sort", String(overrides.sort ?? sort));
    if (overrides.tag !== null && (overrides.tag ?? tag)) {
      next.set("tag", String(overrides.tag ?? tag));
    }
    if (overrides.q !== null && (overrides.q ?? q)) {
      next.set("q", String(overrides.q ?? q));
    }
    return `/?${next.toString()}`;
  }

  return (
    <div className="space-y-8">
      <section className="relative w-screen overflow-hidden 
      bg-[radial-gradient(circle_at_8%_20%,rgba(224,255,236,0.72),transparent_22%),
      radial-gradient(circle_at_92%_5%,rgba(255,213,190,0.68),transparent_26%),linear-gradient(180deg,rgba(255,251,244,0.92)_0%,rgba(250,246,238,0.82)_100%)] py-10 dark:bg-[radial-gradient(circle_at_8%_20%,rgba(0,105,72,0.22),transparent_24%),radial-gradient(circle_at_94%_8%,rgba(122,43,15,0.35),transparent_28%),linear-gradient(180deg,rgba(2,2,2,1)_0%,rgba(0,0,0,0.92)_100%)] md:py-16">
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: "radial-gradient(var(--foreground-20) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
          <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-center">
            <div className="space-y-7">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
                AI Creator Showcase
              </Badge>
              <div className="space-y-4">
                <h1 className="font-heading max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.08em] text-foreground md:text-5xl lg:text-6xl">
                  把个人 <span className="italic text-primary">AI 作品</span>
                  <br />
                  放到值得被看见的地方。
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                  MakerHub 是一个为独立开发者、AI 玩家和创作者准备的作品池。发布你的应用、工具、生成内容，收集真实反馈，认识同样在折腾的人。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/submit" className={buttonVariants({ size: "lg" })}>
                  <Rocket />
                  发布我的作品
                </Link>
                {!session?.user ? (
                  <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                    登录管理
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {stats.recentUsers.map((user) => {
                    const displayName = user.name ?? user.username ?? "Creator";
                    const avatarUrl = user.avatarUrl;
                    return (
                      <span key={user.id} className="grid size-8 place-items-center overflow-hidden rounded-full border-2 border-background bg-accent text-xs font-bold text-foreground">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          displayName.slice(0, 1).toUpperCase()
                        )}
                      </span>
                    );
                  })}
                </div>
                <span><strong className="font-mono text-foreground">{stats.creatorCount}</strong> 位独立创作者已在这里发布作品。</span>
              </div>
            </div>
            <Card className="rounded-[1.75rem] border-border/80 bg-[#fffaf2]/78 shadow-[0_24px_80px_rgba(80,52,28,0.08)] transition-transform duration-300 hover:scale-[1.02] dark:bg-black/78 dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg tracking-[-0.04em]">概览</CardTitle>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">公开作品</span>
                      <Flame className="size-4 text-primary" />
                    </div>
                    <p className="font-mono text-3xl font-black tracking-[-0.05em]">{stats.projectCount}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/30">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">当前页</span>
                      <Grid2X2 className="size-4 text-emerald-600" />
                    </div>
                    <p className="font-mono text-3xl font-black tracking-[-0.05em]">{projects.items.length}</p>
                  </div>
                </div>
                <div className="border-t border-border/80 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">最近上新</p>
                  <div className="space-y-3">
                    {featuredProjects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-muted/50">
                        <div className="size-10 overflow-hidden rounded-lg bg-muted">
                          {project.coverImageUrl ? <img src={project.coverImageUrl} alt={project.title} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{project.title}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">@{project.author.username ?? "creator"}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="rounded-[1.75rem] bg-[#050505] bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:34px_34px] px-6 py-10 text-white shadow-[0_28px_80px_rgba(0,0,0,0.18)] dark:bg-[#f8f5ef] dark:bg-[linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] dark:text-black md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Why MakerHub</p>
              <p className="font-heading max-w-3xl text-3xl font-black leading-tight tracking-[-0.06em] md:text-4xl">
                “我们不需要再一个流量平台。我们需要一个可以安静地把作品摆出来的地方。”
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/55 dark:text-black/55">
                没有推荐算法，没有刷不完的信息流，没有付费置顶。所有作品按时间排序，所有反馈来自真人。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-primary">
              <div><p className="font-mono text-3xl font-black">{stats.creatorCount}</p><p className="mt-1 text-xs text-white/50 dark:text-black/50">创作者</p></div>
              <div><p className="font-mono text-3xl font-black">{stats.projectCount}</p><p className="mt-1 text-xs text-white/50 dark:text-black/50">已发布作品</p></div>
              <div><p className="font-mono text-3xl font-black">{stats.commentCount}</p><p className="mt-1 text-xs text-white/50 dark:text-black/50">真实评论</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-7 px-4 pt-10 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Recently Published</p>
            <h2 className="font-heading text-4xl font-black tracking-[-0.07em]">{tag ? `标签：${tag}` : "最新发布项目"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">这里没有热度算法，按时间倒序展示。慢慢逛，看见每一个真诚的作品。</p>
          </div>
          <div className="inline-flex w-fit overflow-hidden rounded-full border border-border bg-card p-1 text-sm">
            {sortOptions.map((option) => {
              const active = sort === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildHref({ sort: option.value, page: 1 })}
                  scroll={false}
                  className={cn(
                    "inline-flex min-w-14 items-center justify-center rounded-full px-4 py-2 leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
        {q ? <p className="text-sm text-muted-foreground">当前搜索词：{q}</p> : null}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        {projects.items.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {currentPage > 1 ? (
              <Link href={buildHref({ page: currentPage - 1 })} scroll={false} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                上一页
              </Link>
            ) : null}
            <span className="font-mono text-sm text-muted-foreground">
              第 {currentPage} / {totalPages} 页
            </span>
            {currentPage < totalPages ? (
              <Link href={buildHref({ page: currentPage + 1 })} scroll={false} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                下一页
                <ArrowDown className="size-4" />
              </Link>
            ) : null}
          </div>
        ) : null}
        {projects.items.length === 0 ? (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              当前条件下还没有项目，欢迎抢先发布。
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
