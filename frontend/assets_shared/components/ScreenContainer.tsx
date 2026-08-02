import { ReactNode } from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { ScreenLayout } from '../spacing';

export interface ScreenContainerProps extends ViewProps {
  children: ReactNode;
  /** 기본 top(65) 여백 적용 여부 */
  withTopPadding?: boolean;
  /** withTopPadding=true 일 때 사용할 상단 여백 (기본 ScreenLayout.top) */
  topPadding?: number;
  /** 기본 horizontal(20) 여백 적용 여부 */
  withHorizontalPadding?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/** 좌우 20, 위 65 여백이 적용된 화면 래퍼 */
export function ScreenContainer({
  children,
  withTopPadding = true,
  topPadding = ScreenLayout.top,
  withHorizontalPadding = true,
  style,
  contentStyle,
  ...rest
}: ScreenContainerProps) {
  return (
    <View
      style={[
        styles.root,
        withHorizontalPadding && styles.horizontal,
        style,
        contentStyle,
        withTopPadding && { paddingTop: topPadding },
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  horizontal: {
    paddingHorizontal: ScreenLayout.horizontal,
  },
});

export { ScreenLayout };
