import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Form, Input, Row, Space, Typography } from "antd";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/auth-context";

const { Paragraph, Text, Title } = Typography;

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { session, loading, signIn } = useAuth();
  const [form] = Form.useForm<LoginFormValues>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!loading && session?.authenticated && session.user?.isAdmin) {
    return <Navigate to="/projects/official/new" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background:
          "radial-gradient(circle at top left, rgba(22,119,255,0.16), transparent 28%), radial-gradient(circle at right top, rgba(54,207,201,0.16), transparent 24%), linear-gradient(180deg, #f5f9ff 0%, #edf3fb 100%)",
      }}
    >
      <Row gutter={[24, 24]} align="middle" style={{ minHeight: "calc(100vh - 48px)" }}>
        <Col xs={24} lg={13}>
          <Card
            bordered={false}
            style={{
              borderRadius: 28,
              background: "linear-gradient(135deg, #0f172a 0%, #111827 48%, #1f2937 100%)",
              boxShadow: "0 32px 88px rgba(15,23,42,0.26)",
            }}
            styles={{ body: { padding: 40 } }}
          >
            <Space direction="vertical" size={20}>
              <Space
                size={12}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.1)",
                  color: "#e0f2fe",
                }}
              >
                <SafetyCertificateOutlined />
                <Text style={{ color: "#e0f2fe", letterSpacing: "0.18em", textTransform: "uppercase" }}>Admin Access</Text>
              </Space>
              <Title level={1} style={{ margin: 0, color: "#f8fafc" }}>
                管理后台登录
              </Title>
              <Paragraph style={{ margin: 0, maxWidth: 620, color: "rgba(248,250,252,0.72)", fontSize: 16, lineHeight: 1.9 }}>
                登录后可以创建官方收录项目、上传项目图片，并统一维护站点中的用户、项目、评论与反馈内容。
              </Paragraph>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={11}>
          <Card bordered={false} style={{ borderRadius: 24, boxShadow: "0 24px 64px rgba(15,23,42,0.12)" }}>
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <div>
                <Title level={3} style={{ marginBottom: 8 }}>
                  管理员登录
                </Title>
                <Text type="secondary">使用已具备管理员权限的账号登录。</Text>
              </div>
              {error ? <Alert type="error" showIcon message={error} /> : null}
              <Form<LoginFormValues>
                form={form}
                layout="vertical"
                onFinish={async (values) => {
                  setPending(true);
                  setError("");
                  try {
                    await signIn({ email: values.email.trim(), password: values.password });
                    navigate("/projects/official/new", { replace: true });
                  } catch (submissionError) {
                    setError(submissionError instanceof Error ? submissionError.message : "登录失败。");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <Form.Item label="邮箱" name="email" rules={[{ required: true, message: "请输入邮箱。" }, { type: "email", message: "请输入有效邮箱。" }]}>
                  <Input prefix={<MailOutlined />} size="large" placeholder="admin@example.com" />
                </Form.Item>
                <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码。" }]}>
                  <Input.Password prefix={<LockOutlined />} size="large" placeholder="请输入密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={pending}>
                  登录管理后台
                </Button>
              </Form>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
