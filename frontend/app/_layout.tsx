import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useA2ZFonts, ResponsiveProvider } from '@/assets_shared';
import { getOnboardingStatus } from '@/lib/api/onboarding';

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#06101f',
      }}
    >
      <ActivityIndicator color="#F8EEC1" />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useA2ZFonts();
  const router = useRouter();
  const segments = useSegments();
  const [gateReady, setGateReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    null,
  );
  const devBootRedirected = useRef(false);

  useEffect(() => {
    if (!fontsLoaded) return;

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
        console.error('Onboarding status check failed:', error);
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
    gateReady &&
    (__DEV__ || onboardingCompleted !== null);

  if (!canShowApp) {
    return <LoadingScreen />;
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
      <StatusBar style="light" />
    </ResponsiveProvider>
  );
}