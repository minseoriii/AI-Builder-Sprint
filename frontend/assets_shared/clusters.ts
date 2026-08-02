import { Colors, Palette } from './colors';

/** ic_cluster1 ~ ic_cluster5 (1-based) */
export type ClusterIndex = 1 | 2 | 3 | 4 | 5;

export const CLUSTER_LABEL_COLORS: Record<ClusterIndex, string> = {
  1: Palette.cluster1,
  2: Palette.cluster2,
  3: Palette.cluster3,
  4: Palette.cluster4,
  5: Palette.cluster5,
};

export function getClusterLabelColor(index: ClusterIndex): string {
  return Colors.clusterLabel[index];
}

/** SVG 원본 viewBox 크기 — 비율 유지 스케일용 */
export const CLUSTER_ICON_VIEWBOX: Record<
  ClusterIndex,
  { width: number; height: number }
> = {
  1: { width: 52, height: 56 },
  2: { width: 60, height: 60 },
  3: { width: 47, height: 68 },
  4: { width: 61, height: 57 },
  5: { width: 50, height: 59 },
};
