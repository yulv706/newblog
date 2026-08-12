# 读写札记 / NewBlog

一个面向个人记录与分享的博客系统，包含博客文章、日常、书架、游戏档案、评论、邮箱登录，以及与 Hermes Agent 配合的受控管理接口。

## 功能概览

- 博客文章：Markdown 正文、分类标签、封面、目录、评论审核与 RSS。
- 日常：适合短记录和图片分享；登录后可见，支持 Markdown、话题和图片。
- 书架：微信读书同步、阅读进度、书摘、感想、分页筛选和阅读统计。
- 游戏：Steam 游戏库同步、游玩时长、最近启动、封面和个人评价；登录后可见。
- 账户：邮箱验证码注册和登录，管理员账号可进入后台管理。
- 私笺：仅管理员可见的想法、目标和计划，不出现在公开导航、搜索、RSS 或站点地图中。
- Hermes：通过私有 Docker 网络中的 MCP 桥接器管理博客内容和私笺，不授予 Shell、Docker 或数据库直连权限。
- 主动通知：邮件作为可靠主通道，微信 iLink 作为有界的尽力推送；支持注册通知、阅读汇报、晚间推荐和服务健康告警。

## 技术栈

- Next.js App Router、React、TypeScript、Tailwind CSS、Motion
- SQLite、Drizzle ORM、better-sqlite3
- Docker Compose、Nginx、systemd 定时任务
- Hermes Agent MCP bridge、Python host-side notification jobs

## 快速开始

### 本地开发

需要 Node.js 20+。安装依赖后启动开发服务器：

```bash
npm ci
npm run dev
```

本地环境变量放在 `.env.local`，可参考 `deploy/.env.production.example`。至少需要设置一个随机的 `AUTH_SECRET`；邮箱验证码和 Steam、微信读书同步属于可选集成。

### Docker 本地部署

```bash
cp deploy/.env.production.example deploy/.env.production
# 编辑 deploy/.env.production，至少填写 AUTH_SECRET、NEXT_PUBLIC_SITE_URL
./deploy/init.sh
docker compose --env-file deploy/.env.production up -d --build
```

Windows PowerShell 可使用：

```powershell
Copy-Item deploy/.env.production.example deploy/.env.production
# 编辑 deploy/.env.production 后执行
bash ./deploy/init.sh
docker compose --env-file deploy/.env.production up -d --build
```

默认应用监听 `3000`，Nginx 使用 `NGINX_PORT` 和 `NGINX_SSL_PORT`。生产更新优先使用版本化镜像和 `deploy/update.sh`，不要删除 `data/` 或 `public/uploads/`。

### 运行检查

```bash
npm run version:check
npm run typecheck
npm test
python -m unittest discover -s scripts/tests -p 'test_*.py'
```

## Hermes 集成

完整的 Hermes 适配由以下文件组成：

- [`docs/management-api.md`](docs/management-api.md)：管理 API、权限边界、网络和定时任务说明。
- [`integrations/hermes/blog_manager_mcp.py`](integrations/hermes/blog_manager_mcp.py)：带类型校验、幂等和并发保护的 MCP bridge。
- [`integrations/hermes/SKILL.md`](integrations/hermes/SKILL.md)：Hermes 的内容管理规则，包含管理员私笺操作。
- [`docs/hermes-blog-manual.zh-CN.md`](docs/hermes-blog-manual.zh-CN.md)：博客管理使用手册。
- [`docs/hermes-weixin-manual.zh-CN.md`](docs/hermes-weixin-manual.zh-CN.md)：微信端会话和常用指令手册。

Hermes 与博客容器应加入同一个私有 Docker 网络，并使用 Docker DNS 访问：

```text
BLOG_MANAGEMENT_API_URL=http://blog-app:3000/api/management/v1
BLOG_MANAGEMENT_API_TOKEN=<随机生成且至少 32 个字符的令牌>
BLOG_PRIVATE_NOTES_API_TOKEN=<另一个随机生成且至少 32 个字符的令牌>
BLOG_MANAGEMENT_API_ACTOR=hermes-weixin
BLOG_MANAGEMENT_MEDIA_ROOT=/opt/data
```

公开 Nginx 会故意拒绝 `/api/management/`，避免管理 API 暴露到互联网。管理令牌只放在博客和 Hermes 的运行时环境文件中，永远不要写入 Git、文章、截图、日志或 Issue。生成令牌可以使用：

```bash
openssl rand -hex 32
```

Hermes 的操作权限很高，但能力被限制在管理 API 的资源范围内。删除、权限变更和批量修改仍要求明确确认；管理员私笺使用独立令牌和独立工具集合。

## 生产定时任务

`deploy/systemd/` 提供以下单位文件：

- 微信读书和书架同步
- Steam 游戏库同步
- 每日 18:00 阅读汇报
- 每日 23:00 晚间句子或书籍推荐
- 新用户注册通知
- 服务健康检查和状态告警

时间均按服务器配置的时区运行，阅读任务的示例配置以 `Asia/Shanghai` 为准。邮件投递必须先成功，微信推送只做有限重试，不会因为 iLink 限流阻断主任务。

## 数据与安全

以下内容只应保留在部署机器或个人本地，不应提交：

- `deploy/.env.production`、`.env*`
- `certs/` 中的证书和私钥
- `data/` 中的 SQLite 数据库、备份和健康状态
- `public/uploads/` 中的个人图片
- `work/`、`SERVER_OPERATIONS.md` 等个人工作资料

发布前请轮换曾经在聊天、截图或临时文件中出现过的 API Key、SMTP 授权码、管理令牌、Steam Key 和服务器凭据。安全问题请参考 [`SECURITY.md`](SECURITY.md)。

## 目录结构

```text
src/                     Next.js 页面、组件、Server Actions 和 API
src/lib/db/              Drizzle schema、SQLite 连接和迁移
deploy/                  Docker、Nginx、初始化和 systemd 部署文件
scripts/                 同步、通知、健康检查和迁移脚本
integrations/hermes/     Hermes MCP bridge 与管理 skill
docs/                    运维、管理 API 和 Hermes 手册
public/uploads/          运行时用户媒体目录
```

## 许可证

本项目以 MIT License 发布，详见 [`LICENSE`](LICENSE)。个人内容、数据库、上传媒体和运行时凭据不属于源码发布内容。
