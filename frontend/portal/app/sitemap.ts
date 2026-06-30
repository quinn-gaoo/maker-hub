import type { MetadataRoute } from "next";

import { apiGet } from "@/lib/backend";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import type { PaginatedResponse, ProjectCard, UserProfile } from "@/types";

async function getAllProjects() {
  const firstPage = await apiGet<PaginatedResponse<ProjectCard>>("/projects?page=1&sort=latest&page_size=50");
  const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.pageSize));
  const pages = [firstPage];

  if (totalPages > 1) {
    const restPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        apiGet<PaginatedResponse<ProjectCard>>(`/projects?page=${index + 2}&sort=latest&page_size=50`),
      ),
    );
    pages.push(...restPages);
  }

  return pages.flatMap((page) => page.items);
}

async function getAllUsersFromProjects(projects: ProjectCard[]) {
  const usernames = Array.from(
    new Set(projects.map((project) => project.author.username).filter((value): value is string => Boolean(value))),
  );

  const profiles = await Promise.all(
    usernames.map(async (username) => {
      try {
        return await apiGet<UserProfile>(`/users/${username}`);
      } catch {
        return null;
      }
    }),
  );

  return profiles.filter((profile): profile is UserProfile => Boolean(profile));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getAllProjects();
  const profiles = await getAllUsersFromProjects(projects);
  const uniqueUsers = Array.from(new Map(profiles.map((profile) => [profile.username, profile])).values());

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/feedback"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
    url: absoluteUrl(`/projects/${project.id}`),
    lastModified: new Date(project.createdAt),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const userPages: MetadataRoute.Sitemap = uniqueUsers
    .filter((profile) => Boolean(profile.username))
    .map((profile) => ({
      url: absoluteUrl(`/u/${profile.username}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticPages, ...projectPages, ...userPages];
}
