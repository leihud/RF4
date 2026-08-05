-- 将已保存方案的鱼竿和渔轮价格从金币更新为银币
-- 使用子查询精确匹配 model 字段

UPDATE recommended_builds 
SET rod_price = COALESCE(
  (SELECT r.silverPrice FROM rods r WHERE r.model = recommended_builds.rod_model LIMIT 1),
  rod_price
)
WHERE EXISTS (
  SELECT 1 FROM rods r WHERE r.model = recommended_builds.rod_model
);

UPDATE recommended_builds 
SET reel_price = COALESCE(
  (SELECT r.silverPrice FROM reels r WHERE r.model = recommended_builds.reel_model LIMIT 1),
  reel_price
)
WHERE EXISTS (
  SELECT 1 FROM reels r WHERE r.model = recommended_builds.reel_model
);
