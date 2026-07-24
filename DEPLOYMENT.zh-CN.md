# 部署指南（中文）

本指南说明如何在 **单机 Linux 主机** 上，使用 Docker、本地磁盘持久化以及仓库中 `./deploy/` 下的已提交脚本，按 **规范运维流程** 部署这个博客。

## 规范命令

请只使用以下仓库内的规范入口：

- `./deploy/check.sh`
- `./deploy/init.sh`
- `./deploy/start.sh`
- `./deploy/stop.sh`
- `./deploy/update.sh`
- `./deploy/backup.sh`
- `./deploy/restore.sh`

这些脚本都使用同一个运行时环境文件：`deploy/.env.production`。

## 哪些会持久化，哪些是可丢弃的

会持久化的运维状态：

- `./data` —— SQLite 数据库，包括已保存的管理员密码哈希
- `./public/uploads` —— 通过 `/uploads/...` 提供访问的上传媒体文件

可丢弃的构件：

- Docker 镜像与容器
- 容器内的 Next.js 构建产物
- 任何可由 `docker compose up --build` 重新生成的内容

正常更新时，**不要删除** `./data` 或 `./public/uploads`。

## 主机前置条件

部署前请先安装：

- Docker Engine 与 Docker Compose 插件
- Node.js 与 `npm`
- `python3`
- `curl`

`./deploy/check.sh` 会在产生运行时改动前校验这些前置条件。

## 环境配置

先从示例文件创建运行时环境文件：

```bash
cp deploy/.env.production.example deploy/.env.production
```

需要设置以下变量：

| 变量                          | 必填         | 用途                           | 说明                                                          |
| ----------------------------- | ------------ | ------------------------------ | ------------------------------------------------------------- |
| `AUTH_SECRET`                 | 是           | 会话签名密钥                   | 不能是占位值，且至少 32 个字符                                |
| `NEXT_PUBLIC_SITE_URL`        | 是           | 站点公开访问地址               | 必须是没有路径的绝对 `http(s)` 来源                           |
| `SMTP_HOST`                   | 注册功能必填 | 验证码邮件服务器               | 例如邮箱服务商提供的 SMTP 主机                                |
| `SMTP_PORT`                   | 注册功能必填 | SMTP 端口                      | 通常为 `465` 或 `587`                                         |
| `SMTP_SECURE`                 | 注册功能必填 | 是否从连接开始使用 TLS         | 端口 `465` 通常设为 `true`                                    |
| `SMTP_REQUIRE_TLS`            | 注册功能建议 | 是否要求 STARTTLS              | 端口 `587` 通常设为 `true`                                    |
| `SMTP_USER` / `SMTP_PASSWORD` | 生产环境必填 | SMTP 登录凭据                  | 密码通常是邮箱授权码，不是网页登录密码                        |
| `SMTP_FROM`                   | 注册功能必填 | 发件人                         | 必须符合服务商允许的发件地址                                  |
| `NGINX_PORT`                  | 否           | 对外发布的 HTTP 端口           | 默认 `8080`；本任务验证也使用 `8080`                          |
| `WEREAD_API_KEY`              | 否           | 微信读书官方 Skill API Key     | 可选；配置后启用 `/admin/books` 和 `npm run sync:weread` 同步 |
| `WEREAD_SYNC_PROGRESS_LIMIT`  | 否           | 每次同步查询阅读进度的书籍上限 | 默认 `80`                                                     |
| `WEREAD_SYNC_DETAIL_LIMIT`    | 否           | 每次同步查询书籍详情的书籍上限 | 默认 `80`                                                     |
| `WEREAD_SYNC_HIGHLIGHTS`      | 否           | 是否同步划线文本内容           | 默认 `0`；只想同步进度和笔记数量时保持关闭                    |

`./deploy/check.sh` 会强制执行这些生产安全约束：

- 拒绝占位或过短的 `AUTH_SECRET`
- 拒绝格式错误的 `NEXT_PUBLIC_SITE_URL`
- 拒绝非法或特权 `NGINX_PORT`

## 邮箱注册与本地验证码收件箱

读者使用统一的无密码邮箱登录流程：提交邮箱后收到六位验证码；邮箱第一次验证成功时
创建账户，后续验证则登录已有账户。验证码有效期为 10 分钟，服务端只保存其哈希。

本地开发可以启用 Compose 中隔离的 Mailpit SMTP 收件箱：

```bash
docker compose --env-file deploy/.env.production --profile local-mail up -d
```

将 SMTP 配置指向 `mailpit:1025`，并设置
`SMTP_SECURE=false`、`SMTP_REQUIRE_TLS=false`。浏览器打开
`http://localhost:8025` 即可读取应用实际发出的验证码邮件。Mailpit 只绑定本机
`127.0.0.1`，不应作为生产邮件服务。

生产环境应改为邮箱服务商提供的 SMTP 主机、授权码和发件地址，并启用 TLS。
完成配置后，在 `/account/login` 输入一个可接收邮件的邮箱，确认邮件送达并完成登录。
`/daily` 及 `/uploads/daily/` 均要求有效的读者或管理员会话。

## 微信读书书架同步

前台 `/books` 页面读取本地 SQLite 快照。同步微信读书时：

