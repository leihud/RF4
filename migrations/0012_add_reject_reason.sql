-- 为方案表添加审核驳回原因字段（管理员驳回时填写，提交者可见）
ALTER TABLE recommended_builds ADD COLUMN reject_reason TEXT DEFAULT '';
