# create-evd

Egg + Vue + Docker 脚手架初始化器（`npm create evd`）。

## 用法

- 非交互：
  - `npm create evd@latest my-app -- --dev-port 8080 --prod-port 8081 --version 1.0.0`
- 交互式：
  - `npm create evd@latest` 后根据提示填写应用名、端口、版本等

说明：支持将 `appName` 设为 `'.'`，在当前目录生成脚手架。

## 参数说明

- `--dev-port <number>`：开发环境宿主机端口，默认 `8080`
- `--prod-port <number>`：生产环境宿主机端口，默认 `8081`
- `--version <string>`：初始化版本号，默认 `0.1.0`（会写入生成项目的 `VERSION` 文件，同时在模板 README 中展示）
- `--mysql-platform <string>`：MySQL 容器平台（例如：`linux/arm64/v8`，Apple Silicon 推荐设置）
- `--git`：生成后初始化 git 仓库并提交初始代码
- `--force`：目标目录非空时直接覆盖（否则会交互确认）

## 生成内容

- 优先使用本包的内部模板目录 `template/`；
- 若不存在内部模板，则从当前仓库中复制必要路径（`backend/`、`frontend/`、`nginx/`、`docker-compose.*.yml`、`README.md`），并执行名称、端口、容器/镜像名等替换。

## 占位符与替换

- `__APP_NAME__`：应用名（用于容器名、镜像名等）
- `__DEV_PORT__`：开发环境宿主机端口（Nginx 宿主机端口映射）
- `__PROD_PORT__`：生产环境宿主机端口（Nginx 宿主机端口映射）
- `__APP_VERSION__`：版本展示（模板 README 中的示例版本）

Nginx 在容器内统一监听 `8080`，宿主机的映射端口由 `--dev-port`/`--prod-port` 决定。

## 快速开始

生成项目后可按以下方式启动：

- 开发环境：
  - `docker compose -f docker-compose.dev.yml up -d`
  - 访问：`http://localhost:__DEV_PORT__`
- 生产环境：
  - `docker compose -f docker-compose.prod.yml build`
  - `docker compose -f docker-compose.prod.yml up -d`
  - 访问：`http://localhost:__PROD_PORT__`

## 常见问题

- 端口占用：若 `__DEV_PORT__` 或 `__PROD_PORT__` 已被占用，请在相应的 `docker-compose.*.yml` 中调整映射值，并在模板 README 指引下更新访问地址说明。
- Apple Silicon：在 M 系列芯片上建议设置 `--mysql-platform linux/arm64/v8`，以避免 MySQL 镜像架构不兼容导致的启动问题。
- 版本文件：生成项目根目录会写入 `VERSION` 文件，同时生产环境后端容器会挂载该文件到 `/app/dist/VERSION`。
- Node 版本：要求 `Node >= 18`。

## 注意事项

- 模板 README 会根据参数自动替换应用名、端口与版本示例；旧模板（若存在）中的固定端口或 `demo-` 前缀也会进行兼容性替换。
- 使用 `--git` 可在生成后自动初始化仓库并提交一次初始代码；若执行失败会跳过且不影响脚手架生成。

## GitHub 配置

- CI 工作流：已在 `.github/workflows/ci.yml` 中配置，触发于 Push/PR，到 Node 18/20 上进行依赖安装与 TypeScript 构建。
- NPM 发布：已在 `.github/workflows/publish.yml` 中配置，支持 `workflow_dispatch` 与推送 `v*.*.*` Tag 触发。需在仓库 `Settings → Secrets and variables → Actions` 添加 `NPM_TOKEN` 才能发布。
- Dependabot：已在 `.github/dependabot.yml` 中启用，按周检查 `npm` 与 `github-actions` 更新，并自动创建 PR。
- Issue/PR 模板：位于 `.github/ISSUE_TEMPLATE/*` 与 `.github/pull_request_template.md`，用于规范问题与变更描述。
- CODEOWNERS：位于 `.github/CODEOWNERS`，请将 `@your-github-username` 替换为你的实际用户名或团队，便于审阅与保护分支策略。