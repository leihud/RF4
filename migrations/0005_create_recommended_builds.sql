CREATE TABLE IF NOT EXISTS recommended_builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 方案名称
  name TEXT DEFAULT '',
  -- 鱼竿信息
  rod_model TEXT,
  rod_name TEXT,
  rod_category TEXT,
  rod_price REAL DEFAULT 0,
  -- 渔轮信息
  reel_model TEXT,
  reel_name TEXT,
  reel_category TEXT,
  reel_price REAL DEFAULT 0,
  -- 主线信息
  main_line_tension REAL DEFAULT 0,
  main_line_wear REAL DEFAULT 0,
  main_line_material TEXT DEFAULT '',
  main_line_diameter REAL DEFAULT 0,
  main_line_length REAL DEFAULT 0,
  -- 引线信息
  leader_line_tension REAL DEFAULT 0,
  leader_line_wear REAL DEFAULT 0,
  leader_line_material TEXT DEFAULT '',
  leader_line_diameter REAL DEFAULT 0,
  leader_line_length REAL DEFAULT 0,
  -- 鱼钩信息
  hook_name TEXT DEFAULT '',
  -- 计算规则
  calculation_rule TEXT DEFAULT 'guide',
  -- 摩擦值
  friction REAL DEFAULT 0,
  -- 用户填写的描述信息
  description TEXT DEFAULT '',
  suitable_fish TEXT DEFAULT '',
  suitable_map TEXT DEFAULT '',
  -- 外键关联地图表（可选）
  -- map_id INTEGER REFERENCES maps(id),
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommended_builds_created_at ON recommended_builds(created_at);
CREATE INDEX IF NOT EXISTS idx_recommended_builds_rod_model ON recommended_builds(rod_model);
CREATE INDEX IF NOT EXISTS idx_recommended_builds_reel_model ON recommended_builds(reel_model);
