import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import {
  ClusterIndex,
  getClusterLabelColor,
} from '../clusters';
import { FontFamily } from '../typography';
import { ClusterSvgIcon } from '../svg/ClusterIcons';

export interface ClusterIconProps {
  /** ic_cluster1 ~ ic_cluster5 */
  cluster: ClusterIndex;
  /** SVG 아래 표시할 라벨 */
  label: string;
  iconSize?: number;
  onPress?: () => void;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

/**
 * 성단 SVG + 하단 라벨
 * 라벨 색상은 cluster 번호별 고정 (ic_cluster1 #FFAEAE … ic_cluster5 #E4B2FF)
 */
export function ClusterIcon({
  cluster,
  label,
  iconSize = 52,
  onPress,
  style,
  labelStyle,
}: ClusterIconProps) {
  const labelColor = getClusterLabelColor(cluster);

  const content = (
    <View style={[styles.root, style]}>
      <ClusterSvgIcon cluster={cluster} size={iconSize} />
      <Text
        style={[styles.label, { color: labelColor }, labelStyle]}
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
    gap: 4,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    letterSpacing: -0.11,
    textAlign: 'center',
  },
});
