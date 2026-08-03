import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Path } from 'react-native-svg';

import {
  Background,
  BottomNavigationBar,
  ClusterIcon,
  FontFamily,
  ImageAssets,
  Palette,
  PrimaryButton,
  Radii,
  ResponsiveScreen,
  ScreenContainer,
  ScreenLayout,
  createResponsiveStylesContext,
  getClusterLabelColor,
  showConnectionError,
  useAutoRefreshOnFocus,
  useResponsive,
  useTabExitConfirm,
  withOpacity,
} from '@/assets_shared';
import { getDefaultGalaxyFilter, getGalaxyOverview, koreanSeasonToApi } from '@/lib/api/galaxy';
import type { KoreanSeason } from '@/lib/api/galaxy';
import { getConstellationStars } from '@/lib/api/stars';
import {
  applyGalleryItem,
  buildClustersFromOverview,
  buildGalleryItems,
  filterGalleryItems,
  getCountLabel,
  getOrderLabel,
  hashSeed,
  resolveConstellationStars,
  type ClusterData,
  type ConstellationData,
  type GalaxyFilter,
  type GalleryItem,
  type StarData,
  type StarTags,
} from '@/lib/features/galaxy-view/galaxyData';
import { logHandledApiError } from '@/lib/api/logHandledApiError';

// ─── Types ─────────────────────────────────────────────────────────────────

type CurrentView = 'GALLERY' | 'CONSTELLATION' | 'STAR';

type ClusterOption = {
  id: string;
  name: string;
};

const SHAPE_STAR_IMAGES = [
  ImageAssets.ic_shapestar1,
  ImageAssets.ic_shapestar2,
  ImageAssets.ic_shapestar3,
  ImageAssets.ic_shapestar4,
] as const;

const SEASONS: KoreanSeason[] = ['봄', '여름', '가을', '겨울'];

function buildFilterYears(): number[] {
  const current = new Date().getFullYear();
  return [current - 1, current];
}

function buildDefaultFilter(): GalaxyFilter {
  const { year, season } = getDefaultGalaxyFilter();
  return { year, season, cluster: 'all' };
}

function pickShapeStarImage(seed: number) {
  return SHAPE_STAR_IMAGES[Math.abs(seed) % SHAPE_STAR_IMAGES.length];
}

function buildRecordFromTags(tags: StarTags): string {
  return `${tags.who}와 ${tags.place}에서 ${tags.time} ${tags.act}. ${tags.emotion}한 순간이었다.`;
}

function getStarRecord(star: StarData): string {
  return star.recordText ?? buildRecordFromTags(star.tags);
}

const CREAM = Palette.cream;
const CREAM_ACTIVE = Palette.creamActive;
const CREAM_BORDER = withOpacity(Palette.cream, 0.6);
const CREAM_FILL = withOpacity(Palette.cream, 0.3);
const CREAM_FILL_45 = withOpacity(Palette.cream, 0.45);
const CREAM_FADED = withOpacity(Palette.cream, 0.55);
const FILTER_DIM = 'rgba(0, 0, 0, 0.7)';

// ─── SVG Graphics ──────────────────────────────────────────────────────────

