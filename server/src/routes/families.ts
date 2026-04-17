import { Router } from 'express';

const router = Router();

// 模拟家庭数据
let families = [
  {
    id: 'family_1',
    name: '小明一家',
    avatar: '',
    inviteCode: 'ABC123',
    whiteboardContent: '愿我们一家人永远幸福美满 ❤️',
    createdAt: '2023-01-15T00:00:00Z',
    members: [
      {
        id: '1',
        name: '小明',
        avatar: '',
        relationship: 'self',
        joinDate: '2023-01-15',
        memoryCount: 128,
        interactionScore: 100,
        isOnline: true,
        role: 'owner',
      },
      {
        id: '2',
        name: '爸爸',
        avatar: '',
        relationship: 'parent',
        joinDate: '2023-01-15',
        memoryCount: 86,
        interactionScore: 78,
        isOnline: true,
        role: 'member',
      },
      {
        id: '3',
        name: '妈妈',
        avatar: '',
        relationship: 'parent',
        joinDate: '2023-01-15',
        memoryCount: 92,
        interactionScore: 85,
        isOnline: false,
        role: 'member',
      },
      {
        id: '4',
        name: '小美',
        avatar: '',
        relationship: 'spouse',
        joinDate: '2023-06-20',
        memoryCount: 45,
        interactionScore: 62,
        isOnline: true,
        role: 'member',
      },
      {
        id: '5',
        name: '奶奶',
        avatar: '',
        relationship: 'relative',
        joinDate: '2023-02-10',
        memoryCount: 38,
        interactionScore: 45,
        isOnline: false,
        role: 'member',
      },
      {
        id: '6',
        name: '小强',
        avatar: '',
        relationship: 'sibling',
        joinDate: '2023-08-05',
        memoryCount: 52,
        interactionScore: 58,
        isOnline: true,
        role: 'member',
      },
    ],
  },
];

// 获取家庭详情
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const family = families.find(f => f.id === id);
  
  if (!family) {
    return res.status(404).json({ error: '家庭不存在' });
  }
  
  res.json(family);
});

// 获取家庭成员
router.get('/:id/members', (req, res) => {
  const { id } = req.params;
  const family = families.find(f => f.id === id);
  
  if (!family) {
    return res.status(404).json({ error: '家庭不存在' });
  }
  
  res.json(family.members);
});

// 更新白板内容
router.put('/:id/whiteboard', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  const family = families.find(f => f.id === id);
  if (!family) {
    return res.status(404).json({ error: '家庭不存在' });
  }
  
  family.whiteboardContent = content;
  res.json({ whiteboardContent: content });
});

// 邀请成员
router.post('/:id/invite', (req, res) => {
  const { id } = req.params;
  const family = families.find(f => f.id === id);
  
  if (!family) {
    return res.status(404).json({ error: '家庭不存在' });
  }
  
  res.json({
    inviteCode: family.inviteCode,
    inviteUrl: `voxora://join/${family.inviteCode}`,
  });
});

// 加入家庭
router.post('/join', (req, res) => {
  const { inviteCode, userId, userName } = req.body;
  
  const family = families.find(f => f.inviteCode === inviteCode);
  if (!family) {
    return res.status(404).json({ error: '邀请码无效' });
  }
  
  // 检查是否已是成员
  const exists = family.members.find(m => m.id === userId);
  if (exists) {
    return res.status(400).json({ error: '已是家庭成员' });
  }
  
  const newMember = {
    id: userId,
    name: userName,
    avatar: '',
    relationship: 'relative',
    joinDate: new Date().toISOString().split('T')[0],
    memoryCount: 0,
    interactionScore: 0,
    isOnline: true,
    role: 'member',
  };
  
  family.members.push(newMember);
  
  res.status(201).json({
    family,
    member: newMember,
  });
});

// 更新成员在线状态
router.put('/:familyId/members/:memberId/status', (req, res) => {
  const { familyId, memberId } = req.params;
  const { isOnline } = req.body;
  
  const family = families.find(f => f.id === familyId);
  if (!family) {
    return res.status(404).json({ error: '家庭不存在' });
  }
  
  const member = family.members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: '成员不存在' });
  }
  
  member.isOnline = isOnline;
  res.json(member);
});

export default router;
