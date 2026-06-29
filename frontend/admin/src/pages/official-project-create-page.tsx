import { InboxOutlined, LinkOutlined, PictureOutlined, RocketOutlined, TagsOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Col, Form, Input, Row, Space, Switch, Typography, Upload } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { useMemo, useState } from "react";

import { createOfficialProject, uploadProjectImage } from "@/lib/api";
import type { ProjectDetail } from "@/types";

const { Dragger } = Upload;
const { Paragraph, Text, Title } = Typography;
const MAX_IMAGES = 3;

type OfficialProjectFormValues = {
  title: string;
  description: string;
  projectUrl: string;
  githubUrl?: string;
  tags: string;
  isOfficial: boolean;
};

export function OfficialProjectCreatePage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<OfficialProjectFormValues>();
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ProjectDetail | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const canSubmit = useMemo(() => !pending && !uploading, [pending, uploading]);

  const uploadProps: UploadProps = {
    multiple: true,
    maxCount: MAX_IMAGES,
    accept: "image/png,image/jpeg,image/webp,image/gif,image/avif",
    fileList,
    beforeUpload: async (file) => {
      if (imageUrls.length >= MAX_IMAGES) {
        message.error(`最多上传 ${MAX_IMAGES} 张图片。`);
        return Upload.LIST_IGNORE;
      }

      setUploading(true);
      setError("");
      const tempId = `${file.uid}-uploading`;
      setFileList((current) => [
        ...current,
        {
          uid: tempId,
          name: file.name,
          status: "uploading",
          percent: 0,
        },
      ]);

      try {
        const result = await uploadProjectImage(file as File);
        setImageUrls((current) => [...current, result.imageUrl]);
        setFileList((current) =>
          current.map((item) =>
            item.uid === tempId
              ? {
                  ...item,
                  uid: result.imageUrl,
                  status: "done",
                  url: result.imageUrl,
                  percent: 100,
                }
              : item,
          ),
        );
      } catch (submissionError) {
        setFileList((current) => current.filter((item) => item.uid !== tempId));
        const messageText = submissionError instanceof Error ? submissionError.message : "图片上传失败。";
        setError(messageText);
        message.error(messageText);
      } finally {
        setUploading(false);
      }

      return Upload.LIST_IGNORE;
    },
    onRemove: (file) => {
      setFileList((current) => current.filter((item) => item.uid !== file.uid));
      setImageUrls((current) => current.filter((url) => url !== file.uid && url !== file.url));
      return true;
    },
  };

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 28,
          background: "linear-gradient(135deg, #091a33 0%, #102a43 42%, #1f4f7a 100%)",
          boxShadow: "0 28px 72px rgba(9,26,51,0.18)",
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Space direction="vertical" size={16}>
          <Text style={{ color: "#bae0ff", letterSpacing: "0.22em", textTransform: "uppercase" }}>Official Collection</Text>
          <Title level={1} style={{ margin: 0, color: "#f0f9ff" }}>
            创建官方收录项目
          </Title>
          <Paragraph style={{ margin: 0, color: "rgba(240,249,255,0.76)", fontSize: 16, lineHeight: 1.9, maxWidth: 840 }}>
            这里创建的平台官方收录项目默认归属 MakerHub 官方账号。现在可以直接在管理后台上传项目宣传图，不需要先准备图片 URL。
          </Paragraph>
        </Space>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <Card
            title="项目信息"
            bordered={false}
            style={{ borderRadius: 24, boxShadow: "0 20px 48px rgba(15,23,42,0.08)" }}
          >
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              {error ? <Alert type="error" showIcon message={error} /> : null}
              <Form<OfficialProjectFormValues>
                form={form}
                layout="vertical"
                initialValues={{ isOfficial: true }}
                onFinish={async (values) => {
                  setError("");
                  setCreated(null);

                  const tags = values.tags
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

                  if (tags.length === 0) {
                    setError("请至少填写一个标签。");
                    return;
                  }

                  if (imageUrls.length === 0) {
                    setError("请至少上传一张项目图片。");
                    return;
                  }

                  setPending(true);
                  try {
                    const project = await createOfficialProject({
                      title: values.title.trim(),
                      description: values.description.trim(),
                      projectUrl: values.projectUrl.trim(),
                      githubUrl: values.githubUrl?.trim() || null,
                      tags,
                      images: imageUrls,
                      isOfficial: values.isOfficial,
                    });
                    setCreated(project);
                    form.resetFields();
                    setFileList([]);
                    setImageUrls([]);
                    message.success("官方收录项目创建成功。");
                  } catch (submissionError) {
                    const messageText = submissionError instanceof Error ? submissionError.message : "创建项目失败。";
                    setError(messageText);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <Form.Item label="项目标题" name="title" rules={[{ required: true, message: "请输入项目标题。" }]}>
                  <Input size="large" placeholder="例如：MakerHub Curated Showcase" prefix={<RocketOutlined />} />
                </Form.Item>
                <Form.Item label="项目描述" name="description" rules={[{ required: true, message: "请输入项目描述。" }]}>
                  <Input.TextArea size="large" rows={6} placeholder="简要说明为什么这个项目值得被官方收录。" />
                </Form.Item>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="项目地址" name="projectUrl" rules={[{ required: true, message: "请输入项目地址。" }, { type: "url", message: "请输入有效的网址。" }]}>
                      <Input size="large" placeholder="https://example.com" prefix={<LinkOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="GitHub 地址" name="githubUrl" rules={[{ type: "url", message: "请输入有效的 GitHub 地址。" }]}>
                      <Input size="large" placeholder="https://github.com/example/repo" prefix={<LinkOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="标签" name="tags" rules={[{ required: true, message: "请输入至少一个标签。" }]}>
                  <Input size="large" placeholder="用逗号分隔，例如：AI, 创作者工具, Showcase" prefix={<TagsOutlined />} />
                </Form.Item>
                <Form.Item label="宣传图片">
                  <Dragger {...uploadProps} disabled={pending}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined style={{ color: "#1677ff" }} />
                    </p>
                    <p className="ant-upload-text">点击或拖拽上传项目图片</p>
                    <p className="ant-upload-hint">支持 JPG、PNG、WebP、GIF、AVIF，最多 3 张。图片会先上传，再用于创建官方收录项目。</p>
                  </Dragger>
                </Form.Item>
                <Form.Item label="官方收录标记" name="isOfficial" valuePropName="checked">
                  <Switch checkedChildren="官方收录" unCheckedChildren="普通项目" />
                </Form.Item>
                <Button type="primary" size="large" htmlType="submit" loading={pending} disabled={!canSubmit}>
                  创建官方收录项目
                </Button>
              </Form>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            <Card
              title="上传说明"
              bordered={false}
              style={{ borderRadius: 24, boxShadow: "0 16px 40px rgba(15,23,42,0.08)" }}
            >
              <Space direction="vertical" size={14}>
                <Space>
                  <PictureOutlined style={{ color: "#1677ff" }} />
                  <Text>后台支持直接上传宣传图，不再需要手动粘贴图片 URL。</Text>
                </Space>
                <Space>
                  <TagsOutlined style={{ color: "#1677ff" }} />
                  <Text>标签请用英文逗号分隔，系统会在后端去重并标准化。</Text>
                </Space>
                <Space>
                  <RocketOutlined style={{ color: "#1677ff" }} />
                  <Text>创建成功后项目默认归属 MakerHub 官方账号，并展示“官方收录”标记。</Text>
                </Space>
              </Space>
            </Card>
            {created ? (
              <Card
                title="创建成功"
                bordered={false}
                style={{
                  borderRadius: 24,
                  background: "linear-gradient(180deg, #f6ffed 0%, #ffffff 100%)",
                  boxShadow: "0 16px 40px rgba(82,196,26,0.12)",
                }}
              >
                <Space direction="vertical" size={10}>
                  <Text><Text strong>标题：</Text>{created.title}</Text>
                  <Text><Text strong>项目 ID：</Text>{created.id}</Text>
                  <Text><Text strong>归属：</Text>MakerHub 官方</Text>
                  <Text><Text strong>门户地址：</Text>/projects/{created.id}</Text>
                </Space>
              </Card>
            ) : null}
          </Space>
        </Col>
      </Row>
    </Space>
  );
}
