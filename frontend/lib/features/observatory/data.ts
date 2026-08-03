import { Palette } from '@/assets_shared';
import type { ClusterIndex } from '@/assets_shared';

import type { Season } from '@/lib/api/galaxy';

export type LabSubTab = 'stats' | 'report';

export interface SummaryItem {
  label: string;
  value: string;
}

export interface ClusterItem {
  name: string;
  percent: number;
  count: number;
  color: string;
}

export interface ReportItem {
  id: string;
  title: string;
  message: string;
  period: string;
  year?: number;
  season?: Season;
  seasonLabel?: string;
}

export const POLARIS_QUOTE = '새로운 시도를 두려워하지 말자.';

export const CLUSTER_COLORS: Record<ClusterIndex, string> = {
  1: Palette.cluster1,
  2: Palette.cluster2,
  3: Palette.cluster3,
  4: Palette.cluster4,
  5: Palette.cluster5,
};

const SEASON_MONTHS: Record<Season, [number, number, number]> = {
  SPRING: [3, 4, 5],
  SUMMER: [6, 7, 8],
  AUTUMN: [9, 10, 11],
  WINTER: [12, 1, 2],
};

/** 오늘 기준 계절·연도 (겨울 12월은 해당 연도, 1~2월은 직전 연도) */
export function getCurrentSeasonPeriod(now = new Date()): {
  year: number;
  season: Season;
  seasonLabel: string;
} {
  const month = now.getMonth() + 1;
  let season: Season;
  if (month >= 3 && month <= 5) season = 'SPRING';
  else if (month >= 6 && month <= 8) season = 'SUMMER';
  else if (month >= 9 && month <= 11) season = 'AUTUMN';
  else season = 'WINTER';

  const year =
    season === 'WINTER' && month <= 2 ? now.getFullYear() - 1 : now.getFullYear();

  return {
    year,
    season,
    seasonLabel: seasonLabelKo(season),
  };
}

export function seasonLabelKo(season: Season): string {
  switch (season) {
    case 'SPRING':
      return '봄';
    case 'SUMMER':
      return '여름';
    case 'AUTUMN':
      return '가을';
    case 'WINTER':
      return '겨울';
  }
}

export function getSeasonDateRange(
  year: number,
  season: Season,
): { start: Date; end: Date } {
  if (season === 'SPRING') {
    return { start: new Date(year, 2, 1), end: new Date(year, 4, 31) };
  }
  if (season === 'SUMMER') {
    return { start: new Date(year, 5, 1), end: new Date(year, 7, 31) };
  }
  if (season === 'AUTUMN') {
    return { start: new Date(year, 8, 1), end: new Date(year, 10, 30) };
  }
  // 2월 말일
  const febLast = new Date(year + 1, 2, 0).getDate();
  return { start: new Date(year, 11, 1), end: new Date(year + 1, 1, febLast) };
}

export function formatDateKo(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatPeriodKo(
  start: string | Date,
  end: string | Date,
): string {
  const a = formatDateKo(start);
  const b = formatDateKo(end);
  if (!a || !b) return '';
  return `${a} ~ ${b}`;
}

/** 계절 종료까지 남은 일수 (종료일 포함) */
export function daysUntilSeasonEnd(year: number, season: Season, now = new Date()): number {
  const { end } = getSeasonDateRange(year, season);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.ceil((endDay.getTime() - today.getTime()) / 86400000);
  return Math.max(0, diff);
}

export function clusterIndexForCategory(
  category: string,
  selectedCategories: string[],
): ClusterIndex {
  const idx = selectedCategories.findIndex((c) => c === category);
  if (idx >= 0 && idx < 5) return (idx + 1) as ClusterIndex;
  return 1;
}

export function colorForCategory(
  category: string,
  selectedCategories: string[],
): string {
  return CLUSTER_COLORS[clusterIndexForCategory(category, selectedCategories)];
}

export function buildStatsTitle(year: number, seasonLabel: string): string {
  return `${year}년 ${seasonLabel} 은하 관측 통계 현황`;
}

export function buildReportTitle(year: number, seasonLabel: string): string {
  return `${year}년 ${seasonLabel} 관측 리포트`;
}

export function buildLockedReportMessage(year: number, seasonLabel: string): string {
  return `${year}년의 ${seasonLabel}이 끝나면 확인할 수 있어요.`;
}

/** UI용 — ratio(0~1) → percent */
export function toClusterItems(
  rows: { category: string; star_count: number; ratio: number }[],
  selectedCategories: string[],
): ClusterItem[] {
  return rows.map((row) => ({
    name: row.category,
    count: row.star_count,
    percent: Math.round((row.ratio || 0) * 100),
    color: colorForCategory(row.category, selectedCategories),
  }));
}

export function formatMonthLabel(monthKey: string): string {
  // "2026-06" → "6월"
  const parts = monthKey.split('-');
  const month = Number(parts[1]);
  if (!month) return monthKey;
  return `${month}월`;
}

/** 겨울 윤년 보정용 — getSeasonDateRange WINTER end는 대략치, 필요 시 호출부에서 ISO 사용 */
export function isSameSeasonPeriod(
  a: { year: number; season: Season },
  b: { year: number; season: Season },
): boolean {
  return a.year === b.year && a.season === b.season;
}

export { SEASON_MONTHS };
