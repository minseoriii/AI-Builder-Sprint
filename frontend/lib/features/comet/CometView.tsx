import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  AppText,
  AutoRefreshOnFocus,
  Background,
  BottomNavigationBar,
  BottomNavigationBarDimensions,
  FontFamily,
  ImageAssets,
  Palette,
  PrimaryButton,
  ResponsiveScreen,
  TagButton,
  bottomNavigationInset,
  scaleDesign,
  showConnectionError,
  useResponsive,
  useResponsiveStyles,
  useTabExitConfirm,
  withOpacity,
} from '@/assets_shared';
import {
  acceptCometRecommendation,
  completeComet,
  createComet,
  deleteComet,
  generateCometRecommendation,
  listComets,
  splitIsoDate,
  toIsoDate,
  todayIsoDate,
  updateComet,
  type CometItem,
  type CometRecommendationItem,
} from '@/lib/api/comets';
import { logHandledApiError } from '@/lib/api/logHandledApiError';
import { getOnboardingStatus } from '@/lib/api/onboarding';

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'main' | 'choice' | 'manual' | 'ai' | 'complete';
type Tab = 'observing' | 'completed';

interface FormState {
  name: string;
  activity: string;
  cluster: string;
  year: string;
  month: string;
  day: string;
}

interface DateError {
  date?: string;
  year?: string;
  month?: string;
  day?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  name: '',
  activity: '',
  cluster: '',
  year: '',
  month: '',
  day: '',
};

const DAYS_IN_MONTH: Record<number, number> = {
  1: 31,
  2: 28,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

const CHOICE_LAYOUT = {
  titleX: 101,
  titleY: 270,
  subtitleX: 96,
  subtitleY: 360,
  aiButtonX: 20,
  aiButtonY: 540,
  manualButtonX: 20,
  manualButtonY: 614,
} as const;

function reportCometApiError(label: string, error: unknown, onRetry?: () => void) {
  logHandledApiError(label, error);
  showConnectionError(onRetry ? { onRetry } : undefined);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return '';
  return `${year}년 ${month}월 ${day}일 까지`;
}

function formatCometTargetDate(item: CometItem) {
  const { year, month, day } = splitIsoDate(item.target_completion_date);
  return formatDate(year, month, day);
}

const CLUSTER_ORDER_COLORS = [
  Palette.cluster1,
  Palette.cluster2,
  Palette.cluster3,
  Palette.cluster4,
  Palette.cluster5,
] as const;

function clusterColorFor(
  category: string,
  userClusters: string[],
): string {
  const index = userClusters.indexOf(category);
  if (index >= 0 && index < CLUSTER_ORDER_COLORS.length) {
    return CLUSTER_ORDER_COLORS[index];
  }
  return Palette.cream;
}

function validateDate(year: string, month: string, day: string): DateError {
  const errors: DateError = {};
  const isNum = (v: string) => /^\d+$/.test(v.trim());

  if (year && !isNum(year)) errors.year = '숫자만 입력 가능합니다.';
  if (month && !isNum(month)) errors.month = '숫자만 입력 가능합니다.';
  if (day && !isNum(day)) errors.day = '숫자만 입력 가능합니다.';

  const allNumeric =
    year && month && day && isNum(year) && isNum(month) && isNum(day);
  if (allNumeric) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);

    if (m < 1 || m > 12) {
      errors.date = '유효한 날짜를 선택해주세요.';
      return errors;
    }

    const maxDay = DAYS_IN_MONTH[m];
    if (d < 1 || d > maxDay) {
      errors.date = '유효한 날짜를 선택해주세요.';
      return errors;
    }

    const entered = new Date(y, m - 1, d);
    const min = new Date(2026, 7, 3); // 2026-08-03
    if (entered < min) {
      errors.date = '2026년 8월 3일 이후로 선택할 수 있습니다.';
    }
  }
  return errors;
}

function isCometFailed(item: CometItem): boolean {
  if (!item.target_completion_date) return false;
  const { year, month, day } = splitIsoDate(item.target_completion_date);
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (!y || !m || !d) return false;
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target < today;
}

function recommendationToForm(rec: CometRecommendationItem): FormState {
  const { year, month, day } = splitIsoDate(rec.expires_at);
  return {
    name: rec.title,
    activity: rec.description,
    cluster: rec.target_category,
    year,
    month,
    day,
  };
}

