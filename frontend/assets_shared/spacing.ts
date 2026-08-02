/** 화면·레이아웃 여백 토큰 */

export const ScreenLayout = {
  /** 좌우 여백 */
  horizontal: 20,
  /** 위 여백 (일반 화면) */
  top: 65,
  /** 온보딩 2~4단계 추가 상단 여백 */
  onboardingTop: 0,
} as const;

/** 온보딩 2~4단계 콘텐츠 상단 여백 */
export const onboardingContentTop =
  ScreenLayout.top + ScreenLayout.onboardingTop;
