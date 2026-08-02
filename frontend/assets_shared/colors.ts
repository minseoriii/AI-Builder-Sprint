/** POLARIS design palette — shared color tokens */

export const Palette = {
  /** 기본·강조 텍스트 */
  cream: '#F8EEC1',
  /** 활성화(primary) 버튼 텍스트 */
  creamActive: '#FFF9DD',
  /** 비활성화 텍스트·외곽 */
  disabled: '#A4A4A4',
  /** ic_cluster1 라벨 */
  cluster1: '#FFAEAE',
  /** ic_cluster2 라벨 */
  cluster2: '#FFD365',
  /** ic_cluster3 라벨 */
  cluster3: '#D8FF91',
  /** ic_cluster4 라벨 */
  cluster4: '#90F0FF',
  /** ic_cluster5 라벨 */
  cluster5: '#E4B2FF',
} as const;

/** `#RRGGBB` hex → `rgba(r,g,b,opacity)` */
export function withOpacity(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** 시맨틱 색상 — 컴포넌트에서 직접 참조 */
export const Colors = {
  text: {
    default: Palette.cream,
    emphasis: Palette.cream,
    disabled: Palette.disabled,
    buttonActive: Palette.creamActive,
    tag: Palette.cream,
  },
  button: {
    fill: withOpacity(Palette.cream, 0.15),
    borderActive: withOpacity(Palette.cream, 0.6),
    borderDisabled: Palette.disabled,
  },
  tag: {
    fillInactive: withOpacity(Palette.cream, 0.3),
    fillActive: withOpacity(Palette.cream, 0.45),
    borderInactive: withOpacity(Palette.cream, 0.6),
    borderActive: Palette.cream,
  },
  /** ic_cluster1~5 SVG 하단 라벨 텍스트 */
  clusterLabel: {
    1: Palette.cluster1,
    2: Palette.cluster2,
    3: Palette.cluster3,
    4: Palette.cluster4,
    5: Palette.cluster5,
  },
} as const;
