import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';

import { Colors } from '../colors';
import { Radii } from '../radii';
import { ScreenLayout, scaleDesign } from '../spacing';
import { FontFamily, FontSize } from '../typography';

export type PrimaryButtonSize = 'large' | 'medium' | 'small';

/** 디자인 프레임(412×917) 기준 크기 — large는 ScreenLayout과 동기화 */
const SIZE_CONFIG: Record<
  PrimaryButtonSize,
  { width: number; height: number; fontSize: number }
> = {
  large: {
    width: ScreenLayout.largeButtonWidth,
    height: ScreenLayout.largeButtonHeight,
    fontSize: FontSize.buttonLarge,
  },
  medium: { width: 230, height: 49, fontSize: FontSize.buttonMedium },
  small: { width: 180.89, height: 40, fontSize: FontSize.buttonSmall },
};

/** PrimaryButton 크기·폰트 토큰 (디자인 px) */
export const PrimaryButtonDimensions = SIZE_CONFIG;

export interface PrimaryButtonProps {
  /** 버튼 라벨 (children 대신 사용 가능) */
  label?: string;
  children?: ReactNode;
  size?: PrimaryButtonSize;
  /** false = 활성화(클릭 가능), true = 비활성화 */
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /**
   * large 전용: 디자인 좌표 (20, 820)에 절대 배치.
   * 기본 true. 기기 화면 비율로 스케일됩니다.
   */
  pinnedToLargeTop?: boolean;
}

/**
 * 큰·중간·작은 primary 버튼
 * - large: 412×917 기준 (20, 820) / 372×60 → 기기 화면 비율 스케일
 * - 비활성: 텍스트 #A4A4A4, 채우기 F8EEC1 15%, 외곽 #A4A4A4
 * - 활성: 텍스트 #FFF9DD, 채우기 F8EEC1 15%, 외곽 F8EEC1 60%
 */
export function PrimaryButton({
  label,
  children,
  size = 'large',
  disabled = false,
  onPress,
  style,
  textStyle,
  pinnedToLargeTop = true,
}: PrimaryButtonProps) {
  const config = SIZE_CONFIG[size];
  const isActive = !disabled;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { x, y, sx, sy } = scaleDesign(windowWidth, windowHeight);

  const isLarge = size === 'large';
  const scaledWidth = isLarge ? x(config.width) : config.width;
  const scaledHeight = isLarge ? y(config.height) : config.height;
  const scaledRadius = isLarge
    ? Math.min(scaledHeight / 2, Radii.button * Math.min(sx, sy))
    : Radii.button;
  const scaledFontSize = isLarge
    ? Math.round(config.fontSize * Math.min(sx, sy))
    : config.fontSize;

  const largePositionStyle: ViewStyle | undefined =
    isLarge && pinnedToLargeTop
      ? {
          position: 'absolute',
          left: x(ScreenLayout.largeButtonLeft),
          top: y(ScreenLayout.largeButtonTop),
          zIndex: 2,
        }
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: scaledWidth,
          height: scaledHeight,
          borderRadius: scaledRadius,
          backgroundColor: Colors.button.fill,
          borderColor: isActive
            ? Colors.button.borderActive
            : Colors.button.borderDisabled,
        },
        largePositionStyle,
        pressed && isActive && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {children ?? (
        <Text
          style={[
            styles.label,
            {
              fontSize: scaledFontSize,
              color: isActive
                ? Colors.text.buttonActive
                : Colors.text.disabled,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
