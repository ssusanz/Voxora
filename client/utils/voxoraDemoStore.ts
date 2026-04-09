import AsyncStorage from '@react-native-async-storage/async-storage';

export type StressLevel = 'low' | 'medium' | 'high';
export type MemoryType = 'photo' | 'emotion';

export interface SensoryRecord {
  color: string | null;
  weather: string | null;
  book: string | null;
  soundRecorded: boolean;
}

export interface MemoryNode {
  id: string;
  title: string;
  memoryDate: string;
  createdAt: string;
  type: MemoryType;
  mediaUris: string[];
  emotionTags: string[];
  sensory: SensoryRecord;
  archivedUntil: string | null;
  interactionCount: number;
  isAphasiaAuthor: boolean;
  authorId: string;
  bioStressLevel: StressLevel;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatarIcon: 'account' | 'account-heart' | 'account-tie' | 'account-star';
  isAphasia: boolean;
  recentMood: string;
  activityLevel: 'low' | 'medium' | 'high';
}

export interface WearableAlert {
  id: string;
  level: 'normal' | 'high';
  message: string;
  createdAt: string;
}

export interface ExpressionSignal {
  id: string;
  fromMemberId: string;
  emotion: string;
  cardColor: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface NfcBinding {
  tagId: string;
  memoryId: string;
  emotion: string;
}

export interface VoxoraDemoState {
  memories: MemoryNode[];
  familyMembers: FamilyMember[];
  petEnergy: number;
  whiteboardNotes: string[];
  wearableAlert: WearableAlert | null;
  expressionSignal: ExpressionSignal | null;
  nfcBindings: NfcBinding[];
  activeViewers: number;
}

export interface CreateMemoryPayload {
  title: string;
  memoryDate: string;
  type: MemoryType;
  mediaUris: string[];
  emotionTags: string[];
  sensory: SensoryRecord;
  archivedUntil: string | null;
  isAphasiaAuthor: boolean;
  authorId: string;
}

const STORAGE_KEY = '@voxora_demo_state_v2';

const EMOTION_COLORS: Record<string, string> = {
  喜悦: '#F9C74F',
  平静: '#4CC9F0',
  想念: '#B388EB',
  紧张: '#EF476F',
  希望: '#80ED99',
  温暖: '#FFD6A5',
};

const randomId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const stressFromEmotion = (emotion: string): StressLevel => {
  if (emotion === '紧张') return 'high';
  if (emotion === '平静') return 'low';
  return 'medium';
};

const seedState = (): VoxoraDemoState => {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const iso = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();
  const day = (offsetDays: number) => new Date(now.getTime() + offsetDays * oneDay).toISOString().slice(0, 10);

  const familyMembers: FamilyMember[] = [
    {
      id: 'm_creator',
      name: '林言',
      role: '创建者',
      avatarIcon: 'account',
      isAphasia: false,
      recentMood: '温暖',
      activityLevel: 'high',
    },
    {
      id: 'm_aphasia',
      name: '安安',
      role: '失语症成员',
      avatarIcon: 'account-heart',
      isAphasia: true,
      recentMood: '想念',
      activityLevel: 'medium',
    },
    {
      id: 'm_father',
      name: '周叔',
      role: '家人',
      avatarIcon: 'account-tie',
      isAphasia: false,
      recentMood: '平静',
      activityLevel: 'low',
    },
    {
      id: 'm_sister',
      name: '小雨',
      role: '家人',
      avatarIcon: 'account-star',
      isAphasia: false,
      recentMood: '喜悦',
      activityLevel: 'high',
    },
  ];

  const memories: MemoryNode[] = [
    {
      id: 'seed_1',
      title: '傍晚阳台的风',
      memoryDate: day(-1),
      createdAt: iso(-2 * 60 * 60 * 1000),
      type: 'emotion',
      mediaUris: [],
      emotionTags: ['平静'],
      sensory: {
        color: '海盐蓝',
        weather: '微风',
        book: '诗集',
        soundRecorded: true,
      },
      archivedUntil: null,
      interactionCount: 2,
      isAphasiaAuthor: true,
      authorId: 'm_aphasia',
      bioStressLevel: 'low',
    },
    {
      id: 'seed_2',
      title: '晚餐前的笑声',
      memoryDate: day(-2),
      createdAt: iso(-35 * 60 * 60 * 1000),
      type: 'photo',
      mediaUris: [],
      emotionTags: ['喜悦'],
      sensory: {
        color: '琥珀黄',
        weather: '晴朗',
        book: '旅行册',
        soundRecorded: false,
      },
      archivedUntil: null,
      interactionCount: 1,
      isAphasiaAuthor: false,
      authorId: 'm_creator',
      bioStressLevel: 'medium',
    },
    {
      id: 'seed_3',
      title: '无声的想念',
      memoryDate: day(-5),
      createdAt: iso(-5 * oneDay),
      type: 'emotion',
      mediaUris: [],
      emotionTags: ['想念'],
      sensory: {
        color: '暮光紫',
        weather: '小雨',
        book: '旧相册',
        soundRecorded: true,
      },
      archivedUntil: day(3),
      interactionCount: 0,
      isAphasiaAuthor: true,
      authorId: 'm_aphasia',
      bioStressLevel: 'high',
    },
  ];

  return {
    memories,
    familyMembers,
    petEnergy: 36,
    whiteboardNotes: ['每周日晚一起看老照片', '下次家庭聚餐前写一条无声留言'],
    wearableAlert: null,
    expressionSignal: {
      id: randomId('signal'),
      fromMemberId: 'm_aphasia',
      emotion: '想念',
      cardColor: EMOTION_COLORS['想念'],
      createdAt: iso(-15 * 60 * 1000),
      acknowledged: false,
    },
    nfcBindings: [{ tagId: 'bedside-miss-you', memoryId: 'seed_3', emotion: '想念' }],
    activeViewers: 1,
  };
};

const readRawState = async (): Promise<VoxoraDemoState> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as VoxoraDemoState;
    if (!Array.isArray(parsed.memories) || !Array.isArray(parsed.familyMembers)) {
      throw new Error('invalid schema');
    }
    return parsed;
  } catch {
    const seeded = seedState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const writeRawState = async (state: VoxoraDemoState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const sorted = (memories: MemoryNode[]): MemoryNode[] => {
  return [...memories].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const getDemoState = async (): Promise<VoxoraDemoState> => {
  const state = await readRawState();
  return {
    ...state,
    memories: sorted(state.memories),
  };
};

export const setActiveViewers = async (count: number): Promise<void> => {
  const state = await readRawState();
  const sanitized = Number.isFinite(count) ? Math.max(1, Math.min(8, Math.floor(count))) : 1;
  await writeRawState({
    ...state,
    activeViewers: sanitized,
  });
};

export const getMemoryById = async (memoryId: string): Promise<MemoryNode | null> => {
  const state = await readRawState();
  return state.memories.find((item) => item.id === memoryId) ?? null;
};

export const createMemory = async (payload: CreateMemoryPayload): Promise<MemoryNode> => {
  const state = await readRawState();
  const emotionForStress = payload.emotionTags[0] ?? '平静';
  const newMemory: MemoryNode = {
    id: randomId('memory'),
    title: payload.title,
    memoryDate: payload.memoryDate,
    createdAt: new Date().toISOString(),
    type: payload.type,
    mediaUris: payload.mediaUris,
    emotionTags: payload.emotionTags,
    sensory: payload.sensory,
    archivedUntil: payload.archivedUntil,
    interactionCount: 0,
    isAphasiaAuthor: payload.isAphasiaAuthor,
    authorId: payload.authorId,
    bioStressLevel: stressFromEmotion(emotionForStress),
  };

  const nextEnergy = Math.min(100, state.petEnergy + (payload.isAphasiaAuthor ? 10 : 6));
  const nextState: VoxoraDemoState = {
    ...state,
    memories: sorted([newMemory, ...state.memories]),
    petEnergy: nextEnergy,
  };

  await writeRawState(nextState);
  return newMemory;
};

export const quickCreateEmotionSnapshot = async (
  emotion: string,
  authorId = 'm_aphasia'
): Promise<MemoryNode> => {
  return createMemory({
    title: `${emotion}情感快照`,
    memoryDate: new Date().toISOString().slice(0, 10),
    type: 'emotion',
    mediaUris: [],
    emotionTags: [emotion],
    sensory: {
      color: emotion === '喜悦' ? '曙光橙' : emotion === '平静' ? '海盐蓝' : '暮光紫',
      weather: null,
      book: null,
      soundRecorded: false,
    },
    archivedUntil: null,
    isAphasiaAuthor: true,
    authorId,
  });
};

export const interactWithMemory = async (memoryId: string): Promise<void> => {
  const state = await readRawState();
  const memories = state.memories.map((item) =>
    item.id === memoryId
      ? {
          ...item,
          interactionCount: item.interactionCount + 1,
        }
      : item
  );
  await writeRawState({
    ...state,
    memories,
    petEnergy: Math.min(100, state.petEnergy + 3),
  });
};

export const simulateWearableAlert = async (): Promise<void> => {
  const state = await readRawState();
  const alert: WearableAlert = {
    id: randomId('alert'),
    level: 'high',
    message: '检测到家人情绪波动，已触发温柔提醒。',
    createdAt: new Date().toISOString(),
  };
  await writeRawState({
    ...state,
    wearableAlert: alert,
  });
};

export const dismissWearableAlert = async (): Promise<void> => {
  const state = await readRawState();
  await writeRawState({
    ...state,
    wearableAlert: null,
  });
};

export const sendExpressionSignal = async (
  fromMemberId: string,
  emotion: string
): Promise<void> => {
  const state = await readRawState();
  await writeRawState({
    ...state,
    expressionSignal: {
      id: randomId('signal'),
      fromMemberId,
      emotion,
      cardColor: EMOTION_COLORS[emotion] ?? '#B388EB',
      createdAt: new Date().toISOString(),
      acknowledged: false,
    },
  });
};

export const acknowledgeExpressionSignal = async (): Promise<void> => {
  const state = await readRawState();
  if (!state.expressionSignal) return;
  await writeRawState({
    ...state,
    expressionSignal: {
      ...state.expressionSignal,
      acknowledged: true,
    },
  });
};

export const appendWhiteboardNote = async (note: string): Promise<void> => {
  const clean = note.trim();
  if (!clean) return;
  const state = await readRawState();
  await writeRawState({
    ...state,
    whiteboardNotes: [clean, ...state.whiteboardNotes].slice(0, 8),
  });
};

export const bindMemoryToNfcTag = async (
  memoryId: string,
  tagId: string,
  emotion: string
): Promise<void> => {
  const cleanTag = tagId.trim().toLowerCase();
  if (!cleanTag) return;

  const state = await readRawState();
  const filtered = state.nfcBindings.filter((item) => item.tagId !== cleanTag);
  await writeRawState({
    ...state,
    nfcBindings: [...filtered, { tagId: cleanTag, memoryId, emotion }],
  });
};

export const resolveMemoryByNfcTag = async (tagId: string): Promise<MemoryNode | null> => {
  const cleanTag = tagId.trim().toLowerCase();
  if (!cleanTag) return null;

  const state = await readRawState();
  const binding = state.nfcBindings.find((item) => item.tagId === cleanTag);
  if (!binding) return null;
  return state.memories.find((item) => item.id === binding.memoryId) ?? null;
};

export const stressLevelColor = (level: StressLevel): string => {
  if (level === 'low') return '#4CC9F0';
  if (level === 'high') return '#EF476F';
  return '#B388EB';
};
