import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AdminLayout } from "@/layouts/admin-layout";
import { CommentsPage } from "@/pages/comments-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { FeedbackPage } from "@/pages/feedback-page";
import { LoginPage } from "@/pages/login-page";
import { OfficialProjectCreatePage } from "@/pages/official-project-create-page";
import { ProjectsPage } from "@/pages/projects-page";
import { UsersPage } from "@/pages/users-page";

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">正在加载管理后台...</div>;
  }

  if (!session?.authenticated || !session.user?.isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/official/new" element={<OfficialProjectCreatePage />} />
        <Route path="/comments" element={<CommentsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
      </Routes>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
