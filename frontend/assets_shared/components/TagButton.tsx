import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

import { Colors } from '../colors';
import { Radii } from '../radii';
import { FontFamily, FontSize } from '../typography';

const TAG_WIDTH = 89;
const TAG_HEIGHT = 40;
const BORDER_WIDTH_INACTIVE = 1;
const BORDER_WIDTH_ACTIVE = 2;

export interface TagButtonProps {
  label: string;
  /** true = 선택·활성(클릭됨) */
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * 태그 버튼 (89×40, 폰트 14)
 * - 비활성: 텍스트 F8EEC1, 외곽 F8EEC1 60%, 채우기 F8EEC1 30%
 * - 활성: 텍스트 F8EEC1 bold, 외곽 F8EEC1 2px, 채우기 F8EEC1 45%
 */
export function TagButton({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
  textStyle,
}: TagButtonProps) {
  const isActive = selected;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: TAG_WIDTH,
          height: TAG_HEIGHT,
          borderRadius: Radii.tag,
          backgroundColor: isActive
            ? Colors.tag.fillActive
            : Colors.tag.fillInactive,
          borderColor: isActive
            ? Colors.tag.borderActive
            : Colors.tag.borderInactive,
          borderWidth: isActive ? BORDER_WIDTH_ACTIVE : BORDER_WIDTH_INACTIVE,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <Text
        style={[
          styles.label,
          isActive && styles.labelActive,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.tag,
    color: Colors.text.tag,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});

export const TagButtonDimensions = {
  width: TAG_WIDTH,
  height: TAG_HEIGHT,
} as const;
