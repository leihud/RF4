-- 渔获速查缓存表：定时任务抓取 RF4-STAT 最新渔获流入库，前端从库查询
-- （Worker 直连 rf4-stat 会被 Cloudflare 盾拦截，改为「定时入库 + 查库」模式）
CREATE TABLE IF NOT EXISTS fishing_feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id TEXT NOT NULL UNIQUE,   -- RF4-STAT 渔获编号（如 14003603）
  time_text TEXT DEFAULT '',       -- 时刻与日期（如 "07:31 22.10"）
  location TEXT DEFAULT '',        -- 地图
  fish_name TEXT DEFAULT '',       -- 鱼种
  weight_text TEXT DEFAULT '',     -- 重量（如 "18 458 克"）
  bait TEXT DEFAULT '',            -- 饵料
  method TEXT DEFAULT '',          -- 钓法
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fishing_feed_id ON fishing_feed(id DESC);
CREATE INDEX IF NOT EXISTS idx_fishing_feed_location ON fishing_feed(location);
CREATE INDEX IF NOT EXISTS idx_fishing_feed_fish ON fishing_feed(fish_name);
