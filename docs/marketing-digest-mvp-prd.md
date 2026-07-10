# 营销案例分享工具 MVP PRD 与技术方案

## 1. 背景

团队希望每 2-3 周收集并分享一批优秀创意营销案例，内容优先覆盖 PC / Console Game。分享形式希望接近微信公众号推文，用于小团队内部学习和讨论。

第一阶段的重点不是建设完整投稿协作系统，而是解决“终稿发布到内部平台”的问题：

- 成员可以提交完整稿件。
- 负责人可以编辑、发布、归档文章。
- 系统可以将文章摘要推送到 POPO 群。
- POPO 消息中提供阅读全文链接。

## 2. MVP 定位

MVP 是一个多人使用的内部内容发布后台：

```text
普通成员提交完整稿件
        ↓
负责人编辑与发布
        ↓
生成每个案例的独立阅读页
        ↓
负责人选择 1-5 个案例组成一期推送
        ↓
负责人手动正式推送到 POPO 群
        ↓
系统记录推送结果与错误日志
```

POPO 不承载完整长文，只承载摘要通知、每个案例的独立入口和本期合集入口。完整案例文章由工具生成独立阅读页，并长期归档。

## 3. 用户与权限

### 3.1 用户角色

MVP 只分两类角色：

| 角色 | 权限 |
| --- | --- |
| 普通成员 | 登录后台，提交完整稿件，查看自己提交的稿件状态 |
| 负责人 | 管理全部文章，编辑稿件，发布文章，配置 POPO 群，测试推送，正式推送，撤回消息，查看日志 |

### 3.2 登录方式

MVP 使用简单密码登录。

建议实现方式：

- 系统预置一个管理员密码。
- 普通成员可以使用共享投稿密码进入投稿界面。
- 负责人使用管理员密码进入管理后台。

后续如果接入公司统一登录，再替换为 SSO / LDAP / 企业邮箱登录。

## 4. MVP 功能范围

### 4.1 P0 范围

P0 必须完成：

- 简单密码登录
- 普通成员提交完整稿件
- 支持 Word `.docx` 上传导入
- 支持纯文本粘贴
- 支持结构化内容块编辑
- Word 导入时尽量保留标题、加粗、列表、链接、图片
- 支持本地图片上传
- 支持图片 URL
- 图片内容块同时支持上传和 URL；两者都填写时优先使用上传图片
- 支持 B 站、TikTok、YouTube 视频 iframe 嵌入
- 负责人编辑稿件
- 负责人发布文章
- 每个案例拥有独立随机 token 阅读链接
- 负责人可选择 1-5 个案例组成一期推送
- 本期推送拥有合集随机 token 阅读链接
- 文章长期归档
- 文章阅读页使用随机 token 免登录访问
- 封面图可选
- 摘要自动生成，负责人可修改
- 配置多个正式 POPO 群
- 配置一个测试 POPO 群
- 配置推送卡片模板 ID、栏目标题、按钮文案、默认封面和 1-5 条列表数量
- 手动测试推送
- 手动正式推送
- POPO `card` 文章推送
- POPO `rich_text` 测试推送
- 推送成功后保存 `msgId`
- 支持撤回已发送 POPO 消息
- 保存文章、推送记录、错误日志
- `appKey` / `appSecret` 通过环境变量配置
- 本机开发运行
- Docker Compose 部署到公网服务器

### 4.2 P1 范围

P1 可后续补充：

- 更复杂的 POPO 卡片样式编辑
- 定时推送
- 多负责人账号
- 更细的文章状态流转
- 推送前预览 POPO 消息
- 可见范围管理申请
- 一键生成长图或 PDF
- 更完整的 Word 样式兼容

### 4.3 P2 范围

P2 暂不进入 MVP：

- 案例素材投稿
- 案例库
- AI 辅助改写
- 阅读数据统计
- 评论与反馈
- 已读未读分析
- 自动抓取外部营销案例

## 5. 内容形态

### 5.1 稿件来源

普通成员提交的是完整稿件，不是半成品素材。

支持两种输入方式：

1. 上传 `.docx`
2. 粘贴纯文本

### 5.2 内容存储格式

建议后台统一保存为 HTML。

原因：

- Word 导入后需要尽量保留标题、加粗、列表、链接和图片。
- HTML 更适合直接渲染成微信公众号风格文章页。
- 纯文本可以转换成简单段落 HTML。
- POPO 推送摘要可以从 HTML 中提取纯文本。

