import { Router } from 'express';

const router = Router();

// 模拟数据
let memories = [
  {
    id: '1',
    title: '家庭聚餐',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    date: '2024-12-25 18:30:00',
    location: '北京·外婆家',
    isMultiUser: true,
    userCount: 5,
    weather: 'sunny',
    mood: 'happy',
    images: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    ],
    userId: '1',
    familyId: 'family_1',
    likes: 24,
    createdAt: '2024-12-25T10:30:00Z',
    updatedAt: '2024-12-25T10:30:00Z',
  },
  {
    id: '2',
    title: '周末郊游',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    date: '2024-12-20 10:00:00',
    location: '颐和园',
    isMultiUser: false,
    userCount: 1,
    weather: 'cloudy',
    mood: 'relaxed',
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    ],
    userId: '1',
    familyId: 'family_1',
    likes: 18,
    createdAt: '2024-12-20T02:00:00Z',
    updatedAt: '2024-12-20T02:00:00Z',
  },
  {
    id: '3',
    title: '宝宝周岁',
    coverImage: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800',
    date: '2024-12-15 14:00:00',
    location: '北京·外婆家',
    isMultiUser: true,
    userCount: 8,
    weather: 'snowy',
    mood: 'excited',
    images: [
      'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800',
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800',
    ],
    userId: '1',
    familyId: 'family_1',
    likes: 56,
    createdAt: '2024-12-15T06:00:00Z',
    updatedAt: '2024-12-15T06:00:00Z',
  },
];

// 获取所有回忆（按时间倒序）
router.get('/', (req, res) => {
  const { familyId, page = 1, limit = 20 } = req.query;
  
  let filtered = memories;
  if (familyId) {
    filtered = memories.filter(m => m.familyId === familyId);
  }
  
  // 按时间倒序
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // 分页
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;
  
  res.json({
    data: filtered.slice(start, end),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
  });
});

// 获取单个回忆详情
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const memory = memories.find(m => m.id === id);
  
  if (!memory) {
    return res.status(404).json({ error: '回忆不存在' });
  }
  
  res.json(memory);
});

// 创建回忆
router.post('/', (req, res) => {
  const { title, date, location, weather, mood, images, userId, familyId, isSealed, unlockDate } = req.body;
  
  if (!title || !date) {
    return res.status(400).json({ error: '标题和日期不能为空' });
  }
  
  const newMemory = {
    id: String(memories.length + 1),
    title,
    coverImage: images?.[0] || '',
    date,
    location: location || '',
    isMultiUser: false,
    userCount: 1,
    weather: weather || 'sunny',
    mood: mood || 'happy',
    images: images || [],
    userId: userId || '1',
    familyId: familyId || 'family_1',
    likes: 0,
    isSealed: isSealed || false,
    unlockDate: unlockDate || null,
    participants: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  memories.unshift(newMemory);
  
  res.status(201).json(newMemory);
});

// 更新回忆
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const index = memories.findIndex(m => m.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '回忆不存在' });
  }
  
  const updated = { ...memories[index], ...req.body, updatedAt: new Date().toISOString() };
  memories[index] = updated;
  
  res.json(updated);
});

// 删除回忆
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = memories.findIndex(m => m.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '回忆不存在' });
  }
  
  memories.splice(index, 1);
  res.json({ success: true });
});

// 点赞回忆
router.post('/:id/like', (req, res) => {
  const { id } = req.params;
  const memory = memories.find(m => m.id === id);
  
  if (!memory) {
    return res.status(404).json({ error: '回忆不存在' });
  }
  
  memory.likes += 1;
  res.json({ likes: memory.likes });
});

// 添加评论
router.post('/:id/comments', (req, res) => {
  const { id } = req.params;
  const { userId, userName, content } = req.body;
  
  const memory = memories.find(m => m.id === id);
  if (!memory) {
    return res.status(404).json({ error: '回忆不存在' });
  }
  
  const comment = {
    id: `comment_${Date.now()}`,
    userId,
    userName,
    content,
    timestamp: '刚刚',
  };
  
  res.status(201).json(comment);
});

export default router;
