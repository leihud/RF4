-- 将已保存方案的鱼竿和渔轮价格从金币更新为银币
-- 通过关联 rods 和 reels 表获取对应的 silverPrice
-- 使用 LIKE 模糊匹配以兼容不同格式的型号名称

UPDATE recommended_builds 
SET rod_price = (
  SELECT r.silverPrice 
  FROM rods r 
  WHERE r.model = recommended_builds.rod_model 
     OR r.equipmentName = recommended_builds.rod_model
     OR recommended_builds.rod_model LIKE '%' || r.model || '%'
     OR recommended_builds.rod_model LIKE '%' || r.equipmentName || '%'
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM rods r 
  WHERE r.model = recommended_builds.rod_model 
     OR r.equipmentName = recommended_builds.rod_model
     OR recommended_builds.rod_model LIKE '%' || r.model || '%'
     OR recommended_builds.rod_model LIKE '%' || r.equipmentName || '%'
);

UPDATE recommended_builds 
SET reel_price = (
  SELECT r.silverPrice 
  FROM reels r 
  WHERE r.model = recommended_builds.reel_model 
     OR r.equipmentName = recommended_builds.reel_model
     OR recommended_builds.reel_model LIKE '%' || r.model || '%'
     OR recommended_builds.reel_model LIKE '%' || r.equipmentName || '%'
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM reels r 
  WHERE r.model = recommended_builds.reel_model 
     OR r.equipmentName = recommended_builds.reel_model
     OR recommended_builds.reel_model LIKE '%' || r.model || '%'
     OR recommended_builds.reel_model LIKE '%' || r.equipmentName || '%'
);