### 5.3 图片处理

支持两类图片：

- 图片 URL
- 本地上传图片

本地上传图片存储在服务端 `uploads/` 目录。部署到公网服务器后，通过服务域名访问。

### 5.4 文章阅读页

文章阅读页使用随机 token 免登录访问，例如：

```text
https://your-domain.com/p/a8f3k2d9x7
```

后台管理页需要登录，文章阅读页不需要登录。

这样做的原因：

- POPO 群成员点击链接后可以直接阅读。
- 不需要所有读者都登录后台。
- 随机 token 避免文章列表被公开遍历。

## 6. 核心页面

### 6.1 登录页

路径建议：

```text
/login
```

功能：

- 输入密码
- 根据密码进入普通成员投稿界面或负责人后台

### 6.2 投稿页

路径建议：

```text
/submit
```

字段：

- 标题
- 作者 / 提交人
- 上传 Word 文件
- 或粘贴纯文本
- 可选封面图
- 可选补充说明

提交后状态为 `submitted`。

### 6.3 文章列表

路径建议：

```text
/admin/articles
```

字段：

- 标题
- 提交人
- 状态
- 创建时间
- 发布时间
- 最近推送时间

筛选：

- 全部
- 已提交
- 草稿
- 已发布
- 已推送
- 推送失败

### 6.4 文章编辑页

路径建议：

```text
/admin/articles/:id/edit
```

功能：

- 编辑标题
- 编辑摘要
- 编辑封面图
- 编辑正文 HTML
- 上传图片
- 保存草稿
- 发布
- 预览

### 6.5 文章预览页

路径建议：

```text
/admin/articles/:id/preview
```

功能：

- 模拟最终文章阅读页
- 展示标题、摘要、封面图、正文、发布时间
- 展示公开阅读链接

### 6.6 POPO 群配置页

路径建议：

```text
/admin/popo/channels
```

字段：

- 群名称
- 群 `tid`
- 类型：测试群 / 正式群
- 是否启用
- 最近一次测试结果

操作：

- 新增群
- 编辑群
- 测试连接
- 测试发送

### 6.7 推送页

路径建议：

```text
/admin/articles/:id/push
```

功能：

- 展示 POPO 推送摘要
- 选择测试群或正式群
- 发送测试消息
- 正式推送
- 显示推送结果
- 显示历史推送记录
- 对已发送消息执行撤回

### 6.8 日志页

路径建议：

```text
/admin/logs
```

功能：

- 查看推送日志
- 查看错误日志
- 按文章、群、错误码筛选

## 7. 文章状态

建议状态：

| 状态 | 含义 |
| --- | --- |
| `submitted` | 普通成员已提交，负责人未处理 |
| `draft` | 负责人编辑中 |
| `published` | 已生成公开阅读链接 |
| `pushed` | 已至少成功推送到一个正式群 |
| `push_failed` | 最近一次正式推送失败 |
| `archived` | 已归档 |

状态不需要复杂审批流。负责人可以直接从任意可编辑状态发布和推送。

## 8. POPO 接入方案

### 8.1 已确认接口

已确认需要使用的接口：

| 能力 | 接口 |
| --- | --- |
| 获取 accessToken | `POST /open-apis/robots/v1/token` |
| 刷新 accessToken | `POST /open-apis/robots/v1/token/refresh` |
| 发送消息 | `POST /open-apis/robots/v1/im/send-msg` |
| 查询群成员 | `GET /open-apis/robots/v1/team/{tid}/members` |
| 查询群信息 | `GET /open-apis/robots/v1/team/{tid}/info` |
| 撤回消息 | `POST /open-apis/robots/v1/im/{msgId}/recall` |
| 查询可见范围 | `POST /open-apis/robots/v1/view-scope` |

### 8.2 P0 推送类型

P0 正式文章推送使用 `card`，测试群连通性验证使用 `rich_text`。

原因：

- `card` 更接近内部平台原生卡片，适合承载封面、标题、条目和阅读全文入口。
- `rich_text` 保留为测试发送能力，便于在卡片模板未配置前验证机器人基础权限。

不建议将全文推送到 POPO：

- `text` 限 3000 字符。
- `rich_text` 带标签限 5000 字符。
- 三个以上案例的完整推文容易超限。
- POPO 更适合作为通知入口。

### 8.3 推送消息结构

卡片模板变量：