/** 천문연구소(Observatory) 헤더·세그먼트 탭과 동일 스펙 */
const labChromeStyles = StyleSheet.create({
  pageHeader: {
    paddingTop: 38,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: Palette.cream,
  },
  tabsPad: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  segmentWrap: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  segmentBtnActive: {
    backgroundColor: withOpacity(Palette.cream, 0.15),
    borderColor: withOpacity(Palette.cream, 0.6),
  },
  segmentBtnInactive: {
    backgroundColor: withOpacity('#0A1833', 0.45),
    borderColor: withOpacity(Palette.cream, 0.25),
  },
  segmentLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: -0.2,
    color: Palette.cream,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: 0,
  },
  segmentLabelActive: {
    fontFamily: FontFamily.medium,
    color: Palette.cream,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});

/** 별 생성하기(StarRecord) chromeHeader와 동일 스펙 */
const registerHeaderStyles = StyleSheet.create({
  wrap: {
    paddingTop: 17,
  },
  row: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  back: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  title: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: '#F8EEC1',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '92%',
    marginHorizontal: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(248,238,193,0.15)',
  },
});

/** 혜성 등록 선택 화면 타이포 — 별 기록 baseTitle / baseSubtitle과 동일 */
const choiceChromeStyles = StyleSheet.create({
  title: {
    position: 'absolute',
    fontFamily: FontFamily.medium,
    fontSize: 18.72, // 23.4 * 0.8
    color: '#FFF9DD',
    textAlign: 'center',
  },
  subtitle: {
    position: 'absolute',
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.cream,
    textAlign: 'center',
  },
});

/** 혜성 등록 완료 화면 — 별 기록 baseTitle / baseSubtitle과 동일 */
const completeChromeStyles = StyleSheet.create({
  title: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    color: '#FFF9DD',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.cream,
    textAlign: 'center',
  },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 17.6,
    color: Palette.cream,
    textAlign: 'center',
  },
  activity: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: withOpacity(Palette.cream, 0.7),
    textAlign: 'center',
  },
  cluster: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  date: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: withOpacity(Palette.cream, 0.55),
    textAlign: 'center',
  },
});

function RegisterHeaderChevron() {
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

/** 별 생성하기 입력 경고 아이콘과 동일 */
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
      <Path
        d="M12 16.6v.01"
        stroke="#F8EEC1"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function FieldError({ message }: { message: string }) {
  const styles = useResponsiveStyles(STYLE_DEF);
  return (
    <View style={styles.fieldErrorRow}>
      <WarningIcon />
      <AppText style={styles.fieldErrorText}>{message}</AppText>
    </View>
  );
}

// ─── Style definitions ───────────────────────────────────────────────────────

const STYLE_DEF = {
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  emptyCenter: {
    flexGrow: 1,
    minHeight: '100%',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
    color: withOpacity(Palette.cream, 0.45),
    fontSize: 14,
  },
  listPad: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  mainBottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: withOpacity('#FFFFFF', 0.06),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.12),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardStarIcon: {
    width: 14,
    height: 14,
  },
  cardName: {
    fontSize: 14,
    flexShrink: 1,
  },
  clusterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: withOpacity('#FFFFFF', 0.1),
  },
  clusterBadgeText: {
    fontSize: 11,
  },
  cardActivity: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.6),
    marginBottom: 12,
    paddingLeft: 16,
  },
  cardDate: {
    fontSize: 11,
    color: withOpacity(Palette.cream, 0.4),
    textAlign: 'right',
    marginBottom: 12,
  },
  cardPrimaryBtn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  formScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 9,
  },
  aiGuide: {
    marginTop: 25,
    marginBottom: 8,
  },
  aiGuideMain: {
    fontFamily: FontFamily.medium,
    fontSize: 15.295, // 16.1 * 0.95
    lineHeight: 24.035,
    color: withOpacity(Palette.cream, 0.8),
    marginBottom: 6,
    textAlign: 'center',
  },
  aiGuideSub: {
    fontSize: 13.8,
    lineHeight: 20.7,
    color: withOpacity(Palette.cream, 0.45),
    textAlign: 'center',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#F8EEC1',
    marginBottom: 8,
  },
  touchInput: {
    backgroundColor: withOpacity('#FFFFFF', 0.07),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.15),
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  touchInputTall: {
    minHeight: 56,
  },
  touchInputValue: {
    fontSize: 13,
    color: withOpacity(Palette.cream, 0.9),
  },
  touchInputPlaceholder: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.3),
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  fieldErrorText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#F8EEC1',
  },
  clusterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateBox: {
    backgroundColor: withOpacity('#FFFFFF', 0.07),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.15),
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  dateBoxYear: {
    minWidth: 72,
  },
  dateBoxText: {
    fontSize: 13,
    textAlign: 'center',
  },
  dateUnit: {
    fontSize: 13,
    color: withOpacity(Palette.cream, 0.6),
  },
  formBottomCta: {
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 28,
    alignItems: 'center',
  },
  completeBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  completeIcon: {
    width: 96,
    height: 96,
  },
  summaryList: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  completeBottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#1a2660',
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.15),
  },
  modalTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  modalInput: {
    borderRadius: 12,
    padding: 12,
    color: Palette.cream,
    fontSize: 14,
    backgroundColor: withOpacity('#FFFFFF', 0.1),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.2),
  },
  modalInputMulti: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalConfirm: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 12,
    backgroundColor: withOpacity('#FFFFFF', 0.2),
  },
  modalConfirmLabel: {
    fontSize: 14,
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 16, 31, 0.55)',
    zIndex: 50,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: withOpacity(Palette.cream, 0.85),
  },
  cardDelete: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 6,
  },
  cardDeleteLabel: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.4),
  },
} as const;

