import { TextStyle, ViewStyle } from 'react-native';

/** 버튼 컨테이너 — 자식(텍스트) 정중앙 */
export const buttonContentCenter = {
  alignItems: 'center',
  justifyContent: 'center',
} as const satisfies ViewStyle;

/**
 * 버튼 라벨 정중앙 — 커스텀 폰트(A2Z) 상단 쏠림 보정.
 * fontSize와 같은 lineHeight를 호출부에서 함께 지정할 것.
 */
export const buttonLabelCenter = {
  textAlign: 'center',
  textAlignVertical: 'center',
  includeFontPadding: false,
  paddingTop: 0,
  paddingBottom: 0,
  marginTop: 0,
  marginBottom: 0,
} as const satisfies TextStyle;
