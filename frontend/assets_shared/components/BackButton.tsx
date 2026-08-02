import {
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface BackButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  /** 기본 32 — 온보딩 등에서 더 크게 쓸 때 조절 */
  iconSize?: number;
}

function BackChevron({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 화면 좌상단 뒤로가기 — ScreenLayout.top 여백과 함께 사용 */
export function BackButton({
  onPress,
  disabled = false,
  style,
  iconSize = 32,
}: BackButtonProps) {
  const hitSize = Math.max(52, iconSize + 20);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: hitSize,
          height: hitSize,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="뒤로가기"
      accessibilityState={{ disabled }}
    >
      <BackChevron size={iconSize} />
    </Pressable>
  );
}

/** StarRecord 등 기존 TouchableOpacity 호환 래퍼 */
export function BackButtonTouchable({
  onPress,
  disabled,
  style,
  iconSize = 28,
}: BackButtonProps) {
  const hitSize = Math.max(48, iconSize + 20);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, { width: hitSize, height: hitSize }, style]}
      accessibilityLabel="뒤로가기"
      activeOpacity={0.7}
    >
      <BackChevron size={iconSize} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
