import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useA2ZFonts } from '@/assets_shared';
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

  useEffect(() => {
    if (!fontsLoaded) return;

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
    if (!gateReady || onboardingCompleted === null) return;

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
    onboardingCompleted !== null &&
    (onboardingCompleted ? !inOnboarding : inOnboarding);

  if (!canShowApp) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#06101f' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="star-record" />
        <Stack.Screen name="galaxy-view" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}