CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入俄罗斯钓鱼4标准地图数据
INSERT OR IGNORE INTO maps (name, display_name, description) VALUES
('克马羚诺也湖', '克马羚诺也湖', ''),
('梅德韦杰湖', '梅德韦杰湖', ''),
('拉多加湖群岛', '拉多加湖群岛', ''),
('埃尔克湖', '埃尔克湖', ''),
('沃尔霍夫河', '沃尔霍夫河', ''),
('阿赫图巴河', '阿赫图巴河', ''),
('惟有诺克河', '惟有诺克河', ''),
('北顿涅茨河', '北顿涅茨河', ''),
('铜湖', '铜湖', ''),
('旧奥斯特罗格湖', '旧奥斯特罗格湖', ''),
('苏拉河', '苏拉河', ''),
('下通古斯卡河', '下通古斯卡河', ''),
('白河', '白河', ''),
('拉多加湖', '拉多加湖', ''),
('亚马河', '亚马河', ''),
('廓里湖', '廓里湖', ''),
('琥珀湖', '琥珀湖', ''),
('挪威海', '挪威海', '');

CREATE INDEX IF NOT EXISTS idx_maps_name ON maps(name);
CREATE INDEX IF NOT EXISTS idx_maps_display_name ON maps(display_name);
