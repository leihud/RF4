CREATE TABLE IF NOT EXISTS fish_species (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  difficulty TEXT DEFAULT '',
  min_tension REAL DEFAULT 0,
  max_tension REAL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入俄罗斯钓鱼4常见鱼种数据（示例，可根据实际游戏数据补充）
INSERT OR IGNORE INTO fish_species (name, display_name, difficulty, min_tension, max_tension, description) VALUES
('鲤鱼', '鲤鱼', '中等', 5.0, 15.0, '常见淡水鱼，体型较大'),
('鲫鱼', '鲫鱼', '简单', 2.0, 8.0, '小型淡水鱼，数量众多'),
('鲈鱼', '鲈鱼', '困难', 8.0, 25.0, '掠食性鱼类，拉力强劲'),
('梭鱼', '梭鱼', '中等', 6.0, 18.0, '快速游动的掠食者'),
('狗鱼', '狗鱼', '困难', 10.0, 30.0, '顶级掠食者，体型巨大'),
('鱼', '鳊鱼', '简单', 3.0, 10.0, '群居性鱼类'),
('草鱼', '草鱼', '中等', 7.0, 20.0, '大型淡水鱼，力量强'),
('青鱼', '青鱼', '困难', 12.0, 35.0, '底层大型鱼类'),
('鲶鱼', '鱼', '困难', 15.0, 40.0, '夜行性底栖鱼类'),
('虹鳟', '虹鳟', '中等', 4.0, 12.0, '冷水性鱼类'),
('白鲑', '白鲑', '中等', 5.0, 15.0, '北方湖泊特色鱼种');

CREATE INDEX IF NOT EXISTS idx_fish_species_name ON fish_species(name);
CREATE INDEX IF NOT EXISTS idx_fish_species_display_name ON fish_species(display_name);
CREATE INDEX IF NOT EXISTS idx_fish_species_difficulty ON fish_species(difficulty);
