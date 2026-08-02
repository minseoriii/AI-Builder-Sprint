import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { Colors } from '../colors';
import { useResponsive } from '../responsive';
import { FontFamily, FontSize } from '../typography';

export type PrimaryButtonSize = 'large' | 'medium' | 'small';

const SIZE_CONFIG: Record<
  PrimaryButtonSize,
  { width: number; height: number; fontSize: number }
> = {
  large: { width: 372, height: 60, fontSize: FontSize.buttonLarge },
  medium: { width: 230, height: 49, fontSize: FontSize.buttonMedium },
  small: { width: 180.89, height: 40, fontSize: FontSize.buttonSmall },
};

/** PrimaryButton 디자인 기준 크기·폰트 토큰 */
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
}

/**
 * 큰·중간·작은 primary 버튼 — 기기 너비에 맞게 스케일
 */
export function PrimaryButton({
  label,
  children,
  size = 'large',
  disabled = false,
  onPress,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const { scale, fontScale, width: screenWidth } = useResponsive();
  const design = SIZE_CONFIG[size];
  const buttonWidth = Math.min(scale(design.width), screenWidth - scale(40));
  const buttonHeight = scale(design.height);
  const isActive = !disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: buttonWidth,
          height: buttonHeight,
          borderRadius: buttonHeight / 2,
          backgroundColor: Colors.button.fill,
          borderColor: isActive
            ? Colors.button.borderActive
            : Colors.button.borderDisabled,
        },
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
              fontSize: fontScale(design.fontSize),
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
