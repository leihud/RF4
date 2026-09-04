# 俄罗斯钓鱼4 装备搭配计算器（RF4）

俄罗斯钓鱼4（Russian Fishing 4）装备搭配方案计算与分享工具。前端为 Vue 3 + Vite 单页应用，部署于 Cloudflare Pages，数据层使用 D1（SQLite）与 Pages Functions。

## 技术栈

- 前端：Vue 3（Options API）、Vite、Vitest
- 后端：Cloudflare Pages Functions + D1
- 质量门禁：ESLint（flat config）+ Vitest + GitHub Actions

## 本地开发

```bash
npm install
npm run hooks:install   # 安装 git hooks（push 时自动更新版本号）
npm run dev             # 启动 Vite 开发服务器
```

需要访问 `/api/*` 时使用本地模拟：

```bash
npm run dev:api         # 本地模拟 Pages Functions（需先配置 .dev.vars）
```

`wrangler.toml` 中已声明 D1 数据库绑定 `DB`。本地联调依赖：
- `ADMIN_PASSWORD`：管理密码（.dev.vars）
- `DEV_PASSWORD`：开发模式管理密码（.dev.vars，dev 环境由代码设定）

首次开发需要同步数据库结构：

```bash
npx wrangler d1 migrations apply rf4-db --local
```

## 命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm test` | 运行全部单元测试（Vitest） |
| `npm run lint` | ESLint 静态检查（src 与 tests） |
| `npm run build` | 生产构建 |
| `npm run dev:api` | 本地 Pages Functions 联调 |
| `npm run version:release` | 手动更新版本信息文件 |

## 发布与版本号

推送到 `main` 由 Cloudflare Pages Git 集成自动构建部署。

版本号由 pre-push 钩子自动维护：提交信息首行以 `新增：` / `优化：` / `修复：` / `删除：` 开头时，钩子会递增版本号并生成更新提交。其他前缀的提交不会触发版本递增。

版本号当前格式：`YYYYMMDD-NN`（当日第 N 次发布），存于 `src/version-info.js`，在站点页脚展示。

## 迁移与数据库

所有 schema 变更以递增序号存放在 `migrations/`（`0001_create_*.sql` 至 `0017_*.sql`）。应用迁移：

```bash
# 本地
npx wrangler d1 migrations apply rf4-db --local
# 生产
npx wrangler d1 migrations apply rf4-db --remote
```

注意：`0015_create_lines.sql` 已随"线材库"功能下线删除（功能移除而非迁移失败），迁移目录缺号属正常。

## 环境变量 / Secrets

| 变量 | 用途 |
| --- | --- |
| `ADMIN_PASSWORD` | 装备导入 / 方案审核与删除的管理密码（secret） |
| `DEV_PASSWORD` | 仅本地开发环境使用的管理密码 |

生产 secrets 在 CF Dashboard 或 `wrangler secret put ADMIN_PASSWORD` 配置。

## 目录结构

```
functions/api/      Pages Functions 端点（含反爬、限流、缓存）
migrations/         D1 迁移
scripts/            git hooks 与版本号脚本
src/utils/          数据加载 / 清洗 / 计算逻辑（单元测试覆盖）
src/components/     Vue 页面与公共组件
tests/              Vitest 单元测试
```

## 贡献约定

- 代码改动请确保 `npm test` 与 `npm run lint` 均通过。
- 提交信息使用中文分类前缀（`新增：`/`优化：`/`修复：`/`删除：`）并附带变更说明，便于版本号自动更新与 changelog 生成。
