-- 将已保存方案的鱼竿和渔轮价格从金币更新为银币
-- 通过关联 rods 和 reels 表获取对应的 silverPrice
-- 优先使用 model 字段精确匹配

UPDATE recommended_builds 
SET rod_price = (
  SELECT r.silverPrice 
  FROM rods r 
  WHERE r.model = recommended_builds.rod_model
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM rods r 
  WHERE r.model = recommended_builds.rod_model
);

-- 对于未匹配的，尝试用 equipmentName 匹配
UPDATE recommended_builds 
SET rod_price = (
  SELECT r.silverPrice 
  FROM rods r 
  WHERE r.equipmentName = recommended_builds.rod_model
  LIMIT 1
)
WHERE rod_price IS NULL OR rod_price = 0
  AND EXISTS (
    SELECT 1 FROM rods r 
    WHERE r.equipmentName = recommended_builds.rod_model
  );

UPDATE recommended_builds 
SET reel_price = (
  SELECT r.silverPrice 
  FROM reels r 
  WHERE r.model = recommended_builds.reel_model
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM reels r 
  WHERE r.model = recommended_builds.reel_model
);

-- 对于未匹配的，尝试用 equipmentName 匹配
UPDATE recommended_builds 
SET reel_price = (
  SELECT r.silverPrice 
  FROM reels r 
  WHERE r.equipmentName = recommended_builds.reel_model
  LIMIT 1
)
WHERE reel_price IS NULL OR reel_price = 0
  AND EXISTS (
    SELECT 1 FROM reels r 
    WHERE r.equipmentName = recommended_builds.reel_model
  );