- `title`
- `summary`
- `articleUrl`
- `coverUrl`
- `itemList`
- `item1Title`
- `item2Title`
- `item3Title`
- `item4Title`

P0 不 `@所有人`，也不 `@指定成员`。

### 8.4 Token 策略

服务端维护 token 缓存：

```text
发送前检查 accessToken
        ↓
accessToken 有效：直接发送
        ↓
accessToken 即将过期：用 refreshToken 刷新
        ↓
refreshToken 过期或不可用：用 appKey/appSecret 重新获取
        ↓
发送接口返回 42001：刷新 token 后重试一次
        ↓
refresh 接口返回 42002：重新获取 token
```

注意：

- `appKey` 和 `appSecret` 只放服务端环境变量。
- 不把 token 暴露给前端。
- token 数据可以存在数据库或服务端缓存中。

### 8.5 推送前检查

P0 至少提供以下检查：

- token 是否可获取
- 测试群 `tid` 是否配置
- 正式群 `tid` 是否配置
- 能否查询目标群信息
- 能否发送测试消息

可选检查：

- 查询机器人可见范围
- 查询群成员

MVP 不自动修改机器人可见范围，只显示检测结果和错误提示。

### 8.6 撤回消息

正式推送成功后保存：

- `msgId`
- `receiver`
- `sessionType = 3`

撤回时调用：

```http
POST /open-apis/robots/v1/im/{msgId}/recall
```

请求体：

```json
{
  "sessionId": "群 tid",
  "sessionType": 3
}
```

撤回结果写入推送记录。

## 9. 错误处理

### 9.1 常见 POPO 错误

| 错误码 | 含义 | 处理 |
| --- | --- | --- |
| `42001` | accessToken 过期 | 刷新 token 后重试一次 |
| `42002` | refreshToken 过期 | 重新获取 token |
| `51709` | 当前机器人无权调用该接口 | 检查接口权限；若 `send-msg` 成功但群信息查询失败，可先以测试发送结果为准 |
| `65338` | 消息过长 | 缩短摘要 |
| `65341` | 接收方不是 POPO 用户 | 检查 receiver |
| `65347` | 机器人没有接口权限 | 提示检查开发者后台权限 |
| `65610` | 请求报文解析失败 | 记录 payload 摘要，提示格式错误 |
| `65611` | 接收方无法找到 | 检查群 tid |
| `65612` | 不在机器人可见范围内 | 提示检查可见范围和发布状态 |
| `65614` | 机器人不在线 | 检查机器人是否已发布、在线、加入目标群，并确认机器人状态正常 |

### 9.2 前台提示

推送失败时后台显示：

- 错误码
- 错误信息
- 目标群
- 发生时间
- 是否已自动重试
- 建议处理方式

### 9.3 日志保存

保存三类日志：

- 文章操作日志
- 推送记录
- 错误日志

MVP 不需要单独通知某个人。

## 10. 数据模型

### 10.1 User

```text
id
name
role: owner | member
createdAt
updatedAt
```

MVP 如果使用共享密码，可以不做完整用户表，但建议保留提交人字段。

### 10.2 Article

```text
id
title
summary
coverImageUrl
contentHtml
status
publicToken
submittedBy
sourceType: docx | text
sourceFilePath
publishedAt
createdAt
updatedAt
```

### 10.3 ArticleAsset

```text
id
articleId
type: image | source_docx
fileName
filePath
publicUrl
createdAt
```

### 10.4 PopoChannel

```text
id
name
receiverTid
channelType: test | production
enabled
lastCheckedAt
lastCheckStatus
createdAt
updatedAt
```

### 10.5 PushLog

```text
id
articleId
channelId
receiverTid
msgType: rich_text
msgId
status: success | failed | recalled
errcode
errmsg
requestSummary
retryCount
pushedAt
recalledAt
createdAt
```

### 10.6 ErrorLog

```text
id
scope: auth | import | upload | push | recall | system
message
details
createdAt
```

### 10.7 PopoToken

```text
id
accessToken
accessExpiredAt
refreshToken
refreshExpiredAt
updatedAt
```

也可以不建表，先存服务端缓存。但为了 Docker 重启后少请求 token，建议入库。

## 11. 技术方案

### 11.1 推荐技术栈

| 模块 | 技术 |
| --- | --- |
| Web 框架 | Next.js |
| 数据库 | SQLite |
| ORM | Prisma |
| Word 导入 | Mammoth.js |
| 富文本编辑 | Tiptap |
| 图片存储 | 本地 `uploads/` |
| 部署 | Docker Compose |
| HTTPS / 反向代理 | Caddy 或 Nginx |