function ConstellationSVG({
  points,
  lines,
  size = 150,
  small = false,
  seed = 0,
}: {
  points: number[][];
  lines: number[][];
  size?: number;
  small?: boolean;
  seed?: number;
}) {
  const pad = small ? 10 : 16;
  const starSize = small ? 16 : 22;

  const mapped = useMemo(() => {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = (size - pad * 2) / Math.max(rangeX, rangeY);
    const offsetX = (size - rangeX * scale) / 2;
    const offsetY = (size - rangeY * scale) / 2;

    return points.map(([x, y]) => [
      (x - minX) * scale + offsetX,
      (y - minY) * scale + offsetY,
    ]);
  }, [points, size, pad]);

  const starSources = useMemo(
    () =>
      mapped.map((_, i) =>
        (i + seed) % 2 === 0 ? ImageAssets.ic_roundstar1 : ImageAssets.ic_roundstar2,
      ),
    [mapped, seed],
  );

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {lines.map(([a, b], i) => (
          <Line
            key={`line-${i}`}
            x1={mapped[a][0]}
            y1={mapped[a][1]}
            x2={mapped[b][0]}
            y2={mapped[b][1]}
            stroke="rgba(255,215,100,0.45)"
            strokeWidth={small ? 0.8 : 1.2}
          />
        ))}
      </Svg>
      {mapped.map(([x, y], i) => (
        <Image
          key={`star-${i}`}
          source={starSources[i]}
          style={{
            position: 'absolute',
            left: x - starSize / 2,
            top: y - starSize / 2,
            width: starSize,
            height: starSize,
          }}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}

function NavArrowButton({
  direction,
  onPress,
  disabled = false,
}: {
  direction: 'prev' | 'next';
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const iconSize = 56;
  const fill = disabled ? withOpacity(CREAM, 0.28) : CREAM;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.arrowBtn, disabled && styles.arrowDisabled]}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
        <Path
          d={direction === 'prev' ? 'M14 5L6 12L14 19V5Z' : 'M10 5L18 12L10 19V5Z'}
          fill={fill}
        />
      </Svg>
    </TouchableOpacity>
  );
}

function ShapeStarDisplay({ seed, size = 72 }: { seed: number; size?: number }) {
  return (
    <Image
      source={pickShapeStarImage(seed)}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

const MEDIUM_BTN_RADIUS = 999;

function GalaxyPrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();

  return (
    <View style={styles.ctaBtnWrap}>
      <PrimaryButton
        label={label}
        size="medium"
        onPress={onPress}
        style={{ borderRadius: MEDIUM_BTN_RADIUS }}
      />
    </View>
  );
}

function BackIconButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const iconSize = 48;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.backIconBtn}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="뒤로가기"
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 18L9 12L15 6"
          stroke={CREAM}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

function ClusterDetailHeader({
  cluster,
  birthDate,
}: {
  cluster: ClusterData;
  birthDate: string;
}) {
  const styles = useStyles();

  return (
    <View style={styles.clusterHeader}>
      <ClusterIcon cluster={cluster.index} label={cluster.name} iconSize={48} />
      <Text style={[styles.clusterBirth, styles.clusterBirthTop]}>
        {`${birthDate} 탄생`}
      </Text>
    </View>
  );
}

// ─── Gallery View ──────────────────────────────────────────────────────────

function GalleryCard({
  item,
  index,
  cardWidth,
  onPress,
}: {
  item: GalleryItem;
  index: number;
  cardWidth: number;
  onPress: () => void;
}) {
  const styles = useStyles();
  const bgDots = Array.from({ length: 8 }, (_, j) => ({
    topPct: 15 + ((j * 31 + index * 17) % 70),
    leftPct: 10 + ((j * 43 + index * 23) % 80),
    size: j % 3 === 0 ? 1.5 : 1,
    opacity: 0.3 + (j % 3) * 0.2,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.galleryCard, { width: cardWidth }]}
    >
      <LinearGradient
        colors={['rgba(20,30,80,0.8)', 'rgba(10,15,45,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.galleryGraphic, { height: cardWidth }]}>
        {bgDots.map((dot, j) => (
          <View
            key={j}
            style={[
              styles.galleryBgDot,
              {
                top: `${dot.topPct}%`,
                left: `${dot.leftPct}%`,
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                opacity: dot.opacity,
              },
            ]}
          />
        ))}
        <ConstellationSVG
          points={item.points}
          lines={item.lines}
          size={120}
          small
          seed={hashSeed(item.id)}
        />
      </View>
      <View style={styles.galleryCardBody}>
        <Text style={styles.galleryCardTitle}>
          <Text style={{ color: getClusterLabelColor(item.clusterIndex) }}>
            {item.clusterName}
          </Text>
          <Text style={styles.galleryCardTitleRest}>
            {` 성단의\n${item.orderLabel} 번째 별자리`}
          </Text>
        </Text>
        <View style={styles.galleryCardFooter}>
          <Text style={styles.galleryCardDate}>{`${item.date} 탄생`}</Text>
          <Image
            source={ImageAssets.ic_shapestar4}
            style={styles.galleryCardStarIcon}
            resizeMode="contain"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function GalleryView({
  items,
  onSelectItem,
  refreshing,
  onRefresh,
}: {
  items: GalleryItem[];
  onSelectItem: (item: GalleryItem) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const { scale } = useResponsive();
  const gap = 12;
  const horizontalPad = scale(ScreenLayout.horizontal);
  const contentWidth = width - horizontalPad * 2;
  const cardWidth = (contentWidth - gap) / 2;

  if (items.length === 0) {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.emptyGallery}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={CREAM}
              colors={[CREAM]}
            />
          ) : undefined
        }
      >
        <Text style={styles.emptyGalleryText}>
          선택한 조건에 해당하는 별자리가 없습니다.
        </Text>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.galleryRow}
      contentContainerStyle={styles.galleryList}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={CREAM}
            colors={[CREAM]}
          />
        ) : undefined
      }
      renderItem={({ item, index }) => (
        <GalleryCard
          item={item}
          index={index}
          cardWidth={cardWidth}
          onPress={() => onSelectItem(item)}
        />
      )}
    />
  );
}

