-- Voxora 数据库初始化脚本
-- 用于初始化测试数据

-- 插入测试家庭
INSERT INTO families (id, name) VALUES
  ('family_1', '王氏家庭'),
  ('family_2', '李氏家庭')
ON CONFLICT (id) DO NOTHING;

-- 插入测试用户
INSERT INTO users (id, name, email, family_id, avatar) VALUES
  ('user_1', '王明', 'wangming@example.com', 'family_1', 'https://i.pravatar.cc/150?u=wangming'),
  ('user_2', '李华', 'lihua@example.com', 'family_1', 'https://i.pravatar.cc/150?u=lihua'),
  ('user_3', '王小红', 'wangxiaohong@example.com', 'family_1', 'https://i.pravatar.cc/150?u=wangxiaohong'),
  ('user_4', '李大明', 'lidaming@example.com', 'family_2', 'https://i.pravatar.cc/150?u=lidaming')
ON CONFLICT (email) DO NOTHING;

-- 插入测试回忆
INSERT INTO memories (id, title, cover_image, date, location, weather, mood, is_multi_user, user_count, images, user_id, family_id, likes, is_sealed) VALUES
  ('memory_1', '家庭聚餐', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', '2024-12-25 18:30:00', '北京·外婆家', 'sunny', 'happy', true, 5, '["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"]'::jsonb, 'user_1', 'family_1', 24, false),
  ('memory_2', '周末郊游', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', '2024-12-20 10:00:00', '颐和园', 'cloudy', 'relaxed', false, 1, '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"]'::jsonb, 'user_1', 'family_1', 18, false),
  ('memory_3', '宝宝周岁', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800', '2024-12-15 14:00:00', '北京·外婆家', 'snowy', 'excited', true, 8, '["https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800", "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb, 'user_1', 'family_1', 56, false),
  ('memory_4', '生日派对', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800', '2024-12-10 16:00:00', '家中', 'sunny', 'joyful', true, 6, '["https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800"]'::jsonb, 'user_2', 'family_1', 32, false)
ON CONFLICT (id) DO NOTHING;

-- 插入测试宠物数据（仅用于演示，实际应该有单独的 pets 表）
-- 注意：pets 表目前使用内存存储，这部分数据仅供参考
-- 如果将来将 pets 迁移到数据库，可以使用以下脚本：
/*
CREATE TABLE IF NOT EXISTS pets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id VARCHAR(36) REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  max_experience INTEGER DEFAULT 100,
  mood VARCHAR(32) DEFAULT 'happy',
  energy INTEGER DEFAULT 100,
  max_energy INTEGER DEFAULT 100,
  evolution_stage INTEGER DEFAULT 1,
  last_fed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO pets (id, family_id, name, level, experience, max_experience, mood, energy, max_energy, evolution_stage, last_fed) VALUES
  ('pet_1', 'family_1', '小星', 5, 680, 1000, 'happy', 85, 100, 2, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;
*/
