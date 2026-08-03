import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

import { Colors } from '../colors';
import { useResponsive } from '../responsive';
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

/** 태그 버튼 — 높이·폰트가 기기 크기에 맞게 스케일 */
export function TagButton({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
  textStyle,
}: TagButtonProps) {
  const { scale, fontScale } = useResponsive();
  const tagHeight = scale(TAG_HEIGHT);
  const tagFontSize = fontScale(FontSize.tag);
  const isActive = selected;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: tagHeight,
          borderRadius: tagHeight / 2,
          paddingHorizontal: scale(TAG_PADDING_HORIZONTAL),
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
        numberOfLines={1}
        style={[
          styles.label,
          {
            fontSize: tagFontSize,
            lineHeight: tagFontSize,
          },
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
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  label: {
    fontFamily: FontFamily.regular,
    color: Colors.text.tag,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    flexShrink: 0,
  },
  labelActive: {
    color: Colors.text.tag,
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
