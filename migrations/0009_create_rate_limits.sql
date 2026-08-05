-- 创建请求频率限制表
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_request_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_suspicious INTEGER DEFAULT 0,
  is_blacklisted INTEGER DEFAULT 0,
  UNIQUE(ip)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_suspicious ON rate_limits(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blacklisted ON rate_limits(is_blacklisted);
