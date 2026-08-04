CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入俄罗斯钓鱼4标准地图数据
INSERT OR IGNORE INTO maps (name, display_name, description) VALUES
('老奥', '老奥斯特罗夫', '新手友好地图，适合入门'),
('维姆', '维姆湖', '中型湖泊，鱼种丰富'),
('库页岛', '库页岛', '大型海洋地图，深海鱼类'),
('拉多加', '拉多加湖', '欧洲最大湖泊之一'),
('芬兰', '芬兰湾', '波罗的海海湾，咸水环境'),
('阿赫图巴', '阿赫图巴河', '河流地图，流水环境'),
('沃尔霍夫', '沃尔霍夫河', '历史悠久的河流'),
('白湖', '白湖', '北方湖泊，冷水鱼类'),
('乌尼加', '乌尼加河', '小型河流地图'),
('雅曼', '雅曼湖', '中型湖泊，综合型'),
('星湖', '星湖', '特色湖泊地图'),
('琥珀', '琥珀湖', '特色地图，稀有鱼种');

CREATE INDEX IF NOT EXISTS idx_maps_name ON maps(name);
CREATE INDEX IF NOT EXISTS idx_maps_display_name ON maps(display_name);
