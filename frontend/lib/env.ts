import Constants from 'expo-constants';

function readEnv(key: string): string {
  const fromProcess = process.env[key]?.trim() ?? '';
  if (fromProcess) {
    return fromProcess;
  }

  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return extra?.[key]?.trim() ?? '';
}

export function getSupabaseUrl(): string {
  return readEnv('EXPO_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
}

export function getSupabaseAnonKey(): string {
  return readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export function getApiBaseUrl(): string {
  return (
    readEnv('EXPO_PUBLIC_API_BASE_URL') ||
    readEnv('EXPO_PUBLIC_API_URL') ||
    'http://localhost:8000'
  );
}

export function assertSupabaseEnv(): { url: string; anonKey: string } {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env가 비어 있습니다. frontend/.env에 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY를 backend/.env(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)와 동일하게 설정한 뒤 `npx expo start -c`로 재시작하세요.',
    );
  }

  return { url, anonKey };
}
