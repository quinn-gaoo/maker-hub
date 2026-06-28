import Link from "next/link";
import { ArrowUpRight, Eye, MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectCard as ProjectCardType } from "@/types";

type ProjectCardProps = {
  project: ProjectCardType;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="relative group overflow-hidden rounded-md p-0 bg-[#fffaf2]/92 shadow-sm transition-all hover:-translate-y-1 border-transparent hover:border-primary/70  dark:bg-black/80 ">
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        {project.isOfficial ? (
          <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-xs font-normal text-amber-700 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
            官网收录
          </Badge>
        ) : null}
        {project.tags.slice(0, 2).map((tag) => (
          <span key={tag.id} className="rounded-full bg-white/86 px-2.5 py-1 font-mono text-xs font-normal text-foreground shadow-sm backdrop-blur dark:bg-black/80 dark:text-white">
            {tag.name}
          </span>
        ))}
      </div>
      <Link
        href={`/projects/${project.id}`}
        className=" "
      >
        <div className="block aspect-[1.42/1] overflow-hidden border-b border-border/70 bg-muted">
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.28em] text-muted-foreground">
              No Cover
            </div>
          )}
        </div>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            {project.author.username ? (
              <Link href={`/u/${project.author.username}`} className="inline-flex items-center gap-2 font-mono transition-colors hover:text-foreground">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-[10px] font-bold text-foreground">
                  {project.author.username.slice(0, 1).toUpperCase()}
                </span>
                @{project.author.username}
              </Link>
            ) : (
              <span className="font-mono">@creator</span>
            )}
            <span className="font-mono">{new Date(project.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</span>
          </div>
          <div className="space-y-2 pb-3">
            <Link
              href={`/projects/${project.id}`}
              className="group-hover:text-primary font-heading line-clamp-2 text-lg font-black transition-colors hover:text-primary"
            >
              {project.title}
            </Link>
            <p className="line-clamp-2 h-10 text-sm text-muted-foreground" title={project.description}>{project.description}</p>
          </div>
          <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 font-mono">
              <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{project.viewCount}</span>
              <span className="inline-flex items-center gap-1"><ThumbsUp className="size-3.5" />{project.upvoteCount}</span>
              <span className="inline-flex items-center gap-1"><ThumbsDown className="size-3.5" />{project.downvoteCount}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" />{project.commentCount}</span>
            </div>
            <ArrowUpRight className="transition-transform duration-300 group-hover:text-primary size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>

        </CardContent>
      </Link>

    </Card>
  );
}
