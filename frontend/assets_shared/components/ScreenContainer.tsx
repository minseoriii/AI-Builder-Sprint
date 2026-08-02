import { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette } from '../colors';
import { useResponsive } from '../responsive';
import { ScreenLayout } from '../spacing';

export interface ScreenContainerProps extends ViewProps {
  children: ReactNode;
  /** 기본 top(65) 여백 적용 여부 */
  withTopPadding?: boolean;
  /** withTopPadding=true 일 때 사용할 상단 여백 (디자인 px, 자동 스케일) */
  topPadding?: number;
  /** 기본 horizontal(20) 여백 적용 여부 */
  withHorizontalPadding?: boolean;
  /** Safe Area(상·하) 적용 — 안드로이드 포함 */
  withSafeArea?: boolean;
  /** pull-to-refresh 콜백 — 있으면 ScrollView + RefreshControl */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/** 좌우·상단 여백이 기기 크기에 맞게 스케일되는 화면 래퍼 */
export function ScreenContainer({
  children,
  withTopPadding = true,
  topPadding = ScreenLayout.top,
  withHorizontalPadding = true,
  withSafeArea = false,
  onRefresh,
  refreshing = false,
  style,
  contentStyle,
  ...rest
}: ScreenContainerProps) {
  const { scale } = useResponsive();

  const paddingStyle: ViewStyle = {
    ...(withHorizontalPadding
      ? { paddingHorizontal: scale(ScreenLayout.horizontal) }
      : null),
    ...(withTopPadding ? { paddingTop: scale(topPadding) } : null),
  };

  let content: ReactNode;

  if (onRefresh) {
    content = (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, paddingStyle, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={Palette.cream}
            colors={[Palette.cream]}
          />
        }
      >
        {children}
      </ScrollView>
    );
  } else {
    content = (
      <View style={[styles.root, paddingStyle, contentStyle]} {...rest}>
        {children}
      </View>
    );
  }

  if (withSafeArea) {
    return (
      <SafeAreaView style={[styles.root, style]} edges={['top', 'bottom']}>
        {content}
      </SafeAreaView>
    );
  }

  if (onRefresh) {
    return <View style={[styles.root, style]}>{content}</View>;
  }

  return (
    <View style={[styles.root, paddingStyle, style, contentStyle]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export { ScreenLayout };
