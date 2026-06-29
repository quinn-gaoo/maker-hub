import type { MenuProps } from "antd";
import { Avatar, Button, Layout, Menu, Space, Typography } from "antd";
import { AppstoreOutlined, CommentOutlined, DashboardOutlined, FileAddOutlined, FolderOpenOutlined, LogoutOutlined, MessageOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/auth-context";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const navItems = [
  { key: "/", label: "总览", icon: <DashboardOutlined /> },
  { key: "/users", label: "用户", icon: <UserOutlined /> },
  { key: "/projects", label: "项目", icon: <FolderOpenOutlined /> },
  { key: "/projects/official/new", label: "官方收录", icon: <FileAddOutlined /> },
  { key: "/comments", label: "评论", icon: <CommentOutlined /> },
  { key: "/feedback", label: "反馈", icon: <MessageOutlined /> },
] satisfies Array<{ key: string; label: string; icon: ReactNode }>;

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  const menuItems: MenuProps["items"] = navItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <Link to={item.key}>{item.label}</Link>,
  }));

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={256}
        breakpoint="lg"
        collapsedWidth={80}
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
        }}
      >
        <div style={{ padding: 24 }}>
          <Space align="center" size={14}>
            <Avatar
              size={48}
              icon={<SafetyCertificateOutlined />}
              style={{
                background: "linear-gradient(135deg, #1677ff 0%, #36cfc9 100%)",
                boxShadow: "0 12px 24px rgba(22,119,255,0.28)",
              }}
            />
            <div>
              <Title level={4} style={{ margin: 0, color: "#f8fafc" }}>
                MakerHub Admin
              </Title>
              <Text style={{ color: "rgba(248,250,252,0.72)" }}>内容与官方项目管理</Text>
            </div>
          </Space>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          theme="dark"
          style={{
            background: "transparent",
            borderInlineEnd: "none",
            paddingInline: 12,
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: "rgba(255,255,255,0.86)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space size={12}>
            <Avatar icon={<AppstoreOutlined />} style={{ backgroundColor: "#e6f4ff", color: "#1677ff" }} />
            <div>
              <Text strong style={{ display: "block", color: "#0f172a" }}>
                {session?.user?.name ?? session?.user?.email ?? "Admin"}
              </Text>
              <Text type="secondary">{session?.user?.email}</Text>
            </div>
          </Space>
          <Button
            icon={<LogoutOutlined />}
            onClick={async () => {
              await signOut();
              navigate("/login", { replace: true });
            }}
          >
            退出
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>
          <div
            style={{
              minHeight: "calc(100vh - 112px)",
              borderRadius: 24,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
