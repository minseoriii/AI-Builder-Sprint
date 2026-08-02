import { useFonts } from 'expo-font';

/** A2Z(에이투지체) 폰트 로드 — RootLayout에서 1회 호출 */
export function useA2ZFonts() {
  return useFonts({
    'A2Z-Regular': require('./A2Z-Regular.ttf'),
    'A2Z-Medium': require('./A2Z-Medium.ttf'),
    'A2Z-Bold': require('./A2Z-Bold.ttf'),
  });
}

export { FontFamily } from '../typography';
