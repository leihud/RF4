CREATE TABLE IF NOT EXISTS recommended_builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 鱼竿信息
  rod_model TEXT,
  rod_name TEXT,
  rod_category TEXT,
  -- 渔轮信息
  reel_model TEXT,
  reel_name TEXT,
  reel_category TEXT,
  -- 主线信息
  main_line_tension REAL DEFAULT 0,
  main_line_wear REAL DEFAULT 0,
  main_line_material TEXT DEFAULT '',
  -- 引线信息
  leader_line_tension REAL DEFAULT 0,
  leader_line_wear REAL DEFAULT 0,
  leader_line_material TEXT DEFAULT '',
  -- 鱼钩信息
  hook_tension REAL DEFAULT 0,
  hook_wear REAL DEFAULT 0,
  -- 计算规则
  calculation_rule TEXT DEFAULT 'guide',
  -- 摩擦值
  friction REAL DEFAULT 0,
  -- 用户填写的描述信息
  description TEXT DEFAULT '',
  suitable_fish TEXT DEFAULT '',
  suitable_map TEXT DEFAULT '',
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommended_builds_created_at ON recommended_builds(created_at);
CREATE INDEX IF NOT EXISTS idx_recommended_builds_rod_model ON recommended_builds(rod_model);
CREATE INDEX IF NOT EXISTS idx_recommended_builds_reel_model ON recommended_builds(reel_model);
