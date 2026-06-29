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

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminDashboardStats = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  totalProjects: number;
  publishedProjects: number;
  hiddenProjects: number;
  deletedProjects: number;
  totalComments: number;
  pendingFeedback: number;
  resolvedFeedback: number;
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  status: "active" | "banned";
  role: "user" | "admin";
  projectCount: number;
  commentCount: number;
  createdAt: string;
};

export type AdminProject = {
  id: string;
  slug: string;
  title: string;
  status: "published" | "hidden" | "deleted";
  isOfficial: boolean;
  projectUrl: string;
  githubUrl: string | null;
  coverImageUrl: string | null;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
};

export type AdminComment = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  projectId: string;
  projectTitle: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
};

export type AdminFeedback = {
  id: string;
  content: string;
  status: "new" | "reviewed" | "resolved";
  createdAt: string;
};

export type ProjectDetail = {
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
  images: ProjectImage[];
  comments: CommentItem[];
};

export type UploadedImageResponse = {
  imageUrl: string;
};
