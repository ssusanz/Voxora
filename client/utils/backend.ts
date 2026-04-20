import Constants from 'expo-constants';
import { Platform } from 'react-native';

let warnedLocalhostInStandalone = false;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isProbablyLocalhost(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
}

function normalizeHttpUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return stripTrailingSlash(trimmed);
  // Allow users to set "host:port" in env without scheme.
  return stripTrailingSlash(`http://${trimmed.replace(/^\/+/, '')}`);
}

function withHttpScheme(url: string): string {
  const t = url.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `http://${t.replace(/^\/+/, '')}`;
}

/** True when both strings refer to the same origin (scheme+host+port). */
function sameHttpOrigin(a: string, b: string): boolean {
  try {
    return new URL(withHttpScheme(a)).origin === new URL(withHttpScheme(b)).origin;
  } catch {
    return false;
  }
}

function getExpoHost(): string | undefined {
  const proxy = process.env.EXPO_PACKAGER_PROXY_URL?.trim();
  const backend = process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim();

  // Root `pnpm dev` runs `.cozeproj/scripts/dev_run.sh`, which sets EXPO_PACKAGER_PROXY_URL === EXPO_PUBLIC_BACKEND_BASE_URL
  // (both point at the API). That is NOT the Metro packager host — skip so we fall through to Constants / RN hostname.
  if (proxy) {
    const proxyIsApiOrigin = Boolean(backend && sameHttpOrigin(proxy, backend));
    if (!proxyIsApiOrigin) {
      try {
        const u = new URL(withHttpScheme(proxy));
        return u.host;
      } catch {
        // ignore
      }
    }
  }

  // Local device / scripts: packager proxy is a real Metro URL (host + bundler port)
  // - e.g. EXPO_PACKAGER_PROXY_URL=http://<PUBLIC_IP>:<METRO_PORT>
  // - REACT_NATIVE_PACKAGER_HOSTNAME=<PUBLIC_IP>

  const packagerHostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (typeof packagerHostname === 'string' && packagerHostname.length > 0) {
    return packagerHostname;
  }

  // Common cases:
  // - Constants.expoConfig.hostUri: "host:metroPort"
  // - Constants.manifest2.extra.expoGo.debuggerHost: "192.168.x.x:port"
  const hostUri = (Constants.expoConfig as any)?.hostUri as string | undefined;
  if (hostUri) return hostUri.split('/')[0];

  const expoGoDebuggerHost = (Constants as any)?.expoGoConfig?.debuggerHost;
  if (typeof expoGoDebuggerHost === 'string' && expoGoDebuggerHost.length > 0) {
    return expoGoDebuggerHost.split('/')[0];
  }

  const debuggerHost =
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any)?.manifest?.debuggerHost;
  if (typeof debuggerHost === 'string' && debuggerHost.length > 0) return debuggerHost.split('/')[0];

  const linkingUri = (Constants as any)?.linkingUri as string | undefined;
  if (typeof linkingUri === 'string' && linkingUri.length > 0) {
    // e.g. exp://host:metroPort
    const m = linkingUri.match(/^[a-z]+:\/\/([^/]+)/i);
    if (m?.[1]) return m[1];
  }

  return undefined;
}

function inferBackendPortFromExpoHost(host: string): number {
  const [hostname, maybePort] = host.split(':');
  const metroPort = maybePort ? Number(maybePort) : undefined;
  // 外网脚本：Metro 18081 → 后端 19091
  if (metroPort === 18081) return 19091;
  // 本机 / 常见 Expo：8081 → 后端 9091
  if (metroPort === 8081) return 9091;
  // 本仓库 dev_run.sh 默认 Expo 端口（EXPO_PORT=5000，见 .cozeproj/scripts/dev_run.sh）
  if (metroPort === 5000) return 9091;
  if (!metroPort) {
    if (/^(localhost|127\.0\.0\.1)$/i.test(hostname)) return 9091;
    // 仅主机名（常见于 REACT_NATIVE_PACKAGER_HOSTNAME=公网 IP）：对齐外网映射常用后端端口
    return 19091;
  }
  return 9091;
}

function getBackendFromExpoExtra(): string {
  const extra = Constants.expoConfig?.extra as { backendBaseUrl?: string } | undefined;
  const v = typeof extra?.backendBaseUrl === 'string' ? extra.backendBaseUrl.trim() : '';
  return v;
}

export function getBackendBaseUrl(): string {
  const env = (process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim() || getBackendFromExpoExtra()).trim();
  if (env) {
    if (!isProbablyLocalhost(env)) {
      return normalizeHttpUrl(env);
    }
    // localhost：Web 直连本机后端；真机仍配 localhost 时继续走 Expo host 推断
    if (Platform.OS === 'web') {
      return normalizeHttpUrl(env);
    }
  }

  const host = getExpoHost();
  if (host) {
    const hostnameOnly = host.split(':')[0];
    const port = inferBackendPortFromExpoHost(host);
    return normalizeHttpUrl(`http://${hostnameOnly}:${port}`);
  }

  const fallback = normalizeHttpUrl(env && env.length > 0 ? env : 'http://localhost:9091');

  if (
    !warnedLocalhostInStandalone &&
    typeof __DEV__ !== 'undefined' &&
    !__DEV__ &&
    Platform.OS !== 'web' &&
    isProbablyLocalhost(fallback)
  ) {
    warnedLocalhostInStandalone = true;
    console.warn(
      '[Voxora] API 基址为 localhost：EAS/Release 安装包无法访问你电脑上的后端，列表会为空。请用 `EXPO_PUBLIC_BACKEND_BASE_URL=https://你的API`（或公网 IP+端口）重新执行 eas build，并确保手机网络能访问该地址。'
    );
  }

  return fallback;
}

