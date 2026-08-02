import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { assertSupabaseEnv } from '@/lib/env';

// Node.js 서버 렌더링 시 window 접근 에러 방지용 Storage 어댑터
const ssrSafeStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const { url, anonKey } = assertSupabaseEnv();
    supabaseClient = createClient(url, anonKey, {
      auth: {
        storage: ssrSafeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver);
  },
});

/**
 * Returns a valid Supabase access token.
 * Reuses the current session when present; otherwise signs in anonymously.
 */
export async function getValidAccessToken(): Promise<string> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      sessionError.message || 'Supabase 세션을 확인할 수 없습니다.',
    );
  }

  const existing = sessionData.session?.access_token;
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(error.message || '익명 로그인에 실패했습니다.');
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error('익명 로그인 후 access_token을 받지 못했습니다.');
  }

  return token;
}
