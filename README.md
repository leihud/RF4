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

需要访问 `/api/*` 时使用本地模拟（项目未提供 `dev:api` script，直接调用 wrangler）：

```bash
npm run build
npx wrangler pages dev dist --port 8788   # 需先 npm run build 生成 dist，并配置好 .dev.vars
```

`wrangler.toml` 中已声明 D1 数据库绑定 `DB`。本地联调依赖：
- `IMPORT_PASSWORD`：装备导入 / 方案审核与删除的管理密码（.dev.vars，与生产 secret 同名）

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
| `npx wrangler pages dev dist` | 本地 Pages Functions 联调 |
| `npm run version:release` | 手动更新版本信息文件 |

## 发布与版本号

推送到 `main` 由 Cloudflare Pages Git 集成自动构建部署。

版本号由 pre-push 钩子自动维护：提交信息首行以 `新增：` / `优化：` / `修复：` / `删除：` 开头时，钩子会递增版本号并生成更新提交。其他前缀的提交不会触发版本递增。

版本号当前格式：`YYYYMMDD-NN`（当日第 N 次发布），存于 `src/version-info.js`，在站点页脚展示。

## 迁移与数据库

所有 schema 变更以递增序号存放在 `migrations/`（`0001_create_*.sql` 至 `0018_*.sql`）。应用迁移：

```bash
# 本地
npx wrangler d1 migrations apply rf4-db --local
# 生产
npx wrangler d1 migrations apply rf4-db --remote
```

注意：`0015_create_lines.sql` 已随"线材库"功能下线删除（功能移除而非迁移失败），迁移目录缺号属正常。

## 图鉴自动爬取（GameKee → D1）

`scripts/crawl-gamekee.mjs` 定时爬取 [GameKee RF4 图鉴](https://www.gamekee.com/rf4/) 的 11 个分区（渔竿/渔轮/鱼线/钓钩/拟饵/鱼饵/钓组/诱饵/食品/工业品/辅助用品），清洗整合后落库：

- **全字段落库**：所有条目（含全部属性 JSON）进 `gamekee_items`（迁移 0018），按 `entry_id` UPSERT
- **竿/轮补齐**：渔竿/渔轮属性按别名归一（如 `摩擦制动`/`摩擦力`→`摩擦制动力`、`适配重(克)`→`适配重`）映射回 `rods`/`reels` 现有列，按 `model` 匹配——存在则 UPDATE（爬取结果为准，空值不覆盖），不存在则 INSERT，并记录 `gamekee_entry_id` 追踪
- 每轮运行汇总写入 `gamekee_sync_log`

触发方式：

- **定时**：GitHub Actions 每日 UTC 21:00（北京时间 05:00）运行（`.github/workflows/crawl-gamekee.yml`）
- **手动**：Actions 页面 workflow_dispatch，或本地执行

```bash
node scripts/crawl-gamekee.mjs --dry-run              # 只抓取解析打印摘要，不写库
node scripts/crawl-gamekee.mjs --limit 20 --dry-run   # 冒烟：只抓前 20 条
CF_ACCOUNT_ID=xxx CF_D1_TOKEN=yyy node scripts/crawl-gamekee.mjs  # 真实写库
```

GitHub Actions 需配置 Secrets：`CF_ACCOUNT_ID`（账户 ID）、`CF_D1_TOKEN`（API Token，权限 D1 → Edit）。

## 环境变量 / Secrets

| 变量 | 用途 |
| --- | --- |
| `IMPORT_PASSWORD` | 装备导入 / 方案审核与删除的管理密码（secret，本地 .dev.vars 与生产 secret 同名） |

生产 secrets 在 CF Dashboard 或 `wrangler secret put IMPORT_PASSWORD` 配置。

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
