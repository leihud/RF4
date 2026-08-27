-- 通用键值元信息表（如最后导入时间），供前端展示数据新鲜度
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
