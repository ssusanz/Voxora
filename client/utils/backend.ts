import Constants from 'expo-constants';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isProbablyLocalhost(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
}

function normalizeHttpUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return stripTrailingSlash(trimmed);
  // Allow users to set "116.237.2.237:19091" in env without scheme.
  return stripTrailingSlash(`http://${trimmed.replace(/^\/+/, '')}`);
}

function getExpoHost(): string | undefined {
  // Highest-signal for voxora-deploy.sh:
  // - EXPO_PACKAGER_PROXY_URL is set to "http://<PUBLIC_IP>:<METRO_PORT>"
  // - REACT_NATIVE_PACKAGER_HOSTNAME is set to "<PUBLIC_IP>"
  const proxy = process.env.EXPO_PACKAGER_PROXY_URL;
  if (typeof proxy === 'string' && proxy.length > 0) {
    try {
      const u = new URL(proxy);
      return u.host; // include port when present
    } catch {
      // ignore
    }
  }

  const packagerHostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (typeof packagerHostname === 'string' && packagerHostname.length > 0) {
    return packagerHostname;
  }

  // Common cases:
  // - Constants.expoConfig.hostUri: "116.237.2.237:18081"
  // - Constants.manifest2.extra.expoGo.debuggerHost: "192.168.1.13:18081"
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
    // e.g. exp://116.237.2.237:18081
    const m = linkingUri.match(/^[a-z]+:\/\/([^/]+)/i);
    if (m?.[1]) return m[1];
  }

  return undefined;
}

function inferBackendPortFromExpoHost(host: string): number {
  const [, maybePort] = host.split(':');
  const metroPort = maybePort ? Number(maybePort) : undefined;
  // voxora-deploy.sh uses METRO_PORT=18081 and BACKEND_PORT=19091
  if (metroPort === 18081) return 19091;
  // If we only know hostname (no port), default to deploy backend port.
  if (!metroPort) return 19091;
  return 9091;
}

export function getBackendBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (typeof env === 'string' && env.trim().length > 0 && !isProbablyLocalhost(env)) {
    return normalizeHttpUrl(env);
  }

  const host = getExpoHost();
  if (host) {
    const hostnameOnly = host.split(':')[0];
    const port = inferBackendPortFromExpoHost(host);
    return normalizeHttpUrl(`http://${hostnameOnly}:${port}`);
  }

  // Last resort for local web/dev
  return normalizeHttpUrl(env && env.trim().length > 0 ? env : 'http://localhost:9091');
}