// ─── Constellation View ────────────────────────────────────────────────────

function ConstellationView({
  cluster,
  constellation,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onViewStars,
  onBack,
  refreshing,
  onRefresh,
}: {
  cluster: ClusterData;
  constellation: ConstellationData;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onViewStars: () => void;
  onBack: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const styles = useStyles();
  const clusterColor = getClusterLabelColor(cluster.index);
  const starCount = resolveConstellationStars(constellation).length;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.detailScroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={CREAM}
            colors={[CREAM]}
          />
        ) : undefined
      }
    >
      <View style={styles.detailTopBar}>
        <BackIconButton onPress={onBack} />
      </View>

      <ClusterDetailHeader
        cluster={cluster}
        birthDate={constellation.birthDate}
      />

      <View style={styles.viewerRow}>
        <NavArrowButton direction="prev" onPress={onPrev} disabled={!canPrev} />

        <View style={styles.constFrame}>
          <ConstellationSVG
            points={constellation.points}
            lines={constellation.lines}
            size={150}
            seed={hashSeed(`${cluster.id}-${constellation.id}`)}
          />
        </View>

        <NavArrowButton direction="next" onPress={onNext} disabled={!canNext} />
      </View>

      <View style={styles.detailInfo}>
        <Text style={styles.detailTitle}>
          <Text style={{ color: clusterColor }}>{cluster.name}</Text>
          <Text style={{ color: CREAM }}>
            {` 성단의 ${constellation.num} 번째 별자리`}
          </Text>
        </Text>
        <Text style={styles.detailSubMuted}>
          {`${getCountLabel(starCount)} 개의 별로 구성`}
        </Text>
      </View>

      <View style={styles.ctaBlock}>
        <GalaxyPrimaryButton label="별자리 관측하기" onPress={onViewStars} />
      </View>
    </ScrollView>
  );
}

