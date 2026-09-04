-- 新增「方案提交者跟踪」列 owner_token：
-- 提交接口生成随机 token 返回给提交者（保存在其浏览器 localStorage），
-- 提交者可凭 token 查询自己全部方案的审核状态/驳回原因，并删除自己的方案。
-- 列仅存服务器；对外列表响应一律剔除该列，避免 token 泄露。
ALTER TABLE recommended_builds ADD COLUMN owner_token TEXT NOT NULL DEFAULT '';