1. 打开 [微信读书 Skill 页面](https://weread.qq.com/r/weread-skills)，登录后复制 `wrk-...` API Key。
2. 在 `deploy/.env.production` 中加入 `WEREAD_API_KEY=wrk-...`。
3. 使用 `./deploy/update.sh` 或 `docker compose --env-file deploy/.env.production up --no-build -d --force-recreate` 重启应用。
4. 打开 `/admin/books` 点击同步，或运行：

```bash
docker compose --env-file deploy/.env.production exec app npm run sync:weread
```

微信读书里的私密条目会带私密标记保存，并从公开书架中过滤。默认不同步划线正文；只有设置 `WEREAD_SYNC_HIGHLIGHTS=1` 时才会同步摘记文本。

## 在新 Linux 主机上首次部署

从一个干净的仓库检出开始：

```bash
cp deploy/.env.production.example deploy/.env.production
# 编辑 deploy/.env.production，填入安全配置
# 在资源充足的机器构建，或加载已经导出的 newblog-app 镜像
docker compose --env-file deploy/.env.production build app
./deploy/check.sh
./deploy/init.sh
./deploy/start.sh
```

对于配置较小的生产服务器，应在其他机器构建镜像，通过 `docker save` / `docker load`
传输后再执行上述三个部署脚本。脚本固定使用 `--no-build`，避免服务器部署过程中触发原生依赖编译。

各脚本的职责：

- `check.sh`：校验 Docker、环境变量以及持久化路径
- `init.sh`：先执行 `check.sh`，再在预构建应用镜像中运行迁移来创建/更新 `data/blog.db`
- `start.sh`：如果缺少初始化产物会拒绝启动，然后从预构建镜像拉起 compose 栈并等待就绪

在规范路径下，**不需要** 手动创建数据库，也不需要额外执行临时迁移命令。

## 部署后的验证

使用以下命令验证部署状态：

```bash
set -a; source deploy/.env.production; set +a
curl -i "http://localhost:${NGINX_PORT}/healthz"
curl -i "http://localhost:${NGINX_PORT}/"
curl -i "http://localhost:${NGINX_PORT}/robots.txt"
curl -i "http://localhost:${NGINX_PORT}/sitemap.xml"
curl -i "http://localhost:${NGINX_PORT}/api/admin/session"
docker compose --env-file deploy/.env.production ps
docker compose --env-file deploy/.env.production logs app nginx
```

期望结果：

- `/healthz` 只有在应用和数据库都准备好后才返回成功
- `/` 通过 nginx 返回真实的应用 HTML
- `/robots.txt` 与 `/sitemap.xml` 使用 `NEXT_PUBLIC_SITE_URL`
- `/api/admin/session` 在未登录时也应是“可访问到应用”的鉴权失败，而不是传输失败

## 日志与故障排查

查看状态与日志：

```bash
docker compose --env-file deploy/.env.production ps
docker compose --env-file deploy/.env.production logs app nginx
```

常见问题：

- **缺少 `deploy/.env.production`**  
  复制 `deploy/.env.production.example`，填入安全配置后重新执行 `./deploy/check.sh`。
- **环境变量校验失败**  
  `./deploy/check.sh` 会在一次运行中列出所有无效键；修正后重新执行。
- **对外端口冲突**  
  将 `NGINX_PORT` 改为可用端口，再执行 `./deploy/check.sh`。
- **启动时数据库文件不存在**  
  先运行 `./deploy/init.sh`，再运行 `./deploy/start.sh`。
- **就绪超时或栈处于不健康状态**  
  查看 `docker compose ... logs app nginx`；`start.sh` 的报错会给出准确日志命令。
- **恢复或迁移后缺少上传文件**  
  确认 `./public/uploads` 存在，并且备份/恢复使用的是规范脚本。

## 停止与更新

停止栈：

```bash
./deploy/stop.sh
```

更新到预构建的新镜像，同时保留已有持久化内容：

```bash
git pull
# 如果镜像在其他机器构建，请先加载与 APP_IMAGE 对应的镜像
./deploy/update.sh
```

`update.sh` 会重新执行初始化，并使用 `--no-build` 重启 compose 栈，同时保留 `./data` 和 `./public/uploads`。

## 备份与恢复

创建备份：

```bash
./deploy/backup.sh
```

该命令会在 `./data/backups/` 下生成一个带时间戳的归档，包含：

- `data/blog.db` 的 SQLite 一致性快照
- `public/uploads` 中的上传媒体
- 备份清单文件

SQLite 一致性说明：备份脚本会生成真正可恢复的 SQLite 快照，而不是只复制文件名，因此带 WAL 的数据库状态也可以恢复。

在一个空的替换工作区上恢复：

```bash
DEPLOY_RESTORE_ARCHIVE=./data/backups/<archive-name>.tar.gz ./deploy/restore.sh
./deploy/start.sh
```

恢复规则：

- 恢复要求持久化目标工作区是空的
- 归档内容缺失时会明确失败
- 恢复流程**不会**静默退化成一个全新的空站点

## 部署后或恢复后的管理员访问

后台与普通账户共用无密码邮箱验证码登录流程。只有数据库中角色为 `admin`
且状态正常的用户，验证邮箱后才会获得后台会话。系统不再支持用户名密码登录，
也不再需要对应的部署变量。

恢复备份后，管理员权限以恢复出来的 `users.role` 和 `users.status` 为准。
请同时确保 SMTP 配置可用，以便管理员重新接收登录验证码。

## 新主机快速检查清单

对于一台全新的运维主机，规范流程是：

```bash
cp deploy/.env.production.example deploy/.env.production
# 填入安全配置
./deploy/check.sh
./deploy/init.sh
./deploy/start.sh
curl -i http://localhost:8080/healthz
curl -i http://localhost:8080/
```

如果这些命令都通过，就说明你已经只依赖文档中列出的、已提交的规范部署入口，通过 nginx 成功启动了公开站点。
