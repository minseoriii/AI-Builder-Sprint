import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import {
  AppText,
  Background,
  ClusterIcon,
  Colors,
  FontFamily,
  Palette,
  PrimaryButton,
  ScreenContainer,
  ScreenLayout,
  scaleDesign,
  withOpacity,
} from '@/assets_shared';
import type { ClusterIndex } from '@/assets_shared';
import {
  analyzeDailyRecord,
  confirmDailyRecord,
  CONSTELLATION_CATEGORIES,
  DAILY_RECORD_DIMENSIONS,
  getHome,
  sanitizeDailyRecordTags,
  sanitizeTag,
  type CategoryRankingItem,
  type DailyRecordTags,
  type MissingQuestion,
  updateDailyRecordDetails,
} from '@/lib/api/daily-records';
import { getOnboardingStatus } from '@/lib/api/onboarding';

// ─── Types ─────────────────────────────────────────────────────────────────

type Screen = 'base' | 'loading' | 'supplement' | 'confirm' | 'complete';

interface Tags {
  together: string;
  place: string;
  time: string;
  activity: string;
  emotion: string;
}

interface TagMeta {
  key: keyof Tags;
  label: string;
  dimension: (typeof DAILY_RECORD_DIMENSIONS)[number];
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Confirm/Complete 전용 강조 색상 (배경은 공유 Background 사용) */
const COLORS = {
  card: '#1E293B',
  purple: '#6366F1',
  purpleSoft: '#818cf8',
  violet: '#8B5CF6',
  gold: '#c9a227',
  goldBright: '#f0c040',
  white: '#FFFFFF',
};

const TAG_META: TagMeta[] = [
  { key: 'together', label: '함께한 사람', dimension: 'PERSON' },
  { key: 'place', label: '장소', dimension: 'PLACE' },
  { key: 'time', label: '시간', dimension: 'TIME' },
  { key: 'activity', label: '활동', dimension: 'ACTIVITY' },
  { key: 'emotion', label: '감정', dimension: 'EMOTION' },
];

/** 온보딩 선택 성단 순서(1~5) → ic_cluster1~5 1:1 매핑 */
function userClusterToIconIndex(
  category: string,
  userClusters: string[],
): ClusterIndex {
  const index = userClusters.indexOf(category);
  return (((index >= 0 ? index : 0) % 5) + 1) as ClusterIndex;
}

/** 온보딩 선택 성단 목록 안에서만 순환 */
function nextUserCluster(current: string, userClusters: string[]): string {
  if (userClusters.length === 0) return current;
  const index = userClusters.indexOf(current);
  const next = (index >= 0 ? index + 1 : 0) % userClusters.length;
  return userClusters[next];
}

/**
 * AI 추천 주 성단을 온보딩 선택 목록에 맞춰 초기값으로 해석.
 * 1) AI primary가 선택 목록에 있으면 그대로
 * 2) ranking 중 선택 목록에 있는 첫 항목
 * 3) 선택 목록 첫 성단
 */
function resolveInitialUserCluster(
  aiPrimary: string,
  ranking: CategoryRankingItem[],
  userClusters: string[],
): string {
  if (userClusters.length === 0) {
    return aiPrimary || CONSTELLATION_CATEGORIES[0];
  }
  if (userClusters.includes(aiPrimary)) {
    return aiPrimary;
  }
  for (const item of ranking) {
    if (userClusters.includes(item.category)) {
      return item.category;
    }
  }
  return userClusters[0];
}

const TAG_ICON_SOURCES: Record<keyof Tags, number> = {
  together: require('@/assets_shared/images/Customer.png'),
  place: require('@/assets_shared/images/Address.png'),
  time: require('@/assets_shared/images/Vector.png'),
  activity: require('@/assets_shared/images/Walking.png'),
  emotion: require('@/assets_shared/images/Love.png'),
};

const PEN_ICON = require('@/assets_shared/stars_png/ic_pen.png');
const COMPLETE_STAR_IMAGE = require('@/assets_shared/images/ic_shapestar4.png');

/** STATE1/2 타이틀·서브카피 폭 계산용 — DesignFrame(412) 기준 좌우 대칭 여백 */
const TITLE_MAX_WIDTH = 412 - ScreenLayout.titleX * 2;
const SUBTITLE_MAX_WIDTH = 412 - ScreenLayout.subtitleX * 2;
/** 별 생성 플로우 본문(타이틀~입력) 아래로 내리는 보정 — DesignFrame px */
const STAR_CREATE_CONTENT_OFFSET_Y = 30;
/** 보완 입력 화면은 헤더·줄간격 때문에 더 내려가 보여 오프셋을 줄임 */
const SUPPLEMENT_CONTENT_OFFSET_Y = 8;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getSeasonGalaxy(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

function splitTagValues(raw: string): string[] {
  const parts = raw
    .split(/[,，、\n]/)
    .map((part) => sanitizeTag(part))
    .filter((part) => part.length > 0);
  return parts;
}

function apiTagsToUi(tags: DailyRecordTags): Tags {
  const clean = sanitizeDailyRecordTags(tags);
  return {
    together: (clean.PERSON ?? []).join(', '),
    place: (clean.PLACE ?? []).join(', '),
    time: (clean.TIME ?? []).join(', '),
    activity: (clean.ACTIVITY ?? []).join(', '),
    emotion: (clean.EMOTION ?? []).join(', '),
  };
}

function uiTagsToApi(tags: Tags): DailyRecordTags {
  const toValues = (value: string): string[] => {
    const parts = splitTagValues(value).slice(0, 5);
    return parts.length > 0 ? parts : ['미입력'];
  };
  return sanitizeDailyRecordTags({
    PERSON: toValues(tags.together),
    PLACE: toValues(tags.place),
    ACTIVITY: toValues(tags.activity),
    TIME: toValues(tags.time),
    EMOTION: toValues(tags.emotion),
  });
}

/** 보완 답변을 비어 있는 차원에 반영 */
function mergeSupplementAnswer(
  tags: DailyRecordTags,
  missingQuestions: MissingQuestion[],
  answer: string,
): DailyRecordTags {
  const trimmed = sanitizeTag(answer);
  const base = sanitizeDailyRecordTags(tags);
  const next: DailyRecordTags = {
    PERSON: [...(base.PERSON ?? [])],
    PLACE: [...(base.PLACE ?? [])],
    ACTIVITY: [...(base.ACTIVITY ?? [])],
    TIME: [...(base.TIME ?? [])],
    EMOTION: [...(base.EMOTION ?? [])],
  };

  for (const question of missingQuestions) {
    if ((next[question.dimension] ?? []).length === 0 && trimmed) {
      next[question.dimension] = [trimmed];
    }
  }

  for (const dimension of DAILY_RECORD_DIMENSIONS) {
    if ((next[dimension] ?? []).length === 0) {
      next[dimension] = [trimmed || '미입력'];
    }
  }

  return sanitizeDailyRecordTags(next);
}

function showProcessError() {
  Alert.alert(
    '알림',
    'AI 분석 응답이 지연되었습니다. 잠시 후 다시 시도해 주세요.',
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function BackChevron() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="rgba(248,238,193,0.8)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WarningIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L22 20H2L12 3Z"
        stroke="#F8EEC1"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d="M12 10v4" stroke="#F8EEC1" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M12 16.6v.01" stroke="#F8EEC1" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function EditIcon({ active }: { active: boolean }) {
  const color = active ? COLORS.purpleSoft : 'rgba(255,255,255,0.25)';
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StarIcon({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!animated) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.08,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.45,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animated, glow, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: glow }}>
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Path
          d="M20 2 L22.5 17.5 L38 20 L22.5 22.5 L20 38 L17.5 22.5 L2 20 L17.5 17.5 Z"
          fill={COLORS.gold}
          stroke={COLORS.goldBright}
          strokeWidth={0.5}
        />
        <Path
          d="M20 8 L21.2 18.8 L32 20 L21.2 21.2 L20 32 L18.8 21.2 L8 20 L18.8 18.8 Z"
          fill={COLORS.goldBright}
          opacity={0.6}
        />
      </Svg>
    </Animated.View>
  );
}

function PurpleStarIcon({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <SvgLinearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.purpleSoft} />
          <Stop offset="100%" stopColor={COLORS.violet} />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M24 2 L27 21 L46 24 L27 27 L24 46 L21 27 L2 24 L21 21 Z"
        fill="url(#purpleGrad)"
        stroke="#a78bfa"
        strokeWidth={0.5}
      />
    </Svg>
  );
}

