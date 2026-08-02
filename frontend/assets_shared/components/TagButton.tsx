import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

import { Colors } from '../colors';
import { FontFamily, FontSize } from '../typography';

const TAG_HEIGHT = 40;
const TAG_PADDING_HORIZONTAL = 14;
const TAG_BORDER_WIDTH = 2;

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
 * 태그 버튼 (높이 40, 가로는 텍스트 길이에 맞춤)
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
          height: TAG_HEIGHT,
          borderRadius: TAG_HEIGHT / 2,
          backgroundColor: isActive
            ? Colors.tag.fillActive
            : Colors.tag.fillInactive,
          borderColor: isActive
            ? Colors.tag.borderActive
            : Colors.tag.borderInactive,
          borderWidth: TAG_BORDER_WIDTH,
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
    paddingHorizontal: TAG_PADDING_HORIZONTAL,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.tag,
    lineHeight: FontSize.tag + 6,
    color: Colors.text.tag,
    textAlign: 'center',
    flexShrink: 0,
  },
  labelActive: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.tag,
    lineHeight: FontSize.tag + 6,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});

export const TagButtonDimensions = {
  height: TAG_HEIGHT,
  paddingHorizontal: TAG_PADDING_HORIZONTAL,
} as const;
