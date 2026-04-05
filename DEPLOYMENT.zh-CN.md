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

| 变量 | 必填 | 用途 | 说明 |
| --- | --- | --- | --- |
| `AUTH_SECRET` | 是 | 会话签名密钥 | 不能是占位值，且至少 32 个字符 |
| `ADMIN_USERNAME` | 是 | 管理员登录用户名 | 避免使用 `admin` 之类的弱默认值 |
| `ADMIN_PASSWORD` | 是 | 首次运行时的管理员密码种子 | 必须足够强；仅在数据库里还没有保存密码哈希时才会生效 |
| `NEXT_PUBLIC_SITE_URL` | 是 | 站点公开访问地址 | 必须是没有路径的绝对 `http(s)` 来源 |
| `NGINX_PORT` | 否 | 对外发布的 HTTP 端口 | 默认 `8080`；本任务验证也使用 `8080` |

`./deploy/check.sh` 会强制执行这些生产安全约束：

- 拒绝占位或过短的 `AUTH_SECRET`
- 拒绝弱 `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- 拒绝格式错误的 `NEXT_PUBLIC_SITE_URL`
- 拒绝非法或特权 `NGINX_PORT`

## 在新 Linux 主机上首次部署

从一个干净的仓库检出开始：

```bash
cp deploy/.env.production.example deploy/.env.production
# 编辑 deploy/.env.production，填入安全配置
./deploy/check.sh
./deploy/init.sh
./deploy/start.sh
```

各脚本的职责：

- `check.sh`：校验前置依赖、环境变量、本地原生依赖可用性以及持久化路径
- `init.sh`：先执行 `check.sh`，再以幂等方式准备持久化目录，并运行迁移来创建/更新 `data/blog.db`
- `start.sh`：如果缺少初始化产物会拒绝启动，然后拉起 compose 栈并等待就绪

在规范路径下，**不需要** 手动创建数据库，也不需要额外执行临时迁移命令。

## 部署后的验证

使用以下命令验证部署状态：

```bash
curl -i http://localhost:8080/healthz
curl -i http://localhost:8080/
curl -i http://localhost:8080/robots.txt
curl -i http://localhost:8080/sitemap.xml
curl -i http://localhost:8080/api/admin/session
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
  将 `NGINX_PORT` 改为可用的非特权端口，再执行 `./deploy/check.sh`。
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

更新到新代码，同时保留已有持久化内容：

```bash
git pull
./deploy/update.sh
```

`update.sh` 会重新执行初始化，并重建/重启 compose 栈，同时保留 `./data` 和 `./public/uploads`。

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

## 部署后或恢复后的管理员凭据行为

`ADMIN_PASSWORD` **不是** 持续生效的“运行时权威密码”。

行为规则：

- 在首次初始化/登录流程中，如果数据库里还没有管理员密码哈希，应用会对 `ADMIN_PASSWORD` 做哈希并写入 `./data/blog.db`
- 从那之后，以数据库中已持久化的密码哈希为准
- 备份恢复后，管理员认证遵循恢复出来的数据库哈希，而不是你后来改过的 `ADMIN_PASSWORD`

运维含义：

- 修改 `deploy/.env.production` 中的 `ADMIN_PASSWORD`，**不会** 重置已经完成初始化或已经恢复出来的管理员密码
- 如果你把备份恢复到一台替换主机上，应继续使用与恢复后数据库状态匹配的密码；如果要改密码，应走应用内/管理员侧正式的凭据重置流程

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
