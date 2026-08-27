-- 前端错误上报表：全局兜底捕获的异常写入此处，便于线上排障
CREATE TABLE IF NOT EXISTS client_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT,
  stack TEXT,
  url TEXT,
  ua TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
