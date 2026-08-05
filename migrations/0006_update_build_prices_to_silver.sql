-- 将已保存方案的鱼竿和渔轮价格从金币更新为银币
-- 通过关联 rods 和 reels 表获取对应的 silverPrice

UPDATE recommended_builds 
SET rod_price = (
  SELECT r.silverPrice 
  FROM rods r 
  WHERE r.model = recommended_builds.rod_model OR r.equipmentName = recommended_builds.rod_model
)
WHERE EXISTS (
  SELECT 1 FROM rods r 
  WHERE r.model = recommended_builds.rod_model OR r.equipmentName = recommended_builds.rod_model
);

UPDATE recommended_builds 
SET reel_price = (
  SELECT r.silverPrice 
  FROM reels r 
  WHERE r.model = recommended_builds.reel_model OR r.equipmentName = recommended_builds.reel_model
)
WHERE EXISTS (
  SELECT 1 FROM reels r 
  WHERE r.model = recommended_builds.reel_model OR r.equipmentName = recommended_builds.reel_model
);