function RecordModal({
  visible,
  text,
  onClose,
}: {
  visible: boolean;
  text: string;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { height: windowHeight } = useWindowDimensions();
  const scrollMaxHeight = Math.min(windowHeight * 0.32, 240);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.recordOverlay} onPress={onClose}>
        <Pressable style={styles.recordCardWrap} onPress={() => {}}>
          <View style={styles.recordCard}>
            <Text style={styles.recordTitle}>기록</Text>
            <View style={styles.recordDivider} />
            <ScrollView
              style={{ maxHeight: scrollMaxHeight }}
              contentContainerStyle={styles.recordScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.recordBody}>{text}</Text>
            </ScrollView>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.88}
              style={styles.recordConfirmBtn}
            >
              <Text style={styles.recordConfirmBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StarView({
  cluster,
  constellation,
  stars,
  starIdx,
  onPrev,
  onNext,
  onBack,
  refreshing,
  onRefresh,
}: {
  cluster: ClusterData;
  constellation: ConstellationData;
  stars: StarData[];
  starIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const styles = useStyles();
  const [recordVisible, setRecordVisible] = useState(false);
  const safeIdx = stars.length > 0 ? starIdx % stars.length : 0;
  const star = stars[safeIdx];
  const clusterColor = getClusterLabelColor(cluster.index);
  const starOrderLabel = getOrderLabel(safeIdx + 1);

  return (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.detailScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={CREAM}
              colors={[CREAM]}
            />
          ) : undefined
        }
      >
        <View style={styles.detailTopBar}>
          <BackIconButton onPress={onBack} />
        </View>

        {!star ? null : (
          <>
            <ClusterDetailHeader
              cluster={cluster}
              birthDate={constellation.birthDate}
            />

            <View style={styles.viewerRow}>
              <NavArrowButton direction="prev" onPress={onPrev} />

              <View style={styles.starFrame}>
                <ShapeStarDisplay
                  seed={hashSeed(`${cluster.id}-${constellation.id}-${star.id}`)}
                  size={72}
                />
              </View>

              <NavArrowButton direction="next" onPress={onNext} />
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailTitle}>
                <Text style={{ color: clusterColor }}>{cluster.name}</Text>
                <Text style={{ color: CREAM }}>
                  {` 성단의 ${starOrderLabel} 번째 별`}
                </Text>
              </Text>
              <Text style={styles.detailSubMuted}>
                {`${cluster.name} 성단의 ${constellation.num} 번째 별자리, ${star.num} 번째 별`}
              </Text>

              <View style={styles.starTagList}>
                {[
                  star.tags.who,
                  star.tags.place,
                  star.tags.time,
                  star.tags.act,
                  star.tags.emotion,
                ].map((value, index) => (
                  <Text key={`${value}-${index}`} style={styles.starTagItem}>
                    {value}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.ctaBlock}>
              <GalaxyPrimaryButton
                label="기록 확인하기"
                onPress={() => setRecordVisible(true)}
              />
            </View>
          </>
        )}
      </ScrollView>

      {star ? (
        <RecordModal
          visible={recordVisible}
          text={getStarRecord(star)}
          onClose={() => setRecordVisible(false)}
        />
      ) : null}
    </>
  );
}

// ─── Filter Modal ──────────────────────────────────────────────────────────

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function GalaxyFilterModal({
  visible,
  draft,
  clusterOptions,
  onChange,
  onApply,
  onClose,
}: {
  visible: boolean;
  draft: GalaxyFilter;
  clusterOptions: ClusterOption[];
  onChange: (next: GalaxyFilter) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const filterYears = buildFilterYears();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.filterOverlay}>
        <View style={styles.filterDimLayer} pointerEvents="none" />
        <Pressable style={styles.filterScrimTap} onPress={onClose} />
        <Pressable style={styles.filterSheet} onPress={() => {}}>
          <Text style={styles.filterSheetTitle}>필터</Text>

          <Text style={styles.filterSectionLabel}>연도</Text>
          <View style={styles.filterChipRow}>
            {filterYears.map((year) => (
              <FilterChip
                key={year}
                label={String(year)}
                selected={draft.year === year}
                onPress={() => onChange({ ...draft, year })}
              />
            ))}
          </View>

          <Text style={styles.filterSectionLabel}>계절</Text>
          <View style={styles.filterChipRow}>
            {SEASONS.map((season) => (
              <FilterChip
                key={season}
                label={season}
                selected={draft.season === season}
                onPress={() => onChange({ ...draft, season })}
              />
            ))}
          </View>

          <Text style={styles.filterSectionLabel}>성단</Text>
          <View style={styles.filterChipRow}>
            <FilterChip
              label="전체"
              selected={draft.cluster === 'all'}
              onPress={() => onChange({ ...draft, cluster: 'all' })}
            />
            {clusterOptions.map((cluster) => (
              <FilterChip
                key={cluster.id}
                label={cluster.name}
                selected={draft.cluster === cluster.id}
                onPress={() => onChange({ ...draft, cluster: cluster.id })}
              />
            ))}
          </View>

          <TouchableOpacity onPress={onApply} activeOpacity={0.88} style={styles.filterApplyBtn}>
            <Text style={styles.filterApplyBtnText}>필터 적용</Text>
          </TouchableOpacity>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

export default function GalaxyView() {
  const styles = useScreenStyles(GALAXY_STYLE_DEF);
  const { width, height } = useWindowDimensions();
  const [currentView, setCurrentView] = useState<CurrentView>('GALLERY');
  const [clusterIdx, setClusterIdx] = useState(0);
  const [constIdx, setConstIdx] = useState(0);
  const [starIdx, setStarIdx] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<GalaxyFilter>(() => buildDefaultFilter());
  const [filterDraft, setFilterDraft] = useState<GalaxyFilter>(() => buildDefaultFilter());
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState(0);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { ExitConfirmModal } = useTabExitConfirm();

  const galleryItems = useMemo(() => buildGalleryItems(clusters), [clusters]);
  const filteredItems = useMemo(
    () => filterGalleryItems(galleryItems, filter),
    [galleryItems, filter],
  );

  const clusterOptions = useMemo<ClusterOption[]>(
    () => clusters.map((cluster) => ({ id: cluster.id, name: cluster.name })),
    [clusters],
  );

  const loadGalaxyData = useCallback(async (activeFilter: GalaxyFilter) => {
    setLoading(true);
    setHasError(false);
    try {
      const apiSeason = koreanSeasonToApi(activeFilter.season);
      const overview = await getGalaxyOverview(activeFilter.year, apiSeason);
      const categoriesWithStars = overview.constellations.filter(
        (item) => item.star_count > 0,
      );
      const starsResponses = await Promise.all(
        categoriesWithStars.map((item) => getConstellationStars(item.category)),
      );
      const starsByCategory = Object.fromEntries(
        categoriesWithStars.map((item, index) => [
          item.category,
          starsResponses[index]?.stars ?? [],
        ]),
      );
      setClusters(buildClustersFromOverview(overview, starsByCategory, activeFilter));
    } catch (loadError) {
      logHandledApiError('Galaxy overview load error', loadError);
      setHasError(true);
      setClusters([]);
      showConnectionError({
        onRetry: () => void loadGalaxyData(activeFilter),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGalaxyData(filter);
  }, [filter, loadGalaxyData]);

  useAutoRefreshOnFocus(() => {
    const nextFilter = buildDefaultFilter();
    setRefreshKey((key) => key + 1);
    setFilter(nextFilter);
    setFilterDraft(nextFilter);
    setCurrentView('GALLERY');
    setClusterIdx(0);
    setConstIdx(0);
    setStarIdx(0);
    setSelectedGalleryIdx(0);
  });

  const cluster = clusters[clusterIdx];
  const constellation = cluster?.constellations[constIdx];
  const navigableStars = useMemo(
    () => (constellation ? resolveConstellationStars(constellation) : []),
    [constellation],
  );

  const handleGallerySelect = (item: GalleryItem) => {
    const idx = filteredItems.findIndex((entry) => entry.id === item.id);
    setSelectedGalleryIdx(idx >= 0 ? idx : 0);
    applyGalleryItem(item, clusters, setClusterIdx, setConstIdx);
    setStarIdx(0);
    setCurrentView('CONSTELLATION');
  };

  const navigateGallery = (delta: number) => {
    const len = filteredItems.length;
    if (len === 0) return;

    const nextIdx = (selectedGalleryIdx + delta + len) % len;
    setSelectedGalleryIdx(nextIdx);
    applyGalleryItem(filteredItems[nextIdx], clusters, setClusterIdx, setConstIdx);
    setStarIdx(0);
  };

  const handleViewStars = () => {
    setStarIdx(0);
    setCurrentView('STAR');
  };

  const prevConst = () => navigateGallery(-1);
  const nextConst = () => navigateGallery(1);

  const prevStar = () => {
    const len = navigableStars.length;
    if (len <= 1) return;
    setStarIdx((i) => (i - 1 + len) % len);
  };

  const nextStar = () => {
    const len = navigableStars.length;
    if (len <= 1) return;
    setStarIdx((i) => (i + 1) % len);
  };

  const openFilter = () => {
    setFilterDraft(filter);
    setFilterVisible(true);
  };

  const applyFilter = () => {
    setFilter(filterDraft);
    setFilterVisible(false);
    setCurrentView('GALLERY');
  };

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGalaxyData(filter);
    } finally {
      setRefreshing(false);
    }
  }, [filter, loadGalaxyData]);

  const headerSubtitle = `"${filter.year}년 ${filter.season}의 은하에서 관측된 빛"`;

  return (
    <StylesProvider styles={styles}>
      <ResponsiveScreen key={refreshKey}>
        <Background width={width} height={height} />

        <ScreenContainer
          withSafeArea={false}
          withTopPadding
          topPadding={ScreenLayout.top}
          withHorizontalPadding
          style={styles.flex}
          contentStyle={styles.screenContent}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>은하감상</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={openFilter}
              activeOpacity={0.85}
              style={styles.filterPill}
            >
              <Text style={styles.filterPillIcon}>≡</Text>
              <Text style={styles.filterPillText}>필터 보기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={CREAM} size="large" />
              </View>
            ) : null}
            {!loading && !hasError && currentView === 'GALLERY' ? (
              <GalleryView
                items={filteredItems}
                onSelectItem={handleGallerySelect}
                refreshing={refreshing}
                onRefresh={() => {
                  void handlePullRefresh();
                }}
              />
            ) : null}
            {!loading && !hasError && currentView === 'CONSTELLATION' && cluster && constellation ? (
              <ConstellationView
                cluster={cluster}
                constellation={constellation}
                canPrev={filteredItems.length > 1}
                canNext={filteredItems.length > 1}
                onPrev={prevConst}
                onNext={nextConst}
                onViewStars={handleViewStars}
                onBack={() => setCurrentView('GALLERY')}
                refreshing={refreshing}
                onRefresh={() => {
                  void handlePullRefresh();
                }}
              />
            ) : null}
            {!loading && !hasError && currentView === 'STAR' && cluster && constellation ? (
              <StarView
                cluster={cluster}
                constellation={constellation}
                stars={navigableStars}
                starIdx={starIdx}
                onPrev={prevStar}
                onNext={nextStar}
                onBack={() => setCurrentView('CONSTELLATION')}
                refreshing={refreshing}
                onRefresh={() => {
                  void handlePullRefresh();
                }}
              />
            ) : null}
          </View>
        </ScreenContainer>

        <BottomNavigationBar activeTab="galaxy" />
        {ExitConfirmModal}

        <GalaxyFilterModal
          visible={filterVisible}
          draft={filterDraft}
          clusterOptions={clusterOptions}
          onChange={setFilterDraft}
          onApply={applyFilter}
          onClose={() => setFilterVisible(false)}
        />
      </ResponsiveScreen>
    </StylesProvider>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const GALAXY_STYLE_DEF = {
  flex: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    paddingBottom: 86,
  },

  header: {
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 25,
    color: CREAM,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: CREAM,
    letterSpacing: -0.15,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CREAM_FILL,
    borderWidth: 1,
    borderColor: CREAM_BORDER,
  },
  filterPillIcon: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: CREAM_ACTIVE,
    lineHeight: 18,
  },
  filterPillText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 15,
    color: CREAM_ACTIVE,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  filterOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterDimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FILTER_DIM,
  },
  filterScrimTap: {
    ...StyleSheet.absoluteFillObject,
  },
  filterSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CREAM_BORDER,
    borderBottomWidth: 0,
    backgroundColor: CREAM_FILL,
    zIndex: 2,
  },
  filterSheetTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    color: CREAM,
    marginBottom: 20,
  },
  filterSectionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: withOpacity(CREAM, 0.75),
    marginBottom: 10,
    marginTop: 4,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CREAM_FILL,
    borderWidth: 1,
    borderColor: CREAM_BORDER,
  },
  filterChipSelected: {
    backgroundColor: withOpacity(Palette.cream, 0.45),
    borderColor: CREAM_BORDER,
  },
  filterChipText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: withOpacity(CREAM, 0.55),
  },
  filterChipTextSelected: {
    color: CREAM,
    fontFamily: FontFamily.medium,
  },
  filterApplyBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: CREAM_FILL,
    borderWidth: 1,
    borderColor: CREAM_BORDER,
  },
  filterApplyBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 15,
    color: CREAM_ACTIVE,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  emptyGallery: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 120,
  },
  emptyGalleryText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: withOpacity(CREAM, 0.55),
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  content: {
    flex: 1,
    minHeight: 0,
  },

  galleryList: {
    paddingBottom: 16,
  },
  galleryRow: {
    gap: 12,
    marginBottom: 12,
  },
  galleryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CREAM_BORDER,
    backgroundColor: withOpacity(CREAM, 0.08),
  },
  galleryGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,12,35,0.6)',
    position: 'relative',
  },
  galleryBgDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  galleryCardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  galleryCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  galleryCardTitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: CREAM,
    lineHeight: 16,
  },
  galleryCardTitleRest: {
    fontFamily: FontFamily.regular,
    color: CREAM,
  },
  galleryCardDate: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: CREAM_FADED,
    lineHeight: 14,
    textAlign: 'right',
  },
  galleryCardStarIcon: {
    width: 18,
    height: 18,
    opacity: 0.85,
  },

  detailScroll: {
    paddingBottom: 16,
  },
  detailTopBar: {
    paddingTop: 4,
    paddingBottom: 4,
    alignItems: 'flex-start',
    marginLeft: -4,
  },
  backIconBtn: {
    width: 48,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  clusterHeader: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 12,
  },
  clusterBirth: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: CREAM,
    textAlign: 'center',
  },
  clusterBirthTop: {
    marginTop: 6,
  },

  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  arrowBtn: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },

  constFrame: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(CREAM, 0.06),
    borderWidth: 1.5,
    borderColor: CREAM_BORDER,
  },
  starFrame: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(CREAM, 0.06),
    borderWidth: 1.5,
    borderColor: CREAM_BORDER,
  },

  detailInfo: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  detailTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 17,
    color: CREAM,
    textAlign: 'center',
  },
  detailSub: {
    marginTop: 6,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: CREAM,
    textAlign: 'center',
    lineHeight: 18,
  },
  detailSubMuted: {
    marginTop: 6,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: CREAM_FADED,
    textAlign: 'center',
    lineHeight: 18,
  },

  starTagList: {
    marginTop: 20,
    alignItems: 'center',
    gap: 6,
  },
  starTagItem: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: CREAM,
    textAlign: 'center',
    lineHeight: 20,
  },

  ctaBlock: {
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 16,
    alignItems: 'center',
  },
  ctaBtnWrap: {
    alignItems: 'center',
  },

  recordOverlay: {
    flex: 1,
    backgroundColor: FILTER_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  recordCardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  recordCard: {
    borderWidth: 1,
    borderColor: CREAM_BORDER,
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: CREAM_FILL,
    width: '100%',
  },
  recordTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: CREAM,
    marginBottom: 12,
  },
  recordDivider: {
    height: 1,
    backgroundColor: CREAM_BORDER,
    marginBottom: 16,
  },
  recordScrollContent: {
    flexGrow: 0,
  },
  recordBody: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: withOpacity(CREAM, 0.9),
    lineHeight: 22,
  },
  recordConfirmBtn: {
    marginTop: 16,
    alignSelf: 'center',
    minWidth: 140,
    paddingHorizontal: 36,
    paddingVertical: 11,
    borderRadius: Radii.button,
    backgroundColor: CREAM_FILL_45,
    borderWidth: 1,
    borderColor: CREAM_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordConfirmBtnText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 15,
    color: CREAM_ACTIVE,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
} as const;

const { StylesProvider, useStyles, useScreenStyles } =
  createResponsiveStylesContext<typeof GALAXY_STYLE_DEF>();
