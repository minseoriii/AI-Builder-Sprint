import {
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useResponsive } from '../responsive';

export interface BackButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  /** 디자인 px — 기본 32 */
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

/** 화면 좌상단 뒤로가기 — 터치 영역·아이콘 자동 스케일 */
export function BackButton({
  onPress,
  disabled = false,
  style,
  iconSize = 32,
}: BackButtonProps) {
  const { scale } = useResponsive();
  const scaledIcon = scale(iconSize);
  const hitSize = Math.max(scale(52), scaledIcon + scale(20));

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
      <BackChevron size={scaledIcon} />
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
  const { scale } = useResponsive();
  const scaledIcon = scale(iconSize);
  const hitSize = Math.max(scale(48), scaledIcon + scale(20));

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, { width: hitSize, height: hitSize }, style]}
      accessibilityLabel="뒤로가기"
      activeOpacity={0.7}
    >
      <BackChevron size={scaledIcon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
