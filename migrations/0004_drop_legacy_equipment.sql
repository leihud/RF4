-- equipment 表为早期遗留设计：API 已不再引用，且 0002/0003 种子数据只写入 rods/reels，
-- 该表从未有数据写入，删除以简化 schema（关联索引随表一并删除）
DROP TABLE IF EXISTS equipment;
