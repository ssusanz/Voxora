-- Voxora 演示数据初始化脚本
-- 在 Supabase SQL 编辑器中运行此脚本来初始化演示数据

-- 插入家庭数据
INSERT INTO families (id, name, created_at, updated_at) VALUES
('family-001', '温馨之家', NOW(), NOW()),
('family-002', '幸福一家人', NOW(), NOW()),
('family-003', '快乐小家庭', NOW(), NOW());

-- 插入用户数据
INSERT INTO users (id, name, email, family_id, avatar, created_at, updated_at) VALUES
('user-001', '小明', 'xiaoming@demo.com', 'family-001', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', NOW(), NOW()),
('user-002', '小红', 'xiaohong@demo.com', 'family-001', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', NOW(), NOW()),
('user-003', '爸爸', 'dad@demo.com', 'family-001', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', NOW(), NOW()),
('user-004', '妈妈', 'mom@demo.com', 'family-001', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', NOW(), NOW()),
('user-005', '小华', 'xiaohua@demo.com', 'family-002', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', NOW(), NOW()),
('user-006', '小丽', 'xiaoli@demo.com', 'family-002', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200', NOW(), NOW());

-- 插入回忆数据（使用 Unsplash 免费图片）
INSERT INTO memories (id, title, cover_image, date, location, weather, mood, is_multi_user, user_count, images, user_id, family_id, likes, is_sealed, unlock_date, created_at, updated_at) VALUES
-- 家庭 001 的回忆
('mem-001', '春节团聚', 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800', '2024-01-01', '老家', '晴', '开心', true, 4, '["https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800", "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800", "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800"]'::jsonb, 'user-001', 'family-001', 12, false, NULL, NOW(), NOW()),

('mem-002', '暑假旅行', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800', '2024-07-15', '黄山', '多云', '兴奋', true, 4, '["https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800", "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800"]'::jsonb, 'user-002', 'family-001', 8, false, NULL, NOW(), NOW()),

('mem-003', '周末野餐', 'https://images.unsplash.com/photo-1529921879218-f99546d3a63a?w=800', '2024-08-20', '公园', '晴', '放松', true, 3, '["https://images.unsplash.com/photo-1529921879218-f99546d3a63a?w=800", "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800"]'::jsonb, 'user-003', 'family-001', 15, false, NULL, NOW(), NOW()),

('mem-004', '生日派对', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800', '2024-09-10', '家里', '晴', '幸福', true, 4, '["https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800", "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800", "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800"]'::jsonb, 'user-004', 'family-001', 20, false, NULL, NOW(), NOW()),

('mem-005', '海边度假', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', '2024-06-01', '三亚', '晴', '快乐', true, 3, '["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800"]'::jsonb, 'user-001', 'family-001', 18, false, NULL, NOW(), NOW()),

-- 家庭 002 的回忆
('mem-006', '婚礼纪念日', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', '2024-05-20', '餐厅', '晴', '感动', true, 2, '["https://images.unsplash.com/photo-1519741497674-611481863552?w=800"]'::jsonb, 'user-005', 'family-002', 25, false, NULL, NOW(), NOW()),

('mem-007', '露营体验', 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800', '2024-08-05', '山林', '多云', '刺激', true, 2, '["https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800", "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800"]'::jsonb, 'user-006', 'family-002', 10, false, NULL, NOW(), NOW()),

-- 更多家庭 001 的回忆
('mem-008', '第一次游泳', 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800', '2024-04-15', '游泳馆', '晴', '紧张', true, 2, '["https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800"]'::jsonb, 'user-003', 'family-001', 7, false, NULL, NOW(), NOW()),

('mem-009', '圣诞节', 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800', '2023-12-25', '家里', '雪', '温馨', true, 4, '["https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800", "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800"]'::jsonb, 'user-004', 'family-001', 30, false, NULL, NOW(), NOW()),

('mem-010', '动物园一日游', 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800', '2024-05-01', '动物园', '晴', '好奇', true, 3, '["https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800", "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800"]'::jsonb, 'user-001', 'family-001', 14, false, NULL, NOW(), NOW()),

-- 封存的回忆
('mem-011', '时光胶囊', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', '2024-01-01', '家里', '晴', '神秘', true, 4, '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"]'::jsonb, 'user-003', 'family-001', 5, true, '2025-01-01 00:00:00+00'::timestamptz, NOW(), NOW());

-- 插入 Vlog 数据
INSERT INTO vlogs (id, title, video_url, memory_ids, user_id, family_id, created_at, updated_at) VALUES
('vlog-001', '2024家庭回忆录', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800', '["mem-001", "mem-002", "mem-003"]'::jsonb, 'user-001', 'family-001', NOW(), NOW()),
('vlog-002', '假期欢乐时光', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800', '["mem-004", "mem-005"]'::jsonb, 'user-004', 'family-001', NOW(), NOW()),
('vlog-003', '爱情纪念日', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', '["mem-006"]'::jsonb, 'user-005', 'family-002', NOW(), NOW());

-- 更新统计信息
-- 更新回忆的用户计数
UPDATE memories m
SET user_count = (
    SELECT COUNT(DISTINCT u.id)
    FROM users u
    WHERE u.family_id = m.family_id
)
WHERE family_id IS NOT NULL;

-- 插入情感反应数据（如果需要）
-- 注意：如果没有 reactions 表，这个部分可以跳过
-- 如果有 reactions 表，请取消注释并调整

/*
INSERT INTO reactions (id, memory_id, member_id, member_name, member_avatar, message, emotion, emotion_color, emotion_icon, created_at) VALUES
('rxn-001', 'mem-001', 'user-001', '小明', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', '太开心了！', 'happy', '#FFB74D', 'smile', NOW()),
('rxn-002', 'mem-001', 'user-002', '小红', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', '明年还要一起去！', 'love', '#E91E63', 'heart', NOW()),
('rxn-003', 'mem-002', 'user-003', '爸爸', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', '风景真美', 'calm', '#81C784', 'leaf', NOW()),
('rxn-004', 'mem-004', 'user-004', '妈妈', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', '宝贝生日快乐！', 'love', '#E91E63', 'heart', NOW()),
('rxn-005', 'mem-005', 'user-001', '小明', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', '海水真蓝！', 'happy', '#FFB74D', 'smile', NOW());
*/

-- 插入白板消息数据（如果需要）
-- 注意：如果没有 whiteboard_messages 表，这个部分可以跳过
-- 如果有 whiteboard_messages 表，请取消注释并调整

/*
INSERT INTO whiteboard_messages (id, family_id, content, author, author_avatar, created_at) VALUES
('wb-001', 'family-001', '每周日晚上一起吃晚餐', '爸爸', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', NOW()),
('wb-002', 'family-001', '暑假去海边旅行', '小明', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', NOW()),
('wb-003', 'family-001', '妈妈生日快乐', '小红', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', NOW()),
('wb-004', 'family-002', '纪念日礼物：手作相册', '小丽', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200', NOW());
*/

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '演示数据初始化完成！';
    RAISE NOTICE '已插入 3 个家庭';
    RAISE NOTICE '已插入 6 个用户';
    RAISE NOTICE '已插入 11 条回忆（其中 1 条已封存）';
    RAISE NOTICE '已插入 3 个 Vlog';
END $$;
