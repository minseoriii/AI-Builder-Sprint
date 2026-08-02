import { DesignDimensions } from './constants';

export interface ResponsiveMetrics {
  width: number;
  height: number;
  /** 기기 너비 기준 콘텐츠 최대 너비 */
  contentWidth: number;
  widthScale: number;
  heightScale: number;
  /** 가로 치수 스케일 */
  scale: (size: number) => number;
  /** 세로 치수 스케일 */
  verticalScale: (size: number) => number;
  /** 완화 스케일 — 아이콘·여백 등 */
  moderateScale: (size: number, factor?: number) => number;
  /** 폰트 크기 — 과도한 확대/축소 방지 */
  fontScale: (size: number) => number;
  s: (size: number) => number;
  vs: (size: number) => number;
  ms: (size: number, factor?: number) => number;
}

export function createResponsiveMetrics(
  width: number,
  height: number,
): ResponsiveMetrics {
  const widthScale = width / DesignDimensions.width;
  const heightScale = height / DesignDimensions.height;

  const scale = (size: number) => Math.round(size * widthScale);
  const verticalScale = (size: number) => Math.round(size * heightScale);
  const moderateScale = (size: number, factor = 0.5) =>
    Math.round(size + (scale(size) - size) * factor);
  const fontScale = (size: number) => moderateScale(size, 0.25);

  return {
    width,
    height,
    contentWidth: width,
    widthScale,
    heightScale,
    scale,
    verticalScale,
    moderateScale,
    fontScale,
    s: scale,
    vs: verticalScale,
    ms: moderateScale,
  };
}
