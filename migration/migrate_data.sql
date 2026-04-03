-- Voxora 数据迁移脚本
-- 使用方法：在海外版 Supabase SQL Editor 中执行此脚本

-- 清空现有数据（可选，谨慎使用）
-- TRUNCATE TABLE memories RESTART IDENTITY CASCADE;

-- 插入回忆数据
INSERT INTO memories (id, title, memory_date, location, weather, mood, media_keys, audio_key, created_at, updated_at) VALUES
(1, '夏日海滩漫步', '2024-07-15 00:00:00+08:00', '三亚亚龙湾', '晴天', '开心', NULL, NULL, '2026-04-02 19:54:01.450561+08:00', NULL),
(2, '冬日雪景', '2024-01-20 00:00:00+08:00', '哈尔滨冰雪大世界', '雪天', '兴奋', NULL, NULL, '2026-04-02 19:54:01.450561+08:00', NULL),
(3, '秋日黄昏', '2023-10-08 00:00:00+08:00', '北京颐和园', '多云', '平静', NULL, NULL, '2026-04-02 19:54:01.450561+08:00', NULL)
ON CONFLICT (id) DO NOTHING;

-- 重置序列（确保新插入数据 ID 正确）
SELECT setval('memories_id_seq', (SELECT MAX(id) FROM memories));