// ─── Shared chrome ─────────────────────────────────────────────────────────

function StarCreateHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.chromeHeaderWrap, { paddingTop: insets.top + 12 }]}>
      <View style={styles.chromeHeaderRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.chromeHeaderBack}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityLabel="뒤로가기"
        >
          <BackChevron />
        </TouchableOpacity>
        <AppText style={styles.chromeHeaderTitle}>별 생성하기</AppText>
      </View>
      <View style={styles.chromeHeaderDivider} />
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.backButton}
      accessibilityLabel="뒤로가기"
      activeOpacity={0.7}
    >
      <BackChevron />
    </TouchableOpacity>
  );
}

function BottomButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.bottomButton, disabled && styles.bottomButtonDisabled]}
    >
      <LinearGradient
        colors={
          disabled
            ? ['rgba(248,238,193,0.12)', 'rgba(248,238,193,0.08)']
            : ['rgba(40,50,90,0.95)', 'rgba(25,35,70,0.98)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bottomButtonGradient}
      >
        <Text style={[styles.bottomButtonText, disabled && styles.bottomButtonTextDisabled]}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── STATE 1: Base ─────────────────────────────────────────────────────────

function BaseScreen({
  onNext,
  onBack,
}: {
  onNext: (text: string) => void;
  onBack: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const { x, y } = scaleDesign(width, height);
  const [text, setText] = useState('');
  const [showError, setShowError] = useState(false);

  const handleChange = (value: string) => {
    setText(value);
    if (showError && value.trim().length > 0) setShowError(false);
  };

  const handleSubmit = () => {
    if (text.trim().length === 0) {
      setShowError(true);
      return;
    }
    onNext(text);
  };

  return (
    <View style={styles.flexFill}>
      <StarCreateHeader onBack={onBack} />

      <AppText
        variant="emphasis"
        style={{
          ...styles.baseTitle,
          left: x(ScreenLayout.titleX),
          top: y(ScreenLayout.titleY + STAR_CREATE_CONTENT_OFFSET_Y),
          width: x(TITLE_MAX_WIDTH),
        }}
      >
        오늘의 관측을 기록해보세요.
      </AppText>

      <AppText
        style={{
          ...styles.baseSubtitle,
          left: x(ScreenLayout.subtitleX),
          top: y(ScreenLayout.subtitleY + STAR_CREATE_CONTENT_OFFSET_Y),
          width: x(SUBTITLE_MAX_WIDTH),
        }}
      >
        {'짧게, 2-3문장도 괜찮아요.\n한 줄의 기록도 하나의 별이 됩니다.'}
      </AppText>

      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholder="오늘 하루를 기록해보세요..."
        placeholderTextColor={withOpacity(Palette.cream, 0.6)}
        multiline
        textAlignVertical="top"
        style={[
          styles.textArea,
          {
            left: x(ScreenLayout.textAreaX),
            top: y(ScreenLayout.textAreaY + STAR_CREATE_CONTENT_OFFSET_Y),
            width: x(ScreenLayout.textAreaWidth),
            height: y(ScreenLayout.textAreaHeight),
            textAlignVertical: 'top',
          },
        ]}
      />

      {showError && (
        <View
          style={[
            styles.errorRow,
            {
              left: x(ScreenLayout.textAreaX),
              top:
                y(ScreenLayout.textAreaY + STAR_CREATE_CONTENT_OFFSET_Y) +
                y(ScreenLayout.textAreaHeight) +
                10,
              width: x(ScreenLayout.textAreaWidth),
            },
          ]}
        >
          <WarningIcon />
          <AppText style={styles.errorText}>내용을 입력해주세요.</AppText>
        </View>
      )}

      <PrimaryButton label="기록 분석하기" pinnedToLargeTop onPress={handleSubmit} />
    </View>
  );
}

// ─── STATE 2: Supplement ────────────────────────────────────────────────────

/** 하루 기록 화면 서브카피(y:300) ↔ 텍스트창(y:370) 간격의 절반 — 디자인 px */
const SUPPLEMENT_BLOCK_GAP = (ScreenLayout.textAreaY - ScreenLayout.subtitleY) / 2; // 35

function SupplementScreen({
  missingQuestions,
  onNext,
  onBack,
  submitting,
}: {
  missingQuestions: MissingQuestion[];
  onNext: (text: string) => void;
  onBack: () => void;
  submitting?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const { x, y } = scaleDesign(width, height);
  const [text, setText] = useState('');
  const [titleBottom, setTitleBottom] = useState(0);
  const [questionsBottom, setQuestionsBottom] = useState(0);

  const blockGap = y(SUPPLEMENT_BLOCK_GAP);
  const titleTop = y(ScreenLayout.titleY + SUPPLEMENT_CONTENT_OFFSET_Y);
  const questionsTop =
    titleBottom > 0
      ? titleBottom + y(8)
      : y(ScreenLayout.subtitleY + SUPPLEMENT_CONTENT_OFFSET_Y);
  const textAreaTop =
    questionsBottom > 0
      ? questionsBottom + blockGap
      : y(ScreenLayout.textAreaY + SUPPLEMENT_CONTENT_OFFSET_Y);
  /** 버튼(y:820)과 겹치지 않도록 텍스트창 하단 여유 */
  const maxTextAreaTop = y(ScreenLayout.largeButtonTop) - y(ScreenLayout.textAreaHeight) - y(24);
  const clampedTextAreaTop = Math.min(textAreaTop, maxTextAreaTop);

  return (
    <View style={styles.flexFill}>
      <StarCreateHeader onBack={onBack} />

      <AppText
        variant="emphasis"
        onLayout={(e) => {
          const { y: layoutY, height: layoutH } = e.nativeEvent.layout;
          setTitleBottom(layoutY + layoutH);
        }}
        style={{
          ...styles.baseTitle,
          ...styles.supplementTitle,
          left: x(ScreenLayout.titleX),
          top: titleTop,
          width: x(TITLE_MAX_WIDTH),
        }}
      >
        {'더 정확한 별을 남기기 위해\n아래 내용을 보완해 보세요.'}
      </AppText>

      <View
        style={[
          styles.supplementQuestionList,
          {
            left: x(ScreenLayout.subtitleX),
            top: questionsTop,
            width: x(SUBTITLE_MAX_WIDTH),
          },
        ]}
        onLayout={(e) => {
          const { y: layoutY, height: layoutH } = e.nativeEvent.layout;
          setQuestionsBottom(layoutY + layoutH);
        }}
      >
        {missingQuestions.map((q) => (
          <AppText key={q.dimension} style={styles.supplementQuestion}>
            {q.question}
          </AppText>
        ))}
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="자유롭게 작성해보세요..."
        placeholderTextColor={withOpacity(Palette.cream, 0.6)}
        multiline
        textAlignVertical="top"
        editable={!submitting}
        style={[
          styles.textArea,
          {
            left: x(ScreenLayout.textAreaX),
            top: clampedTextAreaTop,
            width: x(ScreenLayout.textAreaWidth),
            height: y(ScreenLayout.textAreaHeight),
            textAlignVertical: 'top',
          },
        ]}
      />

      <PrimaryButton
        label="확인"
        pinnedToLargeTop
        disabled={submitting || text.trim().length === 0}
        onPress={() => onNext(text)}
      />
    </View>
  );
}

// ─── Tag Edit Modal ────────────────────────────────────────────────────────

function TagEditModal({
  visible,
  tagLabel,
  currentValue,
  onSave,
  onClose,
}: {
  visible: boolean;
  tagLabel: string;
  currentValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    if (visible) setValue(currentValue);
  }, [visible, currentValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tagLabel}를 수정해주세요.</Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modalInputWrap}>
              <TextInput
                value={value}
                onChangeText={setValue}
                autoFocus
                multiline
                textAlignVertical="top"
                style={styles.modalInput}
                placeholderTextColor={withOpacity('#0A1833', 0.45)}
              />
            </View>

            <Pressable
              style={styles.modalSaveBtn}
              onPress={() => {
                onSave(value.trim() || currentValue);
                onClose();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.modalSaveLabel}>수정 완료</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── STATE 3: Confirm ──────────────────────────────────────────────────────

function ConfirmScreen({
  tags: initialTags,
  cluster,
  clusterId,
  onCycleCluster,
  onNext,
  onBack,
  submitting,
}: {
  tags: Tags;
  cluster: string;
  clusterId: ClusterIndex;
  onCycleCluster: () => void;
  onNext: (tags: Tags) => void;
  onBack: () => void;
  submitting?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const { y } = scaleDesign(width, height);
  const [tags, setTags] = useState<Tags>(initialTags);
  const [editingKey, setEditingKey] = useState<keyof Tags | null>(null);

  const rows: { key: keyof Tags; label: string }[] = TAG_META.map((meta) => ({
    key: meta.key,
    label: meta.label,
  }));

  const editingRow = rows.find((r) => r.key === editingKey);

  return (
    <View style={styles.flexFill}>
      <StarCreateHeader onBack={onBack} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.confirmScrollPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="emphasis" style={styles.confirmTitle}>
          관측을 완료했어요.
        </AppText>
        <AppText style={styles.confirmSubtitle}>
          기록을 바탕으로 별의 특징을 분석했어요.
        </AppText>

        <TouchableOpacity
          style={styles.clusterBlock}
          onPress={onCycleCluster}
          activeOpacity={0.75}
          disabled={submitting}
        >
          <ClusterIcon cluster={clusterId} label={cluster} iconSize={52} />
          <AppText style={styles.clusterHint}>탭하여 성단을 변경할 수 있어요</AppText>
        </TouchableOpacity>

        <View style={styles.tagList}>
          {rows.map((r) => {
            const isActive = editingKey === r.key;
            return (
              <View
                key={r.key}
                style={[
                  styles.tagRow,
                  isActive && styles.tagRowActive,
                ]}
              >
                <Image
                  source={TAG_ICON_SOURCES[r.key]}
                  style={styles.tagIconImage}
                  resizeMode="contain"
                />
                <AppText style={styles.tagLabel}>{r.label}</AppText>
                <AppText style={styles.tagValue} numberOfLines={2}>
                  {tags[r.key]}
                </AppText>
                <TouchableOpacity
                  onPress={() => setEditingKey(r.key)}
                  style={styles.editBtn}
                  hitSlop={8}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Image source={PEN_ICON} style={styles.penIcon} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* PrimaryButton absolute pin 여유 */}
        <View style={{ height: y(ScreenLayout.largeButtonHeight) + y(40) }} />
      </ScrollView>

      <PrimaryButton
        label="별 생성하기"
        pinnedToLargeTop
        disabled={submitting}
        onPress={() => onNext(tags)}
      />

      {editingRow && editingKey && (
        <TagEditModal
          visible
          tagLabel={editingRow.label}
          currentValue={tags[editingKey]}
          onSave={(val) => setTags((prev) => ({ ...prev, [editingKey]: val }))}
          onClose={() => setEditingKey(null)}
        />
      )}
    </View>
  );
}

// ─── STATE 4: Complete ─────────────────────────────────────────────────────

function CompleteScreen({
  cluster,
  starIndex,
  onHome,
}: {
  cluster: string;
  starIndex: number;
  onHome: () => void | Promise<void>;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const season = getSeasonGalaxy();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, slideUp]);

  return (
    <SafeAreaView style={styles.confirmScreenCol} edges={['top', 'bottom']}>
      <Animated.View
        style={[
          styles.completeCenter,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        <AppText variant="emphasis" style={styles.confirmTitle}>
          새로운 별이 탄생했어요!
        </AppText>
        <AppText style={styles.confirmSubtitle}>
          오늘의 빛이 은하에 기록되었어요.
        </AppText>

        <Image
          source={COMPLETE_STAR_IMAGE}
          style={styles.completeStarImage}
          resizeMode="contain"
        />

        <AppText style={styles.completeMeta}>
          {`${year}년 ${month}월 ${day}일\n${season}의 은하\n${cluster} 성단의 ${starIndex}번째 별`}
        </AppText>
      </Animated.View>

      <PrimaryButton label="확인" pinnedToLargeTop onPress={onHome} />
    </SafeAreaView>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

// ─── Loading ───────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingCenter}>
      <ActivityIndicator color="#FFF9DD" size="large" />
      <AppText style={styles.loadingText}>{message}</AppText>
    </View>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

export default function StarRecordView() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>('base');
  const [loadingMessage, setLoadingMessage] = useState('빛의 속도로 분석하는 중...');
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [apiTags, setApiTags] = useState<DailyRecordTags | null>(null);
  const [missingQuestions, setMissingQuestions] = useState<MissingQuestion[]>([]);
  /** 온보딩에서 선택한 성단 이름 목록 (선택 순서 = 성단 1~5) */
  const [userClusters, setUserClusters] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<string>('');
  const [starIndex, setStarIndex] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getOnboardingStatus();
        const categories = status.north_star?.selected_categories ?? [];
        if (!cancelled && categories.length > 0) {
          setUserClusters(categories);
          setPrimaryCategory((prev) => prev || categories[0]);
        }
      } catch (error) {
        console.error('Onboarding clusters load error:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clusterId = userClusterToIconIndex(primaryCategory, userClusters);
  const uiTags = apiTags ? apiTagsToUi(apiTags) : null;

  const goToConfirmWithDetails = async (
    id: string,
    tags: DailyRecordTags,
    clusters: string[] = userClusters,
  ): Promise<boolean> => {
    setLoadingMessage('별의 특징을 정리하는 중...');
    setScreen('loading');
    try {
      const details = await updateDailyRecordDetails(id, tags);
      setApiTags(sanitizeDailyRecordTags(details.tags));
      setPrimaryCategory(
        resolveInitialUserCluster(
          details.primary_category,
          details.category_ranking ?? [],
          clusters,
        ),
      );
      setScreen('confirm');
      return true;
    } catch (error) {
      console.error('Daily record details error:', error);
      showProcessError();
      return false;
    }
  };

  const handleBaseNext = async (text: string) => {
    if (submitting) return;
    setSubmitting(true);
    setLoadingMessage('빛의 속도로 분석하는 중...');
    setScreen('loading');
    try {
      // 온보딩 선택 성단이 아직 없으면 한 번 더 로드
      let clusters = userClusters;
      if (clusters.length === 0) {
        try {
          const status = await getOnboardingStatus();
          clusters = status.north_star?.selected_categories ?? [];
          if (clusters.length > 0) setUserClusters(clusters);
        } catch (error) {
          console.error('Onboarding clusters load error:', error);
        }
      }

      const data = await analyzeDailyRecord(text);
      const cleanedTags = sanitizeDailyRecordTags(data.tags);
      setAnalysisId(data.analysis_id);
      setApiTags(cleanedTags);
      setMissingQuestions(data.missing_questions ?? []);

      if ((data.missing_questions ?? []).length > 0) {
        setScreen('supplement');
        return;
      }

      const ok = await goToConfirmWithDetails(
        data.analysis_id,
        cleanedTags,
        clusters,
      );
      if (!ok) setScreen('base');
    } catch (error) {
      console.error('Daily record analyze error:', error);
      showProcessError();
      setScreen('base');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupplementNext = async (answer: string) => {
    if (!analysisId || !apiTags || submitting) return;
    if (answer.trim().length === 0) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    const merged = mergeSupplementAnswer(apiTags, missingQuestions, answer);
    setApiTags(merged);
    const ok = await goToConfirmWithDetails(analysisId, merged, userClusters);
    if (!ok) setScreen('supplement');
    setSubmitting(false);
  };

  const handleCycleCluster = () => {
    setPrimaryCategory((prev) => nextUserCluster(prev, userClusters));
  };

  const handleConfirmNext = async (editedTags: Tags) => {
    if (!analysisId || submitting) return;
    setSubmitting(true);
    setLoadingMessage('별을 생성하는 중...');
    setScreen('loading');

    try {
      const tagsPayload = uiTagsToApi(editedTags);
      const details = await updateDailyRecordDetails(analysisId, tagsPayload);
      setApiTags(sanitizeDailyRecordTags(details.tags));

      // 사용자가 순환 선택한 성단 이름 → confirm primary_category
      const selectedCategory =
        (userClusters.includes(primaryCategory)
          ? primaryCategory
          : resolveInitialUserCluster(
              details.primary_category,
              details.category_ranking ?? [],
              userClusters,
            )) || details.primary_category;

      await confirmDailyRecord(analysisId, selectedCategory);
      setPrimaryCategory(selectedCategory);

      try {
        const home = await getHome();
        const constellation = home.constellations.find(
          (item) => item.category === selectedCategory,
        );
        setStarIndex(constellation?.star_count ?? 1);
      } catch (homeError) {
        console.error('Home sync error:', homeError);
        setStarIndex(1);
      }

      setScreen('complete');
    } catch (error) {
      console.error('Daily record confirm error:', error);
      showProcessError();
      setScreen('confirm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHome = async () => {
    try {
      await getHome();
    } catch (error) {
      console.error('Home refetch error:', error);
    } finally {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.root, { width, height }]}>
      <Background width={width} height={height} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScreenContainer withTopPadding={false} withHorizontalPadding={false}>
          {screen === 'base' && (
            <BaseScreen onNext={handleBaseNext} onBack={() => router.back()} />
          )}
          {screen === 'loading' && <LoadingScreen message={loadingMessage} />}
          {screen === 'supplement' && (
            <SupplementScreen
              missingQuestions={missingQuestions}
              onNext={handleSupplementNext}
              onBack={() => setScreen('base')}
              submitting={submitting}
            />
          )}
          {screen === 'confirm' && uiTags && (
            <ConfirmScreen
              key={analysisId ?? 'confirm'}
              tags={uiTags}
              cluster={primaryCategory}
              clusterId={clusterId}
              onCycleCluster={handleCycleCluster}
              onNext={handleConfirmNext}
              onBack={() =>
                setScreen(missingQuestions.length > 0 ? 'supplement' : 'base')
              }
              submitting={submitting}
            />
          )}
          {screen === 'complete' && (
            <CompleteScreen
              cluster={primaryCategory}
              starIndex={starIndex}
              onHome={handleHome}
            />
          )}
        </ScreenContainer>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  flex: {
    flex: 1,
  },
  flexFill: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Palette.cream,
    textAlign: 'center',
  },

  // ─ Shared header (STATE 1 / STATE 2 / STATE 3) ─
  chromeHeaderWrap: {
    paddingTop: 0,
  },
  chromeHeaderRow: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chromeHeaderBack: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  chromeHeaderTitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Palette.cream,
    textAlign: 'center',
  },
  chromeHeaderDivider: {
    height: 1,
    width: '92%',
    marginHorizontal: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(248,238,193,0.15)',
  },

  // ─ STATE 1: base ─
  baseTitle: {
    position: 'absolute',
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFF9DD',
    textAlign: 'center',
  },
  baseSubtitle: {
    position: 'absolute',
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.cream,
    textAlign: 'center',
  },
  errorRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#F8EEC1',
    textAlign: 'center',
  },

  // ─ Shared text area (STATE 1 / STATE 2) ─
  textArea: {
    position: 'absolute',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Palette.cream,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    textAlign: 'center',
    textAlignVertical: 'top',
    backgroundColor: withOpacity(Palette.cream, 0.15),
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
  },

  // ─ STATE 2: supplement ─
  supplementTitle: {
    lineHeight: 28,
  },
  supplementQuestionList: {
    position: 'absolute',
    gap: 4,
  },
  supplementQuestion: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    color: Palette.cream,
    textAlign: 'center',
  },

  // ─ STATE 3 / 4: confirm & complete chrome ─
  confirmScreenCol: {
    flex: 1,
  },
  confirmHeaderRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexShrink: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollPad: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    flexShrink: 0,
  },
  bottomButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(248,238,193,0.25)',
  },
  bottomButtonDisabled: {
    borderColor: 'rgba(248,238,193,0.1)',
  },
  bottomButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.4,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  bottomButtonTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  // ─ STATE 3: confirm ─
  confirmScrollPad: {
    paddingHorizontal: 24,
    paddingTop: 46,
    paddingBottom: 24,
  },
  confirmTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFF9DD',
    textAlign: 'center',
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  confirmSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.cream,
    textAlign: 'center',
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  clusterBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  clusterName: {
    fontFamily: FontFamily.regular,
    color: Palette.cream,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  clusterHint: {
    fontFamily: FontFamily.extraLight,
    color: Palette.cream,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  tagList: {
    gap: 6,
    marginBottom: 20,
    width: '100%',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.button.fill,
    borderWidth: 1,
    borderColor: Colors.tag.borderInactive,
  },
  tagRowActive: {
    backgroundColor: Colors.button.fill,
    borderColor: Colors.tag.borderActive,
    borderWidth: 2,
  },
  tagIconImage: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  tagLabel: {
    fontFamily: FontFamily.regular,
    color: Colors.text.tag,
    fontSize: 12,
    width: 80,
  },
  tagValue: {
    fontFamily: FontFamily.regular,
    color: Colors.text.tag,
    fontSize: 14,
    flex: 1,
  },
  editBtn: {
    marginLeft: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.45),
    backgroundColor: withOpacity(Palette.cream, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  penIcon: {
    width: 16,
    height: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
    backgroundColor: withOpacity(Palette.cream, 0.3),
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    letterSpacing: -0.2,
    color: Palette.cream,
    paddingRight: 8,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    fontFamily: FontFamily.regular,
    fontSize: 26,
    lineHeight: 28,
    color: Palette.cream,
    includeFontPadding: false,
  },
  modalInputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
    backgroundColor: withOpacity(Palette.cream, 0.6),
    marginBottom: 16,
    overflow: 'hidden',
  },
  modalInput: {
    minHeight: 120,
    maxHeight: 180,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: FontFamily.light,
    fontSize: 14,
    lineHeight: 22,
    color: '#0A1833',
  },
  modalSaveBtn: {
    alignSelf: 'center',
    minWidth: 168,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
    backgroundColor: withOpacity(Palette.cream, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalSaveLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 15,
    color: Palette.cream,
    letterSpacing: -0.2,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  completeCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completeStarImage: {
    width: 160,
    height: 160,
    marginTop: 8,
    marginBottom: 24,
  },
  completeMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.cream,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});
