import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";

import { apiGet } from "@/lib/backend";
import { auth } from "@/lib/auth";
import { ProjectCard } from "@/components/project-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { buildUserDescription, publicRobots, siteName } from "@/lib/seo";
import type { PaginatedResponse, ProjectCard as ProjectCardType, UserProfile } from "@/types";

type UserPageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  const [profile, projects] = await Promise.all([
    apiGet<UserProfile>(`/users/${username}`),
    apiGet<PaginatedResponse<ProjectCardType>>(`/users/${username}/projects`),
  ]);
  const description = buildUserDescription(profile, projects.total);

  return {
    title: `${profile.username} 的主页`,
    description,
    robots: publicRobots,
    alternates: {
      canonical: `/u/${profile.username}`,
    },
    openGraph: {
      type: "profile",
      title: `${profile.username} 的主页`,
      description,
      url: `/u/${profile.username}`,
      siteName,
      images: profile.avatarUrl ? [{ url: profile.avatarUrl, alt: profile.username ?? username }] : undefined,
    },
    twitter: {
      card: profile.avatarUrl ? "summary" : "summary",
      title: `${profile.username} 的主页`,
      description,
      images: profile.avatarUrl ? [profile.avatarUrl] : undefined,
    },
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params;
  const [profile, projects, session] = await Promise.all([
    apiGet<UserProfile>(`/users/${username}`),
    apiGet<PaginatedResponse<ProjectCardType>>(`/users/${username}/projects`),
    auth(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 md:px-8 py-8">
      <section className="rounded-sm border border-border/70 bg-card/80 p-8 ">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="font-mono text-3xl font-semibold tracking-[-0.06em] md:text-4xl">@{profile.username}</h1>
            <span className="text-sm text-muted-foreground">{projects.total} 个公开项目</span>
          </div>
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
