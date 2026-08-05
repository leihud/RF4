-- 为方案表添加审核状态字段
ALTER TABLE recommended_builds ADD COLUMN is_approved INTEGER DEFAULT 0;

-- 将现有数据标记为已审核（兼容旧数据）
UPDATE recommended_builds SET is_approved = 1 WHERE is_approved IS NULL;

CREATE INDEX IF NOT EXISTS idx_recommended_builds_is_approved ON recommended_builds(is_approved);
