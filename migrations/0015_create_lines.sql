-- 线材参数库：主线/引线数据，补齐计算器"五件套"数据闭环
CREATE TABLE IF NOT EXISTS lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT,
  material TEXT,
  tensionKn TEXT,
  diameterMm TEXT,
  lengthM TEXT,
  silverPrice TEXT,
  goldPrice TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lines_model ON lines(model);
