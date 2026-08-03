import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import {
  ClusterIndex,
  getClusterLabelColor,
} from '../clusters';
import { useResponsive } from '../responsive';
import { FontFamily } from '../typography';
import { ClusterPngIcon } from '../stars_png';

export interface ClusterIconProps {
  /** ic_cluster1 ~ ic_cluster5 */
  cluster: ClusterIndex;
  /** 아이콘 아래 표시할 라벨 */
  label: string;
  /** 디자인 px — 기본 52 */
  iconSize?: number;
  onPress?: () => void;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

/** 성단 아이콘 + 하단 라벨 — 크기·폰트 자동 스케일 */
export function ClusterIcon({
  cluster,
  label,
  iconSize = 52,
  onPress,
  style,
  labelStyle,
}: ClusterIconProps) {
  const { scale, fontScale } = useResponsive();
  const labelColor = getClusterLabelColor(cluster);
  const scaledIcon = scale(iconSize);
  const labelFontSize = fontScale(11);

  const content = (
    <View style={[styles.root, { gap: scale(4) }, style]}>
      <ClusterPngIcon cluster={cluster} size={scaledIcon} />
      <Text
        style={[
          styles.label,
          {
            fontSize: labelFontSize,
            letterSpacing: -labelFontSize * 0.01,
            color: labelColor,
          },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  label: {
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
});
