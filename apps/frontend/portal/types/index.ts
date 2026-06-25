export type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type ProjectImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

export type ProjectAuthor = {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  author: ProjectAuthor;
};

export type ProjectCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  projectUrl: string;
  githubUrl: string | null;
  coverImageUrl: string | null;
  isOfficial: boolean;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  currentReaction: "up" | "down" | null;
  createdAt: string;
  author: ProjectAuthor;
  tags: Tag[];
  commentCount: number;
};

export type ProjectDetail = ProjectCard & {
  images: ProjectImage[];
  comments: CommentItem[];
};

export type ProjectViewCountResponse = {
  projectId: string;
  viewCount: number;
};

export type ProjectReactionResponse = {
  projectId: string;
  upvoteCount: number;
  downvoteCount: number;
  currentReaction: "up" | "down" | null;
};

export type UserProfile = ProjectAuthor & {
  projects: ProjectCard[];
};

export type HomeStats = {
  creatorCount: number;
  projectCount: number;
  commentCount: number;
  recentUsers: ProjectAuthor[];
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ProjectFormInput = {
  title: string;
  description: string;
  projectUrl: string;
  githubUrl?: string;
  tags: string[];
  images: File[];
};

export type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
};

export type AuthSessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  username: string | null;
  role: string | null;
  isAdmin: boolean;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  user: AuthSessionUser | null;
};

export type UserProfileUpdatePayload = {
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
};
