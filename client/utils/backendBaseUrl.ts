import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

/** Web / 模拟器本机调试：直连本机后端 */
const WEB_BACKEND = 'http://localhost:19091';

/**
 * 原生（Expo Go / 真机）默认 API 基址：
 * 1) EXPO_PUBLIC_BACKEND_BASE_URL（最高优先级）
 * 2) app.config.js → extra.apiUrl（缺省为公网，与对外发布一致）
 * 3) 回退公网占位（与 start_voxora_clean_dev.sh 顶部 PUBLIC_IP、BACKEND_PORT 一致）
 *
 * 仅局域网、不走端口映射时：把 extra.apiUrl 改成 http://<LAN_IP>:19091 或设环境变量。
 */
const FALLBACK_PUBLIC_BACKEND = 'http://116.237.2.237:19091';

export function getBackendBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (Platform.OS === 'web') {
    return fromEnv ?? WEB_BACKEND;
  }
  return fromEnv ?? extra?.apiUrl ?? FALLBACK_PUBLIC_BACKEND;
}

/** 将后端返回的相对路径（如 /mock-storage/...）补全为可请求的绝对 URL。 */
export function resolveBackendMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBackendBaseUrl().replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}
