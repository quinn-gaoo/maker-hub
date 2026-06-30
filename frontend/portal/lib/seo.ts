import type { ProjectDetail, UserProfile } from "@/types";

const DEFAULT_SITE_URL = "https://maker-hub-web.vercel.app";

const SITE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl() {
  for (const key of SITE_URL_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      return normalizeSiteUrl(value);
    }
  }

  return DEFAULT_SITE_URL;
}

export const siteUrl = getSiteUrl();
export const siteName = "MakerHub";
export const defaultTitle = "AI 创作者作品宣传站";
export const defaultDescription = "展示独立 AI 创作者项目、宣传图、链接与评论的中文社区。";

export const publicRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export const privateRobots = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export function absoluteUrl(path = "/") {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  return new URL(pathname, `${siteUrl}/`).toString();
}

export function buildDescription(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildProjectKeywords(project: Pick<ProjectDetail, "title" | "tags" | "author">) {
  const keywords = new Set<string>([
    project.title,
    "MakerHub",
    "AI 项目",
    "独立开发",
    "AI 创作者",
    "作品展示",
  ]);

  if (project.author.username) {
    keywords.add(project.author.username);
  }

  if (project.author.name) {
    keywords.add(project.author.name);
  }

  for (const tag of project.tags) {
    keywords.add(tag.name);
  }

  return Array.from(keywords);
}

export function buildUserDescription(profile: Pick<UserProfile, "username" | "name" | "bio">, projectCount: number) {
  if (profile.bio) {
    return buildDescription(profile.bio);
  }

  const displayName = profile.name ?? profile.username ?? "这位创作者";
  return `${displayName} 在 MakerHub 上公开展示的 AI 项目与作品合集，目前已有 ${projectCount} 个项目。`;
}

export function buildProjectJsonLd(project: ProjectDetail) {
  const description = buildDescription(project.description);
  const authorName = project.author.name ?? project.author.username ?? "MakerHub Creator";
  const images = [
    ...(project.coverImageUrl ? [project.coverImageUrl] : []),
    ...project.images.map((image) => image.imageUrl),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    headline: project.title,
    description,
    url: absoluteUrl(`/projects/${project.id}`),
    image: images,
    datePublished: project.createdAt,
    keywords: buildProjectKeywords(project).join(", "),
    author: {
      "@type": "Person",
      name: authorName,
      url: project.author.username ? absoluteUrl(`/u/${project.author.username}`) : undefined,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
    },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/ViewAction",
        userInteractionCount: project.viewCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: project.upvoteCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: project.comments.length,
      },
    ],
  };
}
