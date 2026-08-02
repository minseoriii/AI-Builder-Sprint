/** 디자인 프레임 — Figma/시안 기준 (background 412×917) */
export const DesignFrame = {
  width: 412,
  height: 917,
} as const;

/** 화면·레이아웃 여백·위치 토큰 (DesignFrame 좌표계) */
export const ScreenLayout = {
  /** 좌우 여백 */
  horizontal: 20,
  /** 위 여백 (일반 화면) */
  top: 65,
  /** STATE1 타이틀 "오늘의 관측을 기록해보세요." */
  titleX: 55,
  titleY: 260,
  /** STATE1 서브카피 "짧게, 2-3문장도 괜찮아요..." */
  subtitleX: 88,
  subtitleY: 300,
  /** STATE1 텍스트 입력창 */
  textAreaX: 22,
  textAreaY: 370,
  textAreaWidth: 370,
  textAreaHeight: 125,
  /** 큰 PrimaryButton(large) — 위치 (20, 820), 크기 372×60 on 412×917 */
  largeButtonLeft: 20,
  largeButtonTop: 820,
  largeButtonWidth: 372,
  largeButtonHeight: 60,
  /** 온보딩 2~4단계 추가 상단 여백 */
  onboardingTop: 0,
} as const;

/** 디자인 좌표 → 현재 화면 픽셀 */
export function scaleDesign(
  windowWidth: number,
  windowHeight: number,
): { sx: number; sy: number; x: (n: number) => number; y: (n: number) => number } {
  const sx = windowWidth / DesignFrame.width;
  const sy = windowHeight / DesignFrame.height;
  return {
    sx,
    sy,
    x: (n: number) => n * sx,
    y: (n: number) => n * sy,
  };
}

/** 온보딩 2~4단계 콘텐츠 상단 여백 */
export const onboardingContentTop =
  ScreenLayout.top + ScreenLayout.onboardingTop;
