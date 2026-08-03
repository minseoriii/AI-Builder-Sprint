import type { ClusterIndex } from '@/assets_shared';
import type { ApiSeason, GalaxyOverviewResponse, KoreanSeason } from '@/lib/api/galaxy';
import {
  koreanSeasonToApi,
  seasonForMonth,
  seasonYearForDate,
} from '@/lib/api/galaxy';
import type { StarDetailResponse } from '@/lib/api/stars';

export type StarTags = {
  who: string;
  place: string;
  time: string;
  act: string;
  emotion: string;
};

export type StarData = {
  id: string;
  num: string;
  birthDate: string;
  tags: StarTags;
  recordText?: string;
};

export type ConstellationData = {
  id: number;
  num: string;
  birthDate: string;
  year: number;
  season: KoreanSeason;
  starCount: number;
  points: number[][];
  lines: number[][];
  stars: StarData[];
};

export type ClusterData = {
  id: string;
  index: ClusterIndex;
  name: string;
  constellations: ConstellationData[];
};

export type GalleryItem = {
  id: string;
  clusterId: string;
  clusterIndex: ClusterIndex;
  constellationId: number;
  clusterName: string;
  orderLabel: string;
  date: string;
  year: number;
  season: KoreanSeason;
  points: number[][];
  lines: number[][];
};

export type GalaxyFilter = {
  year: number;
  season: KoreanSeason;
  cluster: 'all' | string;
};

const ORDER_LABELS = [
  '첫',
  '두',
  '세',
  '네',
  '다섯',
  '여섯',
  '일곱',
  '여덟',
  '아홉',
  '열',
] as const;

export function getOrderLabel(index: number): string {
  return ORDER_LABELS[index - 1] ?? String(index);
}

export function getCountLabel(count: number): string {
  const labels = ['한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'] as const;
  return labels[count - 1] ?? String(count);
}

export function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function formatKoreanDate(year: number, month: number, day: number): string {
  return `${year}년 ${month}월 ${day}일`;
}

function tagFirst(tags: Record<string, string[]> | null | undefined, key: string): string {
  const value = tags?.[key]?.[0]?.trim();
  return value && value.length > 0 ? value : '—';
}

export function mapStarDetailToStarData(star: StarDetailResponse, index: number): StarData {
  return {
    id: star.id,
    num: getOrderLabel(index + 1),
    birthDate: formatKoreanDate(star.recorded_year, star.recorded_month, star.recorded_day),
    tags: {
      who: tagFirst(star.tags, 'PERSON'),
      place: tagFirst(star.tags, 'PLACE'),
      time: tagFirst(star.tags, 'TIME'),
      act: tagFirst(star.tags, 'ACTIVITY'),
      emotion: tagFirst(star.tags, 'EMOTION'),
    },
    recordText: star.content?.trim() || undefined,
  };
}

export function starInSeason(
  star: StarDetailResponse,
  year: number,
  season: ApiSeason,
): boolean {
  const starSeason = seasonForMonth(star.recorded_month);
  const starSeasonYear = seasonYearForDate(star.recorded_year, star.recorded_month);
  return starSeasonYear === year && starSeason === season;
}

export function generateConstellationLayout(
  count: number,
  seed: number,
): { points: number[][]; lines: number[][] } {
  if (count <= 0) {
    return { points: [], lines: [] };
  }

  const points: number[][] = [];
  for (let i = 0; i < count; i++) {
    const pseudo =
      Math.abs(Math.sin((seed + i * 17) * 12.9898) * 43758.5453) % 1;
    const pseudo2 =
      Math.abs(Math.sin((seed + i * 31) * 78.233) * 12345.678) % 1;
    points.push([20 + pseudo * 110, 20 + pseudo2 * 120]);
  }

  const lines: number[][] = [];
  for (let i = 0; i < count - 1; i++) {
    lines.push([i, i + 1]);
  }
  if (count > 2) {
    lines.push([count - 1, 0]);
  }
  return { points, lines };
}

export function buildClustersFromOverview(
  overview: GalaxyOverviewResponse,
  starsByCategory: Record<string, StarDetailResponse[]>,
  filter: { year: number; season: KoreanSeason },
): ClusterData[] {
  const apiSeason = koreanSeasonToApi(filter.season);

  return overview.constellations.map((stat, index) => {
    const clusterIndex = ((index % 5) + 1) as ClusterIndex;
    const allStars = starsByCategory[stat.category] ?? [];
    const seasonStars = allStars
      .filter((star) => starInSeason(star, filter.year, apiSeason))
      .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));

    if (seasonStars.length === 0) {
      return {
        id: stat.category,
        index: clusterIndex,
        name: stat.category,
        constellations: [],
      };
    }

    const seed = hashSeed(`${stat.category}-${filter.year}-${apiSeason}`);
    const { points, lines } = generateConstellationLayout(seasonStars.length, seed);
    const birthStar = seasonStars[0];

    const constellation: ConstellationData = {
      id: 1,
      num: '첫',
      birthDate: formatKoreanDate(
        birthStar.recorded_year,
        birthStar.recorded_month,
        birthStar.recorded_day,
      ),
      year: filter.year,
      season: filter.season,
      starCount: seasonStars.length,
      points,
      lines,
      stars: seasonStars.map((star, i) => mapStarDetailToStarData(star, i)),
    };

    return {
      id: stat.category,
      index: clusterIndex,
      name: stat.category,
      constellations: [constellation],
    };
  });
}

export function buildGalleryItems(clusters: ClusterData[]): GalleryItem[] {
  return clusters.flatMap((cluster) =>
    cluster.constellations.map((constellation) => ({
      id: `${cluster.id}-${constellation.id}`,
      clusterId: cluster.id,
      clusterIndex: cluster.index,
      constellationId: constellation.id,
      clusterName: cluster.name,
      orderLabel: constellation.num,
      date: constellation.birthDate,
      year: constellation.year,
      season: constellation.season,
      points: constellation.points,
      lines: constellation.lines,
    })),
  );
}

export function filterGalleryItems(items: GalleryItem[], filter: GalaxyFilter): GalleryItem[] {
  return items.filter(
    (item) =>
      item.year === filter.year &&
      item.season === filter.season &&
      (filter.cluster === 'all' || item.clusterId === filter.cluster),
  );
}

export function applyGalleryItem(
  item: GalleryItem,
  clusters: ClusterData[],
  setClusterIdx: (idx: number) => void,
  setConstIdx: (idx: number) => void,
) {
  const nextClusterIdx = clusters.findIndex((c) => c.id === item.clusterId);
  if (nextClusterIdx < 0) return;

  const nextConstIdx = clusters[nextClusterIdx].constellations.findIndex(
    (c) =>
      c.id === item.constellationId &&
      c.year === item.year &&
      c.season === item.season,
  );
  if (nextConstIdx < 0) return;

  setClusterIdx(nextClusterIdx);
  setConstIdx(nextConstIdx);
}

export function resolveConstellationStars(constellation: ConstellationData): StarData[] {
  const targetCount = Math.max(
    constellation.stars.length,
    constellation.points.length,
    constellation.starCount,
  );
  if (targetCount === 0) return [];

  return Array.from({ length: targetCount }, (_, index) => {
    const existing = constellation.stars[index];
    if (existing) return existing;

    return {
      id: `placeholder-${index}`,
      num: getOrderLabel(index + 1),
      birthDate: constellation.birthDate,
      tags: {
        who: '—',
        place: '—',
        time: '—',
        act: '—',
        emotion: '—',
      },
    };
  });
}
