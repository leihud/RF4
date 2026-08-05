-- 添加常用查询字段的索引，优化搜索和筛选性能

-- 鱼竿表索引
CREATE INDEX IF NOT EXISTS idx_rods_equipment_name ON rods(equipmentName);
CREATE INDEX IF NOT EXISTS idx_rods_rating ON rods(rating);
CREATE INDEX IF NOT EXISTS idx_rods_silver_price ON rods(silverPrice);
CREATE INDEX IF NOT EXISTS idx_rods_sub_category ON rods(subCategory);

-- 渔轮表索引
CREATE INDEX IF NOT EXISTS idx_reels_equipment_name ON reels(equipmentName);
CREATE INDEX IF NOT EXISTS idx_reels_rating ON reels(rating);
CREATE INDEX IF NOT EXISTS idx_reels_silver_price ON reels(silverPrice);
CREATE INDEX IF NOT EXISTS idx_reels_sub_category ON reels(subCategory);
CREATE INDEX IF NOT EXISTS idx_reels_form ON reels(form);
CREATE INDEX IF NOT EXISTS idx_reels_size ON reels(size);
