import { useEffect, useRef, useState } from 'react';
import { LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import {
  BootSplash,
  ConnectionErrorHost,
  ResponsiveProvider,
  useA2ZFonts,
} from '@/assets_shared';
import { getOnboardingStatus } from '@/lib/api/onboarding';
import { logHandledApiError } from '@/lib/api/logHandledApiError';

/** 처리된 API 오류는 연결 모달로만 안내 — 하단 LogBox 토스트 완전 차단 */
LogBox.ignoreLogs([
  /ApiRequestError/,
  /Cloudflare/,
  /load error/i,
  /API Error/i,
  /Failed to fetch/i,
  /origin web server/i,
  /unable to reach/i,
  /Network request failed/i,
  /VirtualizedLists should never be nested/,
  /VirtualizedList/,
]);
SplashScreen.preventAutoHideAsync().catch(() => {
  // already hidden / unavailable
});

export default function RootLayout() {
  const [fontsLoaded] = useA2ZFonts();
  const router = useRouter();
  const segments = useSegments();
  const [gateReady, setGateReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    null,
  );
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);
  const devBootRedirected = useRef(false);

  useEffect(() => {
    if (!fontsLoaded) return;

    void SplashScreen.hideAsync()
      .catch(() => undefined)
      .finally(() => setNativeSplashHidden(true));

    // Expo Go 개발: reload마다 온보딩부터 (백엔드 완료 상태 무시)
    if (__DEV__) {
      setOnboardingCompleted(false);
      setGateReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const status = await getOnboardingStatus();
        if (!cancelled) {
          setOnboardingCompleted(status.onboarding_completed);
        }
      } catch (error) {
        logHandledApiError('Onboarding status check failed', error);
        if (!cancelled) {
          setOnboardingCompleted(false);
        }
      } finally {
        if (!cancelled) {
          setGateReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded]);

  const inOnboarding = segments[0] === 'onboarding';

  useEffect(() => {
    if (!gateReady) return;

    if (__DEV__) {
      // reload 시 1회만 온보딩으로 — 관측 시작하기 후 홈 이동은 유지
      if (!devBootRedirected.current) {
        devBootRedirected.current = true;
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
      }
      return;
    }

    if (onboardingCompleted === null) return;

    if (!onboardingCompleted && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (onboardingCompleted && inOnboarding) {
      router.replace('/');
    }
  }, [gateReady, onboardingCompleted, inOnboarding, router]);

  const canShowApp =
    fontsLoaded &&
    nativeSplashHidden &&
    gateReady &&
    (__DEV__ || onboardingCompleted !== null);

  if (!canShowApp) {
    return <BootSplash />;
  }

  const tabScreenOptions = {
    animation: 'none' as const,
    gestureEnabled: false,
    animationTypeForReplace: 'push' as const,
  };

  return (
    <ResponsiveProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#06101f' },
        }}
      >
        <Stack.Screen name="index" options={tabScreenOptions} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="star-record" />
        <Stack.Screen name="galaxy-view" options={tabScreenOptions} />
        <Stack.Screen name="observatory" options={tabScreenOptions} />
        <Stack.Screen name="observatory-report" />
        <Stack.Screen name="comet" options={tabScreenOptions} />
        <Stack.Screen name="mypage" options={tabScreenOptions} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <ConnectionErrorHost />
      <StatusBar style="light" />
    </ResponsiveProvider>
  );
}
