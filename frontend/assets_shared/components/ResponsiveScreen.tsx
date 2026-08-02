import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export interface ResponsiveScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  /** false면 maxWidth 콘텐츠 래퍼 없이 flex:1만 적용 */
  centered?: boolean;
}

/**
 * 화면 루트 래퍼 — ResponsiveProvider 하위에서 사용.
 * 배경·그라데이션은 full-bleed, 내부 콘텐츠만 centered 옵션으로 가운데 정렬 가능.
 */
export function ResponsiveScreen({
  children,
  style,
  centered = false,
}: ResponsiveScreenProps) {
  if (!centered) {
    return <View style={[styles.root, style]}>{children}</View>;
  }

  return (
    <View style={[styles.root, style]}>
      <View style={styles.centered}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
