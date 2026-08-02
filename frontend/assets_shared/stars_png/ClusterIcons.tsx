import { Image } from 'expo-image';

import { ClusterIndex } from '../clusters';
import { clusterImages } from './images';

interface ClusterIconProps {
  size?: number;
}

function scaleSize(index: ClusterIndex, size: number) {
  const viewBoxes: Record<ClusterIndex, { w: number; h: number }> = {
    1: { w: 52, h: 56 },
    2: { w: 60, h: 60 },
    3: { w: 47, h: 68 },
    4: { w: 61, h: 57 },
    5: { w: 50, h: 59 },
  };
  const { w, h } = viewBoxes[index];
  const scale = size / Math.max(w, h);
  return { width: w * scale, height: h * scale };
}

function ClusterPngImage({
  cluster,
  size,
}: {
  cluster: ClusterIndex;
  size: number;
}) {
  const { width, height } = scaleSize(cluster, size);

  return (
    <Image
      source={clusterImages[cluster]}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}

/** ic_cluster1.png */
export function ClusterIcon1({ size = 52 }: ClusterIconProps) {
  return <ClusterPngImage cluster={1} size={size} />;
}

/** ic_cluster2.png */
export function ClusterIcon2({ size = 60 }: ClusterIconProps) {
  return <ClusterPngImage cluster={2} size={size} />;
}

/** ic_cluster3.png */
export function ClusterIcon3({ size = 68 }: ClusterIconProps) {
  return <ClusterPngImage cluster={3} size={size} />;
}

/** ic_cluster4.png */
export function ClusterIcon4({ size = 61 }: ClusterIconProps) {
  return <ClusterPngImage cluster={4} size={size} />;
}

/** ic_cluster5.png */
export function ClusterIcon5({ size = 59 }: ClusterIconProps) {
  return <ClusterPngImage cluster={5} size={size} />;
}

const CLUSTER_ICON_COMPONENTS = {
  1: ClusterIcon1,
  2: ClusterIcon2,
  3: ClusterIcon3,
  4: ClusterIcon4,
  5: ClusterIcon5,
} as const;

export function ClusterPngIcon({
  cluster,
  size,
}: {
  cluster: ClusterIndex;
  size?: number;
}) {
  const Icon = CLUSTER_ICON_COMPONENTS[cluster];
  return <Icon size={size} />;
}
