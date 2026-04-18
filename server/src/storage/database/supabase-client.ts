import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function hasSupabaseEnv(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) ||
    (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY)
  );
}

function loadEnv(): void {
  if (envLoaded || hasSupabaseEnv()) {
    return;
  }

  try {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
      path.resolve(process.cwd(), '../../.env'),
    ];
    for (const p of candidates) {
      dotenv.config({ path: p, override: false });
      if (hasSupabaseEnv()) {
        envLoaded = true;
        return;
      }
    }
  } catch {
    // ignore
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = (process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || '').trim();

  if (!url) {
    throw new Error('SUPABASE_URL or COZE_SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY or COZE_SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  if (token) {
    return createClient(url, key, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient(url, key, {
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
