# Marketing Digest

内部营销案例终稿发布与 POPO 推送工具。

## 本地启动

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:push
npm run dev
```

如果 `prisma db push` 在本机报 schema engine error，可以使用兜底 SQL 初始化：

```bash
npm run db:init
```

本地访问：

```text
http://localhost:3000
```

账号注册：

- 访问 `/register` 使用邀请码注册账号。
- 数据库为空时，首个注册账号会自动成为负责人。
- 后续注册账号默认为成员，可由负责人在后台 `用户` 页面调整角色或禁用。
- 邀请码配置在 `.env` 的 `REGISTRATION_CODE`。本地未配置时默认可使用 `marketingcase`。
- 如需临时关闭账号验证，可设置 `AUTH_DISABLED=true`。

## POPO 配置

在 `.env` 中填写：

```text
POPO_APP_KEY=""
POPO_APP_SECRET=""
POPO_BASE_URL="https://open.popo.netease.com"
APP_BASE_URL="https://your-domain.com"
POPO_CARD_TEMPLATE_UUID=""
POPO_CARD_CALLBACK_CONFIG_KEY=""
```

后台进入 `POPO 群` 页面，配置测试群和正式群的 `tid`。先执行连接检查，再发送测试消息。

文章正式推送使用 POPO `card`。需要先在 POPO 开发者后台创建卡片模板。模板发布后，进入后台 `卡片配置` 页面填写 `Template Series ID`、栏目标题、按钮文案、默认封面和列表条目数量。`POPO_CARD_TEMPLATE_UUID` 仍可作为首次启动时的兜底默认值。

列表条目数量支持 1-5 条。推荐日常流程是：每个案例作为一篇独立文章发布，再进入 `期数推送` 页面选择 1-5 篇文章组成一期。POPO 卡片底部按钮打开本期合集页，每个列表条目打开对应案例文章页。模板变量规范见：

[POPO 卡片模板说明](./docs/popo-card-template.md)

## Docker 部署

服务器上准备 `.env.docker`、`data/`、`public/uploads/` 后运行：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

线上容器内数据库路径建议使用：

```text
DATABASE_URL="file:../data/app.db"
```

建议用 Caddy 或 Nginx 在外层配置 HTTPS，并让 `APP_BASE_URL` 指向最终公网域名。

## 当前 MVP 能力

- 邀请码注册与邮箱密码登录
- 用户管理：负责人 / 普通成员两类角色、账号启用 / 禁用
- Word `.docx` 导入
- 纯文本投稿
- 内容块编辑：段落、小标题、图片、视频、引用、分割线
- 图片上传和图片 URL；图片内容块同时支持上传和 URL
- B 站、TikTok、YouTube 与 MP4 视频嵌入
- 文章编辑、发布、归档
- 随机 token 免登录阅读链接
- 每个案例独立阅读链接
- 1-5 个案例组成一期推送
- 本期合集阅读链接
- 推送卡片配置
- POPO 群配置
- POPO `card` 文章推送
- POPO `rich_text` 测试推送
- 推送日志
- 消息撤回