### 11.2 为什么用 Next.js

- 前后端一体，适合小型内部工具。
- 可以快速实现管理后台和公开文章页。
- API Route / Server Action 足够承载 POPO 接口调用。
- 后续 Docker 部署简单。

### 11.3 为什么用 SQLite

- MVP 数据量小。
- 部署简单。
- Docker 挂载一个数据目录即可持久化。
- 后续如果需要多人高并发或更复杂查询，可以迁移到 PostgreSQL。

### 11.4 Word 导入

使用 Mammoth.js 将 `.docx` 转换为 HTML。

注意：

- Mammoth.js 更擅长语义转换，不保证完全还原 Word 版式。
- 标题、段落、列表、加粗、链接通常可以保留。
- 图片需要在导入时提取并保存到 `uploads/`。
- 导入后负责人可以在编辑器里二次调整。

## 12. 部署方案

### 12.1 本机开发

本机运行：

```bash
npm install
npm run dev
```

本地访问：

```text
http://localhost:3000
```

注意：本地 `localhost` 链接只能你自己访问，POPO 群成员无法访问。

### 12.2 服务器部署

正式部署使用 Docker Compose。

建议目录：

```text
/opt/marketing-digest/
  docker-compose.yml
  .env
  data/
  uploads/
```

`.env` 包含：

```text
APP_BASE_URL=https://your-domain.com
APP_ADMIN_PASSWORD=...
APP_MEMBER_PASSWORD=...
POPO_APP_KEY=...
POPO_APP_SECRET=...
DATABASE_URL=file:../data/app.db
```

对外文章链接使用：

```text
${APP_BASE_URL}/p/:publicToken
```

### 12.3 Docker Compose

MVP 可以先只包含一个应用服务：

```text
app
```

数据库文件和上传文件通过 volume 持久化。

后续如果需要，可以增加：

- `caddy`
- `postgres`
- `backup`

## 13. 安全约束

P0 至少保证：

- 管理后台需要密码。
- 公开文章页只通过随机 token 访问。
- `appKey` / `appSecret` 不进入前端。
- 上传文件限制类型和大小。
- 文章正文渲染前做 HTML 清洗，避免 XSS。
- POPO 请求日志不记录完整 token。

建议限制上传类型：

- `.docx`
- `.png`
- `.jpg`
- `.jpeg`
- `.gif`
- `.webp`

## 14. 开发里程碑

### Milestone 1: 基础框架

- Next.js 项目初始化
- Prisma + SQLite
- 简单登录
- 基础布局
- Dockerfile + Docker Compose

### Milestone 2: 文章提交与编辑

- 投稿页
- 纯文本提交
- `.docx` 上传导入
- 图片提取与上传
- 负责人文章列表
- 文章编辑与预览

### Milestone 3: 发布与公开阅读

- 文章发布
- 随机 token 阅读链接
- 微信公众号风格文章页
- 文章归档

### Milestone 4: POPO 推送

- token 获取与刷新
- POPO 群配置
- 测试群推送
- 正式群推送
- 推送日志
- 错误处理

### Milestone 5: 撤回与部署

- 消息撤回
- 服务器 Docker Compose 部署
- HTTPS 配置
- 基础验收测试

## 15. 验收标准

P0 验收时至少满足：

- 普通成员能登录并提交 `.docx` 稿件。
- `.docx` 中的标题、列表、加粗、图片可以基本导入。
- 负责人能编辑导入后的文章。
- 负责人能发布文章并获得免登录阅读链接。
- 手机或电脑 POPO 客户端打开阅读链接可正常访问。
- 负责人能向测试群发送 `rich_text` 推送。
- 负责人能向至少一个正式群发送 `rich_text` 推送。
- 推送成功后系统保存 `msgId`。
- 已发送消息可以撤回。
- 推送失败时后台显示错误码和错误信息。
- Docker Compose 部署后数据和上传文件可以持久化。

## 16. 当前待确认项

开发前仍需确认：

- 第一个测试群 `tid`
- 第一个正式群 `tid`
- POPO 机器人是否已开通 `send-msg` 权限
- 机器人是否在目标群可见范围内
- 公网服务器域名
- 是否已有 HTTPS 证书或反向代理
- 上传文件大小上限