// ─── Shared UI ───────────────────────────────────────────────────────────────

function SubPageBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={registerHeaderStyles.wrap}>
      <View style={registerHeaderStyles.row}>
        <TouchableOpacity
          onPress={onBack}
          style={registerHeaderStyles.back}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityLabel="뒤로가기"
        >
          <RegisterHeaderChevron />
        </TouchableOpacity>
        <AppText style={registerHeaderStyles.title}>{title}</AppText>
      </View>
      <View style={registerHeaderStyles.divider} />
    </View>
  );
}

function SegmentedControl({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <View style={labChromeStyles.tabsPad}>
      <View style={labChromeStyles.segmentWrap}>
        {(['observing', 'completed'] as Tab[]).map((t) => {
          const active = tab === t;
          const label = t === 'observing' ? '관측 중인 혜성' : '관측 완료된 혜성';
          return (
            <Pressable
              key={t}
              onPress={() => onChange(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                labChromeStyles.segmentBtn,
                active
                  ? labChromeStyles.segmentBtnActive
                  : labChromeStyles.segmentBtnInactive,
              ]}
            >
              <Text
                style={[
                  labChromeStyles.segmentLabel,
                  active && labChromeStyles.segmentLabelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function InputModal({
  visible,
  title,
  value,
  onConfirm,
  onClose,
  multiline,
  keyboardType = 'default',
}: {
  visible: boolean;
  title: string;
  value: string;
  onConfirm: (v: string) => void;
  onClose: () => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  const styles = useResponsiveStyles(STYLE_DEF);
  const [val, setVal] = useState(value);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      onShow={() => setVal(value)}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <AppText variant="emphasis" style={styles.modalTitle}>
            {title}
          </AppText>
          <TextInput
            value={val}
            onChangeText={setVal}
            multiline={multiline}
            autoFocus
            keyboardType={keyboardType}
            placeholderTextColor={withOpacity(Palette.cream, 0.35)}
            style={[styles.modalInput, multiline && styles.modalInputMulti]}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.modalConfirm}
            onPress={() => {
              onConfirm(val);
              onClose();
            }}
          >
            <AppText variant="emphasis" style={styles.modalConfirmLabel}>
              확인
            </AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CometCard({
  comet,
  showObserving,
  clusters,
  busy,
  onComplete,
  onAddToGalaxy,
  onDelete,
}: {
  comet: CometItem;
  showObserving: boolean;
  clusters: string[];
  busy?: boolean;
  onComplete?: (id: string) => void;
  onAddToGalaxy?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const styles = useResponsiveStyles(STYLE_DEF);
  const failed = showObserving && isCometFailed(comet);
  const starCreated = comet.record_status === 'STAR_CREATED';
  const dateLabel = formatCometTargetDate(comet);
  const clusterColor = comet.target_category
    ? clusterColorFor(comet.target_category, clusters)
    : Palette.cream;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardNameRow}>
          <Image
            source={ImageAssets.ic_shapestar1}
            style={styles.cardStarIcon}
            resizeMode="contain"
          />
          <AppText variant="emphasis" style={styles.cardName} numberOfLines={1}>
            {comet.title}
          </AppText>
        </View>
        {comet.target_category ? (
          <View style={styles.clusterBadge}>
            <AppText style={{ ...styles.clusterBadgeText, color: clusterColor }}>
              {comet.target_category}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText style={styles.cardActivity}>
        {comet.description ?? comet.activity_summary ?? ''}
      </AppText>
      {dateLabel ? <AppText style={styles.cardDate}>{dateLabel}</AppText> : null}
      {showObserving ? (
        <PrimaryButton
          label={failed ? '관측 실패' : '관측 완료'}
          size="medium"
          disabled={failed || busy}
          onPress={() => onComplete?.(comet.id)}
          style={styles.cardPrimaryBtn}
        >
          {busy ? <ActivityIndicator color={Palette.cream} /> : undefined}
        </PrimaryButton>
      ) : (
        <PrimaryButton
          label={starCreated ? '성단에 추가됨' : '성단에 추가하기'}
          size="medium"
          disabled={starCreated || busy}
          onPress={() => onAddToGalaxy?.(comet.id)}
          style={styles.cardPrimaryBtn}
        >
          {busy ? <ActivityIndicator color={Palette.cream} /> : undefined}
        </PrimaryButton>
      )}
      {onDelete ? (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          style={styles.cardDelete}
          onPress={() => onDelete(comet.id)}
        >
          <AppText style={styles.cardDeleteLabel}>삭제</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function CometForm({
  form,
  setForm,
  dateErrors,
  setDateErrors,
  onSubmit,
  onBack,
  isAI,
  clusters,
  submitting,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  dateErrors: DateError;
  setDateErrors: (e: DateError) => void;
  onSubmit: () => void;
  onBack: () => void;
  isAI: boolean;
  clusters: string[];
  submitting?: boolean;
}) {
  const styles = useResponsiveStyles(STYLE_DEF);
  const [textModal, setTextModal] = useState<null | {
    field: 'name' | 'activity';
    multiline: boolean;
  }>(null);
  const [numModal, setNumModal] = useState<null | 'year' | 'month' | 'day'>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    activity?: string;
    cluster?: string;
    date?: string;
  }>({});

  const update = (key: keyof FormState, val: string) => {
    const next = { ...form, [key]: val };
    setForm(next);
    if (key === 'year' || key === 'month' || key === 'day') {
      setDateErrors(validateDate(next.year, next.month, next.day));
      setFieldErrors((e) => ({ ...e, date: undefined }));
    }
    if (key === 'name') setFieldErrors((e) => ({ ...e, name: undefined }));
    if (key === 'activity')
      setFieldErrors((e) => ({ ...e, activity: undefined }));
    if (key === 'cluster')
      setFieldErrors((e) => ({ ...e, cluster: undefined }));
  };

  const handleSubmit = () => {
    const errs: {
      name?: string;
      activity?: string;
      cluster?: string;
      date?: string;
    } = {};
    if (!form.name.trim()) errs.name = '혜성 이름의 내용을 입력해주세요.';
    if (!form.activity.trim())
      errs.activity = '활동 내용의 내용을 입력해주세요.';
    if (!form.cluster.trim()) errs.cluster = '성단을 선택해주세요.';
    const dateEmpty = !form.year || !form.month || !form.day;
    if (dateEmpty) errs.date = '관측 목표 날짜의 내용을 입력해주세요.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    const dateCheck = validateDate(form.year, form.month, form.day);
    if (dateCheck.date || dateCheck.year || dateCheck.month || dateCheck.day) {
      setDateErrors(dateCheck);
      return;
    }
    onSubmit();
  };

  return (
    <View style={styles.flex}>
      <SubPageBar title="혜성 등록" onBack={onBack} />

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>혜성 이름</AppText>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.touchInput}
            onPress={() => setTextModal({ field: 'name', multiline: false })}
          >
            {form.name ? (
              <AppText style={styles.touchInputValue}>{form.name}</AppText>
            ) : (
              <AppText style={styles.touchInputPlaceholder}>
                (예시) 미뤄온 전화 한 통
              </AppText>
            )}
          </TouchableOpacity>
          {fieldErrors.name ? <FieldError message={fieldErrors.name} /> : null}
        </View>

        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>활동 내용</AppText>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.touchInput, styles.touchInputTall]}
            onPress={() =>
              setTextModal({ field: 'activity', multiline: true })
            }
          >
            {form.activity ? (
              <AppText style={styles.touchInputValue}>{form.activity}</AppText>
            ) : null}
          </TouchableOpacity>
          {fieldErrors.activity ? (
            <FieldError message={fieldErrors.activity} />
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>연결할 성단</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clusterRow}
          >
            {clusters.map((c) => {
              const selected = form.cluster === c;
              return (
                <TagButton
                  key={c}
                  label={c}
                  selected={selected}
                  onPress={() => update('cluster', selected ? '' : c)}
                />
              );
            })}
          </ScrollView>
          {fieldErrors.cluster ? (
            <FieldError message={fieldErrors.cluster} />
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>관측 목표 날짜</AppText>
          <View style={styles.dateRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.dateBox, styles.dateBoxYear]}
              onPress={() => setNumModal('year')}
            >
              <AppText style={styles.dateBoxText}>{form.year}</AppText>
            </TouchableOpacity>
            <AppText style={styles.dateUnit}>년</AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.dateBox}
              onPress={() => setNumModal('month')}
            >
              <AppText style={styles.dateBoxText}>{form.month}</AppText>
            </TouchableOpacity>
            <AppText style={styles.dateUnit}>월</AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.dateBox}
              onPress={() => setNumModal('day')}
            >
              <AppText style={styles.dateBoxText}>{form.day}</AppText>
            </TouchableOpacity>
            <AppText style={styles.dateUnit}>일 까지</AppText>
          </View>

          {dateErrors.year ? <FieldError message={dateErrors.year} /> : null}
          {dateErrors.month ? <FieldError message={dateErrors.month} /> : null}
          {dateErrors.day ? <FieldError message={dateErrors.day} /> : null}
          {dateErrors.date ? <FieldError message={dateErrors.date} /> : null}
          {fieldErrors.date ? <FieldError message={fieldErrors.date} /> : null}
        </View>

        {isAI ? (
          <View style={styles.aiGuide}>
            <AppText style={styles.aiGuideMain}>
              {
                'AI가 사용자님의 현재 은하를 분석하고\n가장 관측이 필요한 성단을 중심으로\n혜성을 추천했어요.'
              }
            </AppText>
            <AppText style={styles.aiGuideSub}>
              {
                '추천된 혜성은 자유롭게 수정하거나\n직접 다시 구성할 수 있습니다.'
              }
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <LinearGradient
        colors={['rgba(8,14,42,0)', 'rgba(8,14,42,1)']}
        style={styles.formBottomCta}
      >
        <PrimaryButton
          label={submitting ? '등록 중...' : '혜성 등록'}
          size="large"
          disabled={submitting}
          onPress={handleSubmit}
        />
      </LinearGradient>

      <InputModal
        visible={textModal != null}
        title={textModal?.field === 'activity' ? '활동 내용' : '혜성 이름'}
        value={textModal ? form[textModal.field] : ''}
        multiline={textModal?.multiline}
        onConfirm={(v) => {
          if (textModal) update(textModal.field, v);
        }}
        onClose={() => setTextModal(null)}
      />

      <InputModal
        visible={numModal != null}
        title={
          numModal === 'year'
            ? '년도 입력'
            : numModal === 'month'
              ? '월 입력'
              : '일 입력'
        }
        value={numModal ? form[numModal] : ''}
        keyboardType="number-pad"
        onConfirm={(v) => {
          if (numModal) update(numModal, v);
        }}
        onClose={() => setNumModal(null)}
      />
    </View>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export default function CometView() {
  const router = useRouter();
  const styles = useResponsiveStyles(STYLE_DEF);
  const { scale } = useResponsive();
  const { width, height } = useWindowDimensions();
  const { x, y } = scaleDesign(width, height);
  const insets = useSafeAreaInsets();
  const [refreshKey, setRefreshKey] = useState(0);

  const [screen, setScreen] = useState<Screen>('main');
  const [tab, setTab] = useState<Tab>('observing');
  const [observingComets, setObservingComets] = useState<CometItem[]>([]);
  const [completedComets, setCompletedComets] = useState<CometItem[]>([]);
  const [lastComet, setLastComet] = useState<CometItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dateErrors, setDateErrors] = useState<DateError>({});
  const [clusters, setClusters] = useState<string[]>([]);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const navInset = bottomNavigationInset(
    scale(BottomNavigationBarDimensions.height),
  );
  const showNav = screen === 'main';

  const handleInternalBack = useCallback(() => {
    if (screen === 'manual' || screen === 'ai') {
      setScreen('choice');
      return true;
    }
    if (screen === 'choice' || screen === 'complete') {
      setScreen('main');
      return true;
    }
    return false;
  }, [screen]);

  const { ExitConfirmModal } = useTabExitConfirm({
    onBeforeExit: handleInternalBack,
  });

  const loadClusters = useCallback(async () => {
    try {
      const status = await getOnboardingStatus();
      const selected = status.north_star?.selected_categories ?? [];
      if (selected.length > 0) setClusters(selected);
    } catch (error) {
      reportCometApiError('Comet clusters load error', error, () => void loadClusters());
    }
  }, []);

  const loadLists = useCallback(async () => {
    setListLoading(true);
    try {
      const [pending, completed] = await Promise.all([
        listComets('PENDING'),
        listComets('COMPLETED'),
      ]);
      setObservingComets(pending.items);
      setCompletedComets(completed.items);
    } catch (error) {
      reportCometApiError('Comet list load error', error, () => void loadLists());
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadTabList = useCallback(async (nextTab: Tab) => {
    setListLoading(true);
    try {
      if (nextTab === 'observing') {
        const pending = await listComets('PENDING');
        setObservingComets(pending.items);
      } else {
        const completed = await listComets('COMPLETED');
        setCompletedComets(completed.items);
      }
    } catch (error) {
      reportCometApiError('Comet tab list load error', error, () => void loadTabList(nextTab));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClusters();
    void loadLists();
  }, [loadClusters, loadLists, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadLists();
    } finally {
      setRefreshing(false);
    }
  }, [loadLists]);

  const listRefreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        void handlePullRefresh();
      }}
      tintColor={Palette.cream}
      colors={[Palette.cream]}
    />
  );

  const handleTabChange = (next: Tab) => {
    setTab(next);
    void loadTabList(next);
  };

  const handleRegisterManual = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await createComet({
        title: form.name.trim(),
        target_category: form.cluster,
        description: form.activity.trim() || null,
        target_completion_date: toIsoDate(form.year, form.month, form.day),
      });
      setLastComet(created);
      setScreen('complete');
      void loadLists();
    } catch (error) {
      reportCometApiError('Comet create error', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterAI = async () => {
    if (submitting || !recommendationId) return;
    setSubmitting(true);
    try {
      let item = await acceptCometRecommendation(recommendationId);

      const desiredDate = toIsoDate(form.year, form.month, form.day);
      const needsUpdate =
        item.title !== form.name.trim() ||
        (item.description ?? '') !== form.activity.trim() ||
        item.target_category !== form.cluster ||
        (item.target_completion_date ?? '') !== desiredDate;

      if (needsUpdate) {
        item = await updateComet(item.id, {
          title: form.name.trim(),
          description: form.activity.trim() || null,
          target_category: form.cluster,
          target_completion_date: desiredDate,
        });
      }

      setLastComet(item);
      setRecommendationId(null);
      setScreen('complete');
      void loadLists();
    } catch (error) {
      reportCometApiError('Comet accept error', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteComet = async (id: string) => {
    if (actionId) return;
    const comet = observingComets.find((c) => c.id === id);
    if (!comet) return;
    setActionId(id);
    try {
      await completeComet(id, {
        activity_summary:
          (comet.description ?? '').trim() ||
          comet.title ||
          '혜성 관측을 완료했습니다.',
        completed_on: todayIsoDate(),
      });
      setObservingComets((prev) => prev.filter((c) => c.id !== id));
      setTab('completed');
      const completed = await listComets('COMPLETED');
      setCompletedComets(completed.items);
    } catch (error) {
      reportCometApiError('Comet complete error', error);
    } finally {
      setActionId(null);
    }
  };

  const handleAddToGalaxy = (id: string) => {
    router.push({
      pathname: '/star-record',
      params: { source: 'comet', cometId: id },
    });
  };

  const handleDeleteComet = (id: string) => {
    Alert.alert('혜성 삭제', '이 혜성을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (actionId) return;
            setActionId(id);
            try {
              await deleteComet(id);
              setObservingComets((prev) => prev.filter((c) => c.id !== id));
              setCompletedComets((prev) => prev.filter((c) => c.id !== id));
            } catch (error) {
              reportCometApiError('Comet delete error', error);
            } finally {
              setActionId(null);
            }
          })();
        },
      },
    ]);
  };

  const goToRegisterChoice = () => {
    setForm(EMPTY_FORM);
    setDateErrors({});
    setRecommendationId(null);
    setScreen('choice');
  };

  const goToManual = () => {
    setForm(EMPTY_FORM);
    setDateErrors({});
    setRecommendationId(null);
    setScreen('manual');
  };

  const goToAI = async () => {
    if (generatingAI) return;
    setGeneratingAI(true);
    try {
      const result = await generateCometRecommendation();
      const rec = result.recommendation;
      setRecommendationId(rec.id);
      setForm(recommendationToForm(rec));
      setDateErrors({});
      setScreen('ai');
    } catch (error) {
      reportCometApiError('Comet recommendation generate error', error);
    } finally {
      setGeneratingAI(false);
    }
  };

  const renderChoice = () => {
    // SafeAreaView(edges top) 기준 → 전체 화면(412×917) Y에서 inset 보정
    const topOf = (designY: number) => y(designY) - insets.top;

    return (
      <View style={styles.flex}>
        <SubPageBar title="혜성 등록" onBack={() => setScreen('main')} />
        <AppText
          style={{
            ...choiceChromeStyles.title,
            left: x(CHOICE_LAYOUT.titleX),
            top: topOf(CHOICE_LAYOUT.titleY),
            width: x(412 - CHOICE_LAYOUT.titleX * 2),
          }}
        >
          {'관측할 혜성을\n어떻게 등록할까요?'}
        </AppText>
        <AppText
          style={{
            ...choiceChromeStyles.subtitle,
            left: x(CHOICE_LAYOUT.subtitleX),
            top: topOf(CHOICE_LAYOUT.subtitleY),
            width: x(412 - CHOICE_LAYOUT.subtitleX * 2),
          }}
        >
          {
            'AI가 현재 은하 구성을 분석하여\n관측이 필요한 혜성을 추천받거나\n\n원하는 혜성을 직접 등록할 수 있습니다.'
          }
        </AppText>
        <PrimaryButton
          label={generatingAI ? 'AI 분석 중...' : 'AI 혜성 추천'}
          size="large"
          disabled={generatingAI}
          onPress={() => void goToAI()}
          style={{
            position: 'absolute',
            left: x(CHOICE_LAYOUT.aiButtonX),
            top: topOf(CHOICE_LAYOUT.aiButtonY),
            zIndex: 2,
          }}
        />
        <PrimaryButton
          label="혜성 직접 등록"
          size="large"
          disabled={generatingAI}
          onPress={goToManual}
          style={{
            position: 'absolute',
            left: x(CHOICE_LAYOUT.manualButtonX),
            top: topOf(CHOICE_LAYOUT.manualButtonY),
            zIndex: 2,
          }}
        />
        {generatingAI ? (
          <View
            style={[StyleSheet.absoluteFill, styles.loadingOverlay]}
            pointerEvents="none"
          >
            <ActivityIndicator size="large" color={Palette.cream} />
            <AppText style={styles.loadingText}>AI 분석 중...</AppText>
          </View>
        ) : null}
      </View>
    );
  };

  const renderForm = (isAI: boolean) => (
    <CometForm
      form={form}
      setForm={setForm}
      dateErrors={dateErrors}
      setDateErrors={setDateErrors}
      onSubmit={() => {
        void (isAI ? handleRegisterAI() : handleRegisterManual());
      }}
      onBack={() => setScreen('choice')}
      isAI={isAI}
      clusters={clusters}
      submitting={submitting}
    />
  );

  const lastDate = lastComet
    ? formatCometTargetDate(lastComet)
    : '';

  const renderComplete = () => {
    const clusterColor = lastComet
      ? clusterColorFor(lastComet.target_category, clusters)
      : Palette.cream;

    return (
      <View style={styles.flex}>
        <View style={styles.completeBody}>
          <View>
            <AppText style={completeChromeStyles.title}>
              관측할 혜성을 등록했어요!
            </AppText>
            <AppText style={completeChromeStyles.subtitle}>
              혜성을 관측하고 북극성에 더 가까워져보아요.
            </AppText>
          </View>
          <Image
            source={ImageAssets.ic_shapestar0}
            style={styles.completeIcon}
            resizeMode="contain"
          />
          {lastComet ? (
            <View style={styles.summaryList}>
              <AppText style={completeChromeStyles.name}>
                {lastComet.title}
              </AppText>
              {lastComet.description ? (
                <AppText style={completeChromeStyles.activity}>
                  {lastComet.description}
                </AppText>
              ) : null}
              {lastComet.target_category ? (
                <AppText
                  style={{
                    ...completeChromeStyles.cluster,
                    color: clusterColor,
                  }}
                >
                  {lastComet.target_category}
                </AppText>
              ) : null}
              {lastDate ? (
                <AppText style={completeChromeStyles.date}>{lastDate}</AppText>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.completeBottom}>
          <PrimaryButton
            label="확인"
            size="large"
            onPress={() => {
              setTab('observing');
              setScreen('main');
              void loadTabList('observing');
            }}
          />
        </View>
      </View>
    );
  };

  const renderMain = () => {
    const hasObserving = observingComets.length > 0;
    const hasCompleted = completedComets.length > 0;
    const showEmpty = tab === 'observing' ? !hasObserving : !hasCompleted;
    const list = tab === 'observing' ? observingComets : completedComets;
    const emptyMessage =
      tab === 'observing'
        ? '현재 관측 중인 혜성이 없습니다.\n관측할 혜성을 추천받거나 직접 관측해 보세요.'
        : '아직 관측을 완료한 혜성이 없습니다.\n혜성을 따라가며 새로운 경험을 발견해 보세요.';

    return (
      <View style={styles.flex}>
        <View style={labChromeStyles.pageHeader}>
          <Text style={labChromeStyles.pageTitle}>혜성관측소</Text>
        </View>

        <SegmentedControl tab={tab} onChange={handleTabChange} />

        {listLoading && showEmpty ? (
          <View style={[styles.flex, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color={Palette.cream} />
          </View>
        ) : showEmpty ? (
          <View style={styles.flex}>
            <ScrollView
              style={StyleSheet.absoluteFill}
              contentContainerStyle={styles.emptyCenter}
              refreshControl={listRefreshControl}
              showsVerticalScrollIndicator={false}
            />
            <View
              style={[
                styles.emptyWrap,
                {
                  paddingHorizontal: x(59),
                  paddingBottom: navInset + 88,
                },
              ]}
              pointerEvents="none"
            >
              <AppText style={styles.emptyText}>{emptyMessage}</AppText>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.listPad,
              { paddingBottom: navInset + 88 },
            ]}
            refreshControl={listRefreshControl}
            showsVerticalScrollIndicator={false}
          >
            {list.map((c) => (
              <CometCard
                key={c.id}
                comet={c}
                showObserving={tab === 'observing'}
                clusters={clusters}
                busy={actionId === c.id}
                onComplete={(id) => void handleCompleteComet(id)}
                onAddToGalaxy={handleAddToGalaxy}
                onDelete={handleDeleteComet}
              />
            ))}
          </ScrollView>
        )}

        <View style={[styles.mainBottomCta, { bottom: navInset + 12 }]}>
          <PrimaryButton
            label="혜성 등록"
            size="large"
            onPress={goToRegisterChoice}
          />
        </View>
      </View>
    );
  };

  const content = (() => {
    switch (screen) {
      case 'choice':
        return renderChoice();
      case 'manual':
        return renderForm(false);
      case 'ai':
        return renderForm(true);
      case 'complete':
        return renderComplete();
      default:
        return renderMain();
    }
  })();

  return (
    <AutoRefreshOnFocus onRefresh={handleRefresh}>
      <ResponsiveScreen key={refreshKey} style={{ backgroundColor: '#173F72' }}>
        <Background width={width} height={height} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          {content}
        </SafeAreaView>
        {showNav ? <BottomNavigationBar activeTab="comet" /> : null}
        {ExitConfirmModal}
      </ResponsiveScreen>
    </AutoRefreshOnFocus>
  );
}
