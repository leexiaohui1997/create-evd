# Docker 化的全栈开发与生产框架

Nginx + EggJS(TypeScript) + MySQL + Redis + Vite/Vue3(TypeScript) 的一体化示例工程，提供可开箱即用的开发与生产环境编排。

核心特性：
- 统一入口：开发 `http://localhost:__DEV_PORT__`，生产 `http://localhost:__PROD_PORT__`
- 反向代理：`/api/*` 走后端 Egg，其他请求走前端/HMR 或静态文件
- 健康检查：`/api/health` 返回应用、数据库、Redis 与版本信息
- 数据持久化：MySQL 与 Redis 挂载到本地 `./data` 目录
- 跨架构：MySQL 指定 `platform: linux/arm64/v8`，兼容 Apple Silicon

## 目录结构
- `backend/`：后端 EggJS（TypeScript），集成 Sequelize、Redis
- `frontend/`：前端 Vite/Vue3（TypeScript + SCSS）
- `nginx/`：Nginx 配置（`dev.conf`、`prod.conf`）
- `data/mysql/`、`data/redis/`：数据库与缓存数据卷（持久化）
- `.env`、`.env.prod`：根目录环境变量文件（开发/生产）
- `docker-compose.dev.yml`、`docker-compose.prod.yml`：Compose 编排文件
- `VERSION`：版本号文件（后端健康检查读取）

## 端口与路由
- 开发环境入口：`http://localhost:__DEV_PORT__`
  - `/api/*` 代理到后端 `backend:7001`
  - 其余请求代理到前端开发服务器 `frontend:5173`（支持 HMR）
- 生产环境入口：`http://localhost:__PROD_PORT__`
  - Nginx 容器监听 `8080`，宿主机映射 `__PROD_PORT__:8080`
  - `/api/*` 代理到后端 `backend:7001`
  - 非 `/api` 请求由 Nginx 直接提供打包静态资源（含 SPA fallback）

## 环境要求
- 安装 Docker 与 Docker Compose
- macOS/Apple Silicon：已在 MySQL 服务设置 `platform: linux/arm64/v8`

## 环境变量
在项目根目录维护两套环境：
- `.env`（开发）：
  - `NODE_ENV=development`
  - `MYSQL_ROOT_PASSWORD`
  - `MYSQL_DATABASE=app_db`
  - `MYSQL_USER=app_user`
  - `MYSQL_PASSWORD`
  - `REDIS_PASSWORD`
- `.env.prod`（生产）：
  - `NODE_ENV=production`
  - `MYSQL_ROOT_PASSWORD`
  - `MYSQL_DATABASE=app_db`
  - `MYSQL_USER=app_user`
  - `MYSQL_PASSWORD`
  - `REDIS_PASSWORD`

后端读取的环境变量键为 `MYSQL_*` 与 `REDIS_*`（见 `backend/config/config.default.ts`）。版本号由 `VERSION` 文件提供，健康检查会返回该版本号。

## 快速开始（开发）
- 填写根目录 `.env`
- 启动：
  - `docker compose -f docker-compose.dev.yml up -d`
- 首次启动需等待 MySQL 初始化，随后打开：
  - `http://localhost:__DEV_PORT__`（前端页面）
  - `http://localhost:__DEV_PORT__/api/health`（后端健康检查）
- 查看日志：
  - `docker compose -f docker-compose.dev.yml logs -f backend`
  - `docker compose -f docker-compose.dev.yml logs -f nginx`
- 关闭并清理容器（保留数据卷）：
  - `docker compose -f docker-compose.dev.yml down`

说明：
- 开发环境通过 Nginx 将 `/api` 代理到后端，其他请求代理到前端 Vite（HMR 生效）
- `VERSION` 在开发中挂载到后端容器 `/app/VERSION`，健康检查会返回其内容

## 快速开始（生产）
- 填写根目录 `.env.prod`
- 构建并启动：
  - `docker compose -f docker-compose.prod.yml up -d --build`
- 访问：
  - `http://localhost:__PROD_PORT__`（首页与静态资源由 Nginx 提供）
  - `http://localhost:__PROD_PORT__/api/health`（健康检查，返回版本号与依赖状态）
- 查看日志与健康状态：
  - `docker compose -f docker-compose.prod.yml ps`
  - `docker compose -f docker-compose.prod.yml logs -f backend`
  - `docker compose -f docker-compose.prod.yml logs -f nginx`
- 关闭并清理容器（保留数据卷）：
  - `docker compose -f docker-compose.prod.yml down`

说明：
- 生产后端以前台方式运行，容器健康检查通过 `curl http://localhost:7001/api/health`
- `frontend` 构建容器会将打包产物复制到命名卷 `frontend_dist`，Nginx 直接挂载该卷到 `/usr/share/nginx/html`
- `VERSION` 在生产中挂载到后端容器 `/app/dist/VERSION`，健康检查会读取并返回版本号

