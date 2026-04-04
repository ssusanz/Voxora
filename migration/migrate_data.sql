-- Voxora Demo Data Migration Script
-- Run this script to insert demo memory data

-- Clear existing data (optional, uncomment if needed)
-- TRUNCATE TABLE memories RESTART IDENTITY CASCADE;

-- Insert demo memories
INSERT INTO memories (title, memory_date, location, weather, mood, media_keys, audio_key) VALUES
('夏日海滩漫步', '2024-07-15', '三亚亚龙湾', '晴天', '开心', NULL, NULL),
('冬日雪景', '2024-01-20', '哈尔滨冰雪大世界', '雪天', '兴奋', NULL, NULL),
('秋日黄昏', '2023-10-08', '北京颐和园', '多云', '平静', NULL, NULL),
('Apr 2', '2026-04-02', 'HK', '晴天', '感动', NULL, NULL),
('Hello World Memory', '2026-04-04', 'Cloud VM', '晴天', '开心', NULL, NULL),
('My First Cloud Memory', '2026-04-04', 'Beijing', '晴天', '开心', NULL, NULL),
('Full Stack Working', '2026-04-04', 'Cloud VM', '多云', '平静', NULL, NULL);

-- Verify insertion
SELECT * FROM memories ORDER BY memory_date DESC;
