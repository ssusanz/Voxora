/**
 * API 服务层
 * 封装所有与后端的 API 调用
 */

import { getBackendBaseUrl } from '@/utils/backend';

/**
 * 通用的 fetch 封装
 * 注意：每次请求解析基址，避免模块加载时（独立包尚无 Metro 推断）把 localhost 写死进 APK。
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBackendBaseUrl()}/api/v1${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== 回忆 API ====================

export interface Memory {
  id: string;
  title: string;
  coverImage: string;
  date: string;
  location: string;
  isMultiUser: boolean;
  userCount: number;
  weather: string;
  mood: string;
  images: string[];
  likes: number;
  userId: string;
  familyId: string;
  isSealed?: boolean;
  unlockDate?: string;
  participants?: { id: string; name: string; avatar: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryInput {
  title: string;
  date: string;
  location?: string;
  weather?: string;
  mood?: string;
  images?: string[];
  userId?: string;
  familyId?: string;
  isSealed?: boolean;
  unlockDate?: string;
}

/**
 * 获取回忆列表
 */
export async function getMemories(familyId?: string, page = 1, limit = 20): Promise<{
  data: Memory[];
  total: number;
  page: number;
  limit: number;
}> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(familyId && { familyId }),
  });
  return request(`/memories?${params}`);
}

/**
 * 获取单个回忆详情
 */
export async function getMemory(id: string): Promise<Memory> {
  return request(`/memories/${id}`);
}

/**
 * 创建回忆
 */
export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  return request('/memories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * 更新回忆
 */
export async function updateMemory(id: string, input: Partial<CreateMemoryInput>): Promise<Memory> {
  return request(`/memories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * 删除回忆
 */
export async function deleteMemory(id: string): Promise<{ success: boolean }> {
  return request(`/memories/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 点赞回忆
 */
export async function likeMemory(id: string): Promise<{ likes: number }> {
  return request(`/memories/${id}/like`, {
    method: 'POST',
  });
}

/**
 * 评论回忆
 */
export async function commentMemory(
  id: string,
  content: string,
  userId: string,
  userName: string
): Promise<{ id: string; content: string; userId: string; userName: string; timestamp: string }> {
  return request(`/memories/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, userId, userName }),
  });
}

// ==================== 家庭 API ====================

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  relationship: string;
  joinDate: string;
  memoryCount: number;
  interactionScore: number;
  isOnline: boolean;
  role: string;
}

export interface Family {
  id: string;
  name: string;
  avatar: string;
  inviteCode: string;
  whiteboardContent: string;
  members: FamilyMember[];
  createdAt: string;
}

/**
 * 获取家庭详情
 */
export async function getFamily(id: string): Promise<Family> {
  return request(`/families/${id}`);
}

/**
 * 获取家庭成员列表
 */
export async function getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  return request(`/families/${familyId}/members`);
}

/**
 * 更新白板内容
 */
export async function updateWhiteboard(familyId: string, content: string): Promise<{ whiteboardContent: string }> {
  return request(`/families/${familyId}/whiteboard`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

/**
 * 邀请成员
 */
export async function inviteMember(familyId: string): Promise<{ inviteCode: string; inviteUrl: string }> {
  return request(`/families/${familyId}/invite`, {
    method: 'POST',
  });
}

/**
 * 加入家庭
 */
export async function joinFamily(inviteCode: string, userId: string, userName: string): Promise<{
  family: Family;
  member: FamilyMember;
}> {
  return request('/families/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, userId, userName }),
  });
}

/**
 * 更新成员在线状态
 */
export async function updateMemberStatus(
  familyId: string,
  memberId: string,
  isOnline: boolean
): Promise<FamilyMember> {
  return request(`/families/${familyId}/members/${memberId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ isOnline }),
  });
}

// ==================== 宠物 API ====================

export interface Pet {
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

export interface EnergySource {
  id: string;
  type: 'memory' | 'like' | 'comment' | 'family';
  description: string;
  amount: number;
  timestamp: string;
  fromMember: string;
}

/**
 * 获取宠物信息
 */
export async function getPet(familyId: string): Promise<Pet> {
  return request(`/pets/${familyId}`);
}

/**
 * 获取能量来源历史
 */
export async function getEnergySources(familyId: string, limit = 20): Promise<EnergySource[]> {
  return request(`/pets/${familyId}/energy-sources?limit=${limit}`);
}

/**
 * 添加能量
 */
export async function addPetEnergy(
  familyId: string,
  type: 'memory' | 'like' | 'comment' | 'family',
  amount: number,
  fromMember: string,
  description?: string
): Promise<{
  pet: Pet;
  source: EnergySource;
  leveledUp?: number;
  evolved?: number;
}> {
  return request(`/pets/${familyId}/energy`, {
    method: 'POST',
    body: JSON.stringify({ type, amount, fromMember, description }),
  });
}

/**
 * 喂养宠物
 */
export async function feedPet(familyId: string): Promise<Pet> {
  return request(`/pets/${familyId}/feed`, {
    method: 'POST',
  });
}

// ==================== 用户 API ====================

export interface User {
  id: string;
  name: string;
  email: string;
  familyId: string;
  avatar: string;
  createdAt: string;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  return request('/users/me');
}

/**
 * 更新用户信息
 */
export async function updateUser(input: { name?: string; avatar?: string }): Promise<User> {
  return request('/users/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

// ==================== NFC API ====================

export interface NfcTagBinding {
  tagId: string;
  memoryId?: string;
  familyId: string;
}

/**
 * 获取 NFC 标签绑定信息
 */
export async function getNfcTagBinding(tagId: string): Promise<NfcTagBinding> {
  return request(`/nfc/${tagId}`);
}

/**
 * 绑定 NFC 标签到回忆
 */
export async function bindNfcTag(tagId: string, memoryId: string): Promise<{
  success: boolean;
  tagId: string;
  memoryId: string;
  boundAt: string;
}> {
  return request(`/nfc/${tagId}/bind`, {
    method: 'POST',
    body: JSON.stringify({ memoryId }),
  });
}
