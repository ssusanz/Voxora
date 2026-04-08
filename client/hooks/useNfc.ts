import { useState, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';

/**
 * NFC 交互 Hook
 * 用于读取 NFC 标签并跳转到对应的回忆详情页
 * 
 * 注意：在开发环境中，NFC 功能可能不可用，
 * 可以使用模拟模式进行测试
 */
export interface NfcTagData {
  id: string;
  memoryId?: string;
  familyId?: string;
  timestamp: string;
}

interface UseNfcReturn {
  isSupported: boolean;
  isEnabled: boolean;
  lastTag: NfcTagData | null;
  isScanning: boolean;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  writeNfcTag: (memoryId: string) => Promise<boolean>;
}

// 模拟 NFC 标签数据（开发环境使用）
const mockNfcTags: Record<string, NfcTagData> = {
  'TAG_001': { id: 'TAG_001', memoryId: '1', familyId: 'family_1', timestamp: new Date().toISOString() },
  'TAG_002': { id: 'TAG_002', memoryId: '2', familyId: 'family_1', timestamp: new Date().toISOString() },
  'TAG_003': { id: 'TAG_003', memoryId: '3', familyId: 'family_1', timestamp: new Date().toISOString() },
};

/**
 * 开发环境模拟 NFC 扫描
 * 实际 NFC 功能需要 expo-nfc-manager 支持
 */
export function useNfc(): UseNfcReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [lastTag, setLastTag] = useState<NfcTagData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScanning = useCallback(async () => {
    setError(null);
    setIsScanning(true);
    setLastTag(null);

    // 模拟 2 秒后随机返回一个标签
    setTimeout(() => {
      const tags = Object.values(mockNfcTags);
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      setLastTag({
        ...randomTag,
        timestamp: new Date().toISOString(),
      });
      setIsScanning(false);
    }, 2000);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  const writeNfcTag = useCallback(async (memoryId: string): Promise<boolean> => {
    // 模拟写入成功
    return true;
  }, []);

  return {
    isSupported: true,
    isEnabled: true,
    lastTag,
    isScanning,
    error,
    startScanning,
    stopScanning,
    writeNfcTag,
  };
}
