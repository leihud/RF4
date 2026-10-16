-- GameKee 图鉴爬取：通用全字段落库表 + 渔竿/渔轮增补列
-- 数据源：https://www.gamekee.com/rf4/ （game-alias: rf4，公开接口无需鉴权）

-- 1) 通用装备条目表：全部 11 个图鉴分区（渔竿/渔轮/鱼线/钓钩/拟饵/鱼饵/钓组/诱饵/食品/工业品/辅助用品）
--    全字段以 JSON 落库；竿/轮另有结构化补齐（见下）。
--    注意：一个 GameKee 页面（叶子）可能含多个尺寸变体 profile（如 Albacore 20 + Albacore 40 DS），
--    所以一行 = 一个装备变体，唯一键为 (entry_id, name) 而非 entry_id 单列。
CREATE TABLE IF NOT EXISTS gamekee_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- gamekee 条目 id（页面级）
  entry_id INTEGER NOT NULL,
  -- 顶层分区名（如 渔竿图鉴 / 渔轮图鉴 / 食品图鉴）
  section TEXT NOT NULL DEFAULT '',
  -- 从分区到该条目的完整目录路径（→ 连接），叶子判定与分类查询用
  category_path TEXT NOT NULL DEFAULT '',
  -- 装备变体名称（profile.name，如 Albacore 20）
  name TEXT NOT NULL DEFAULT '',
  -- 条目标题（目录树 name，通常是基础型号名）
  entry_name TEXT NOT NULL DEFAULT '',
  -- 能力副标题（profile.descTitle，如「能力：超轻钓法」「介绍」）
  desc_title TEXT NOT NULL DEFAULT '',
  -- 描述文本（profile.desc 清洗后）
  description TEXT NOT NULL DEFAULT '',
  -- 全量属性 JSON：[{"key":"清洗后键名","raw":"原始字段名","value":"文本值","num":数值或null}]
  attrs_json TEXT NOT NULL DEFAULT '[]',
  -- 内容版本（detail.updated_at），无变化时跳过写入
  content_version TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entry_id, name)
);

CREATE INDEX IF NOT EXISTS idx_gamekee_items_section ON gamekee_items(section);
CREATE INDEX IF NOT EXISTS idx_gamekee_items_name ON gamekee_items(name);

-- 2) 渔竿表增补列（爬取可得、现有结构缺失的字段；同值异名字段已归一到这些列）
ALTER TABLE rods ADD COLUMN formExtra TEXT DEFAULT '';
ALTER TABLE rods ADD COLUMN gamekee_entry_id INTEGER DEFAULT 0;

-- 3) 渔轮表增补列
ALTER TABLE reels ADD COLUMN gamekee_entry_id INTEGER DEFAULT 0;

-- 4) 记录每轮爬取的汇总元数据
CREATE TABLE IF NOT EXISTS gamekee_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at TEXT NOT NULL DEFAULT (datetime('now')),
  section_counts TEXT NOT NULL DEFAULT '{}',
  items_inserted INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  rods_upserted INTEGER NOT NULL DEFAULT 0,
  reels_upserted INTEGER NOT NULL DEFAULT 0,
  errors TEXT NOT NULL DEFAULT ''
);
