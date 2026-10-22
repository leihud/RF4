-- Potryasov / RF4-STAT 数据源接入：鱼线、鱼钩、渔轮强度、鱼种奖杯数据
-- 数据源：
--   鱼线/鱼钩 = Potryasov Game 公开 Google Sheets CSV（线径-拉力对照、钩号-拉力矩阵）
--   渔轮强度 = Potryasov 强度计算器页 option 枚举（交叉校验用）
--   鱼种奖杯 = RF4-STAT /weight/ 全量表

-- 1) 鱼线表：同一型号按线径逐行（GameKee 缺失的线径-拉力核心数据）
CREATE TABLE IF NOT EXISTS fishing_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,               -- 型号名（拉丁字母）
  type TEXT DEFAULT '',             -- 材质类型原文（俄文）
  strength_kg REAL DEFAULT 0,       -- 标称拉力 kg
  diameter_mm REAL DEFAULT 0,       -- 线径 mm
  length_m REAL DEFAULT 0,          -- 长度 m
  price REAL DEFAULT 0,             -- 价格（银币）
  color TEXT DEFAULT '',            -- 颜色原文
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(name, diameter_mm, strength_kg)
);
CREATE INDEX IF NOT EXISTS idx_fishing_lines_name ON fishing_lines(name);

-- 2) 鱼钩表：钩号-拉力矩阵以 JSON 存（{"size":"S1","kg":6.1} 数组）
CREATE TABLE IF NOT EXISTS fishing_hooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,        -- 型号名
  type TEXT DEFAULT '',             -- 钩型原文（Тройник=三本钩等）
  strength_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3) 渔轮强度表（Potryasov 强度计算器枚举，交叉校验 reels.lockTension 用）
CREATE TABLE IF NOT EXISTS reel_strength (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL UNIQUE,       -- 渔轮型号
  strength_kg REAL DEFAULT 0,       -- 强度 kg（?" 未知值为 0）
  category TEXT DEFAULT '',         -- 轮型分类（子页标题）
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4) 鱼种表奖杯数据列（RF4-STAT /weight/）
ALTER TABLE fish_species ADD COLUMN trophy_weight REAL DEFAULT 0;
ALTER TABLE fish_species ADD COLUMN super_trophy_weight REAL DEFAULT 0;
ALTER TABLE fish_species ADD COLUMN max_record_weight REAL DEFAULT 0;
ALTER TABLE fish_species ADD COLUMN max_record_date TEXT DEFAULT '';
ALTER TABLE fish_species ADD COLUMN rarity TEXT DEFAULT '';
