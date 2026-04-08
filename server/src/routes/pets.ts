import { Router } from 'express';

const router = Router();

// 宠物数据
interface Pet {
  id: string;
  familyId: string;
  name: string;
  level: number;
  experience: number;
  maxExperience: number;
  mood: 'happy' | 'excited' | 'sleepy' | 'hungry';
  energy: number;
  maxEnergy: number;
  evolutionStage: number;
  lastFed: string;
  createdAt: string;
  updatedAt: string;
}

interface EnergySource {
  id: string;
  type: 'memory' | 'like' | 'comment' | 'family';
  description: string;
  amount: number;
  timestamp: string;
  fromMember: string;
  familyId: string;
}

let pets: Pet[] = [
  {
    id: 'pet_1',
    familyId: 'family_1',
    name: '小星',
    level: 5,
    experience: 680,
    maxExperience: 1000,
    mood: 'happy',
    energy: 85,
    maxEnergy: 100,
    evolutionStage: 2,
    lastFed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

let energySources: EnergySource[] = [
  { id: '1', type: 'memory', description: '发布了新回忆', amount: 50, timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), fromMember: '爸爸', familyId: 'family_1' },
  { id: '2', type: 'like', description: '收到点赞', amount: 10, timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), fromMember: '妈妈', familyId: 'family_1' },
  { id: '3', type: 'comment', description: '收到评论', amount: 20, timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), fromMember: '小美', familyId: 'family_1' },
  { id: '4', type: 'family', description: '家庭互动', amount: 30, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), fromMember: '全家', familyId: 'family_1' },
  { id: '5', type: 'memory', description: '发布了新回忆', amount: 50, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), fromMember: '我', familyId: 'family_1' },
];

// 获取宠物信息
router.get('/:familyId', (req, res) => {
  const { familyId } = req.params;
  const pet = pets.find(p => p.familyId === familyId);
  
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  
  res.json(pet);
});

// 获取能量来源历史
router.get('/:familyId/energy-sources', (req, res) => {
  const { familyId } = req.params;
  const { limit = 20 } = req.query;
  
  const sources = energySources
    .filter(s => s.familyId === familyId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, parseInt(limit as string));
  
  res.json(sources);
});

// 添加能量
router.post('/:familyId/energy', (req, res) => {
  const { familyId } = req.params;
  const { type, amount, fromMember, description } = req.body;
  
  const pet = pets.find(p => p.familyId === familyId);
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  
  // 添加能量来源记录
  const source: EnergySource = {
    id: `source_${Date.now()}`,
    type,
    description: description || getDefaultDescription(type),
    amount,
    timestamp: new Date().toISOString(),
    fromMember,
    familyId,
  };
  energySources.unshift(source);
  
  // 更新宠物经验值
  pet.experience += amount;
  
  // 检查升级
  if (pet.experience >= pet.maxExperience) {
    pet.level += 1;
    pet.experience = pet.experience - pet.maxExperience;
    pet.maxExperience = Math.floor(pet.maxExperience * 1.5);
    
    // 检查进化
    if (pet.level % 5 === 0 && pet.evolutionStage < 5) {
      pet.evolutionStage += 1;
    }
  }
  
  // 更新心情和能量
  pet.energy = Math.min(pet.energy + Math.floor(amount / 10), pet.maxEnergy);
  pet.mood = pet.energy > 70 ? 'happy' : pet.energy > 40 ? 'relaxed' : 'hungry';
  pet.lastFed = new Date().toISOString();
  pet.updatedAt = new Date().toISOString();
  
  res.json({
    pet,
    source,
    leveledUp: pet.level,
    evolved: pet.evolutionStage,
  });
});

// 喂养宠物
router.post('/:familyId/feed', (req, res) => {
  const { familyId } = req.params;
  const pet = pets.find(p => p.familyId === familyId);
  
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  
  // 喂养增加能量和经验
  pet.energy = Math.min(pet.energy + 20, pet.maxEnergy);
  pet.experience += 30;
  pet.mood = 'happy';
  pet.lastFed = new Date().toISOString();
  pet.updatedAt = new Date().toISOString();
  
  res.json(pet);
});

// 获取宠物动画状态
router.get('/:familyId/status', (req, res) => {
  const { familyId } = req.params;
  const pet = pets.find(p => p.familyId === familyId);
  
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  
  // 计算动画表情
  const getMoodEmoji = () => {
    switch (pet.mood) {
      case 'happy': return '⭐';
      case 'excited': return '✨';
      case 'sleepy': return '🌙';
      case 'hungry': return '🍃';
      default: return '⭐';
    }
  };
  
  res.json({
    moodEmoji: getMoodEmoji(),
    mood: pet.mood,
    energy: pet.energy,
    level: pet.level,
    evolutionStage: pet.evolutionStage,
    isAnimating: pet.energy > 50,
  });
});

function getDefaultDescription(type: string): string {
  switch (type) {
    case 'memory': return '发布了新回忆';
    case 'like': return '收到点赞';
    case 'comment': return '收到评论';
    case 'family': return '家庭互动';
    default: return '获得能量';
  }
}

export default router;