## 常见问题
- MySQL 首次启动较慢：请等待初始化完成后再连接（查看 `mysql` 日志）
- 修改端口：
  - 生成时优先使用 CLI：`--dev-port` 与 `--prod-port` 指定宿主机端口。
  - 开发：在 `nginx/dev.conf` 修改 `listen`，并更新 `docker-compose.dev.yml` 的 `ports`（示例：`'__DEV_PORT__:8080'`）。
  - 生产：在 `nginx/prod.conf` 与 `docker-compose.prod.yml` 中调整宿主机端口映射（示例：`'__PROD_PORT__:8080'`）。
- 数据重置：
  - 停止容器后，删除本地 `./data/mysql` 与 `./data/redis` 目录（谨慎操作，会丢失数据）

## 健康检查与版本
- 接口：`GET /api/health`
- 返回示例：
  - `{ "app": "ok", "db": "ok", "redis": "ok", "version": "__APP_VERSION__", "timestamp": "..." }`
- 版本来源：后端在 `app.baseDir` 下读取 `VERSION` 文件（开发 `/app/VERSION`，生产 `/app/dist/VERSION`）

## 代码与构建要点
- 后端 Docker 构建：
  - `pnpm build` 生成到 `dist/`
  - 将 `package.json` 与 `VERSION` 复制到 `dist/`，保证运行时代码可读取版本号
  - 生产启动命令：`npx egg-scripts start --title=egg-backend --port=7001 --baseDir=/app/dist`
- Nginx 配置：
  - 开发：`nginx/dev.conf` 将非 `/api` 的请求代理到 `frontend:5173`（HMR）
  - 生产：`nginx/prod.conf` 直接提供静态资源，并为 SPA 提供 `index.html` 回退

## 清理与维护
- 停止并移除容器（不删数据卷）：
  - 开发：`docker compose -f docker-compose.dev.yml down`
  - 生产：`docker compose -f docker-compose.prod.yml down`
- 完全清理数据（谨慎）：删除 `./data/mysql` 与 `./data/redis`

## 备注
- Compose 文件已使用无 `version:` 的新语法，兼容较新的 Docker Compose 版本
- 如需 CI/CD、数据库迁移、非 root 用户运行等增强，可按需扩展（当前框架可直接进行业务开发）
- `.env.prod`（生产）：
  - `NODE_ENV=production`
  - 与开发类似，但使用更强的密码

代码通过 `process.env` 读取这些变量，请勿将真实生产密码提交到版本库。

## 服务与端口
- Nginx：容器内监听 `8080`，宿主机端口（开发/生产）分别为 `__DEV_PORT__` / `__PROD_PORT__`
- Egg 后端：`7001`
- Vite 前端（开发）：`5173`
- MySQL：容器内 `3306`（仅内部网络访问）
- Redis：容器内 `6379`（仅内部网络访问）

## 开发环境启动
1. 准备环境变量：确认并修改 `.env` 中的密码与设置
2. 启动：
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
3. 访问：
   - 前端首页：`http://localhost:8080/`
   - 健康检查：`http://localhost:8080/api/health`
   - 前端将通过相对路径请求接口（`/api/...`），支持 HMR 热更新

## 生产环境构建与启动
1. 准备环境变量：确认并修改 `.env.prod`
2. 构建前端产物（一次性容器执行）：
  ```bash
  docker compose -f docker-compose.prod.yml run --rm frontend
  ```
3. 启动服务：
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build
  ```
4. 访问：
  - 首页与静态资源由 Nginx 直接提供：`http://localhost:__PROD_PORT__/`
  - 接口仍通过 Nginx 代理到后端：`http://localhost:__PROD_PORT__/api/*`
  - Nginx 对非 `/api` 的路径做 SPA fallback 到 `index.html`

## 健康检查与示例接口
- `GET /api/health`：返回应用状态、数据库连接（Sequelize `authenticate()`）、Redis 状态（`PING`）、版本与时间戳
- `GET /api/example`：示例 JSON 接口

## 数据持久化
- MySQL：`./data/mysql:/var/lib/mysql`
- Redis：`./data/redis:/data`

## 常见问题
- Apple Silicon 兼容：确保 Compose 指定 MySQL `platform: linux/arm64/v8`
- 端口冲突：确认宿主机未占用 `8080`、`5173`、`7001`
- 权限问题：macOS 下首次挂载数据卷可能需手动创建 `./data/mysql` 与 `./data/redis`
- 密码修改：更新 `.env`/`.env.prod` 后需重启相关容器

## 备注
后续可增：数据库迁移工具（`sequelize-cli` 或 `umzug`）、Nginx 安全头与压缩、CI/CD 流程等。
## 占位符与生成参数说明
- `__APP_NAME__`：应用名。由 CLI 生成时设置（参数 `appName`），用于容器、镜像、包名等。
- `__DEV_PORT__`：开发入口宿主机端口。由 `--dev-port` 设置，默认 `8080`。
- `__PROD_PORT__`：生产入口宿主机端口。由 `--prod-port` 设置，默认 `8081`。
- `__APP_VERSION__`：版本号示例文本。由 `--version` 设置，默认 `0.1.0`，写入 `VERSION` 文件并用于 README 示例。

生成后，这些占位符会被自动替换为你的配置值；如需再次调整端口，可参考下方“修改端口”说明或重新生成项目。