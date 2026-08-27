-- 方案点赞：方案表加点赞计数列 + 点赞记录表（按客户端指纹去重，可取消）
ALTER TABLE recommended_builds ADD COLUMN likes INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS build_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(build_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_build_likes_build ON build_likes(build_id);
