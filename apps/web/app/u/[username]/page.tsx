import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";

import { apiGet } from "@/lib/backend";
import { auth } from "@/lib/auth";
import { ProjectCard } from "@/components/project-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PaginatedResponse, ProjectCard as ProjectCardType, UserProfile } from "@/types";

type UserPageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} 的主页 | MakerHub`,
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params;
  const [profile, projects, session] = await Promise.all([
    apiGet<UserProfile>(`/users/${username}`),
    apiGet<PaginatedResponse<ProjectCardType>>(`/users/${username}/projects`),
    auth(),
  ]);
  const isOwnProfile = session?.user?.id === profile.id;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 md:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="font-mono text-3xl font-semibold tracking-[-0.06em] md:text-4xl">@{profile.username}</h1>
            <span className="text-sm text-muted-foreground">{projects.total} 个公开项目</span>
          </div>
          {isOwnProfile ? (
            <Link href="/me/profile" className={buttonVariants({ variant: "outline" })}>
              <Settings />
              编辑个人信息
            </Link>
          ) : null}
        </div>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {profile.bio || "这位创作者还没有留下个人简介。"}
        </p>
      </section>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.items.map((project) => (
          <Card key={project.id} className="overflow-hidden rounded-3xl border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
              <ProjectCard project={project} />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
