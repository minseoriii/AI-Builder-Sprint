import { ReactNode } from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

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
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/** 좌우·상단 여백이 기기 크기에 맞게 스케일되는 화면 래퍼 */
export function ScreenContainer({
  children,
  withTopPadding = true,
  topPadding = ScreenLayout.top,
  withHorizontalPadding = true,
  style,
  contentStyle,
  ...rest
}: ScreenContainerProps) {
  const { scale } = useResponsive();

  return (
    <View
      style={[
        styles.root,
        withHorizontalPadding && { paddingHorizontal: scale(ScreenLayout.horizontal) },
        style,
        contentStyle,
        withTopPadding && { paddingTop: scale(topPadding) },
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
});

export { ScreenLayout };
