import { Image, StyleProp, ImageStyle } from 'react-native';

import type { ClusterIndex } from '../clusters';
import { ImageAssets } from '../images';

type ClusterPngProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const CLUSTER_SOURCES = {
  1: ImageAssets.ic_cluster1,
  2: ImageAssets.ic_cluster2,
  3: ImageAssets.ic_cluster3,
  4: ImageAssets.ic_cluster4,
  5: ImageAssets.ic_cluster5,
} as const;

function ClusterPng({
  source,
  size = 52,
  style,
}: {
  source: (typeof CLUSTER_SOURCES)[ClusterIndex];
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

/** ic_cluster1 — PNG */
export function ClusterIcon1({ size = 52, style }: ClusterPngProps) {
  return <ClusterPng source={CLUSTER_SOURCES[1]} size={size} style={style} />;
}

/** ic_cluster2 — PNG */
export function ClusterIcon2({ size = 60, style }: ClusterPngProps) {
  return <ClusterPng source={CLUSTER_SOURCES[2]} size={size} style={style} />;
}

/** ic_cluster3 — PNG */
export function ClusterIcon3({ size = 68, style }: ClusterPngProps) {
  return <ClusterPng source={CLUSTER_SOURCES[3]} size={size} style={style} />;
}

/** ic_cluster4 — PNG */
export function ClusterIcon4({ size = 61, style }: ClusterPngProps) {
  return <ClusterPng source={CLUSTER_SOURCES[4]} size={size} style={style} />;
}

/** ic_cluster5 — PNG */
export function ClusterIcon5({ size = 59, style }: ClusterPngProps) {
  return <ClusterPng source={CLUSTER_SOURCES[5]} size={size} style={style} />;
}

const CLUSTER_COMPONENT = {
  1: ClusterIcon1,
  2: ClusterIcon2,
  3: ClusterIcon3,
  4: ClusterIcon4,
  5: ClusterIcon5,
} as const;

/** 성단 번호 → PNG 아이콘 (구 ClusterSvgIcon 호환 이름) */
export function ClusterSvgIcon({
  cluster,
  size,
  style,
}: {
  cluster: ClusterIndex;
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const Comp = CLUSTER_COMPONENT[cluster];
  return <Comp size={size} style={style} />;
}

export const ClusterPngSources = CLUSTER_SOURCES;
