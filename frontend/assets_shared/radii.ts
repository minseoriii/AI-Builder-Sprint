/**
 * 버튼 모서리 둥글기 — 완전 원형(pill)이 아닌 직사각형 라운드
 * 디자인 시안에 맞게 이 값만 조정하면 전체 버튼에 반영됩니다.
 */

export const Radii = {
  /** pill 형태 primary 버튼 — PrimaryButton에서 height/2 로 덮어씀 */
  button: 999,
  /** pill 형태 태그 버튼 — TagButton에서 height/2 로 덮어씀 */
  tag: 999,
  /** 입력 필드 등 직사각형 라운드 */
  input: 16,
} as const;
