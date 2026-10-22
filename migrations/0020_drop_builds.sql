-- 移除方案社交功能：推荐方案表与点赞记录表下线（前端个人工具化，数据由爬虫维护）
DROP TABLE IF EXISTS recommended_builds;
DROP TABLE IF EXISTS build_likes;
