import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Colors,
  createResponsiveStylesContext,
  FontFamily,
  LogoIcon,
  Palette,
  PolarisIcon,
  PrimaryButton,
  Radii,
  ResponsiveScreen,
  RoundStarIcon,
  RoundStarVariant,
  ScreenContainer,
  onboardingContentTop,
  onboardingBackgroundImage,
  TagButton,
  useResponsive,
  withOpacity,
} from '@/assets_shared';
import { formatApiErrorAlert } from '@/lib/api/client';
import {
  analyzeNorthStar,
  saveNorthStar,
  type NorthStarCandidate,
} from '@/lib/api/onboarding';

// ─── Types (API_SPEC_POLARIS_DEVELOP_2026_08_02) ───────────────────────────

type Step = 1 | 2 | 3 | 4;

/** 백엔드 NORTH_STAR_SELECTED_COUNT — 선택 성단은 정확히 5개 */
const NORTH_STAR_SELECTED_COUNT = 5;

// ─── Alerts (web + native) ─────────────────────────────────────────────────

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    const win =
      typeof globalThis !== 'undefined'
        ? (globalThis as { window?: Window; alert?: (msg: string) => void })
        : undefined;
    if (win?.window?.alert) {
      win.window.alert(`${title}\n\n${message}`);
      return;
    }
    if (typeof win?.alert === 'function') {
      win.alert(`${title}\n\n${message}`);
      return;
    }
  }
  Alert.alert(title, message);
}

// ─── Splash star field ─────────────────────────────────────────────────────

const SPLASH_STARS: { x: number; y: number; variant: RoundStarVariant }[] = [
  { x: 0.1, y: 0.07, variant: 3 },
  { x: 0.28, y: 0.12, variant: 2 },
  { x: 0.52, y: 0.05, variant: 1 },
  { x: 0.78, y: 0.1, variant: 3 },
  { x: 0.92, y: 0.18, variant: 2 },
  { x: 0.06, y: 0.28, variant: 1 },
  { x: 0.88, y: 0.32, variant: 3 },
  { x: 0.18, y: 0.42, variant: 2 },
  { x: 0.72, y: 0.48, variant: 1 },
  { x: 0.04, y: 0.58, variant: 3 },
  { x: 0.94, y: 0.62, variant: 2 },
  { x: 0.32, y: 0.72, variant: 1 },
  { x: 0.62, y: 0.78, variant: 3 },
  { x: 0.14, y: 0.88, variant: 2 },
  { x: 0.48, y: 0.92, variant: 1 },
  { x: 0.84, y: 0.86, variant: 3 },
];

function SplashStarField() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SPLASH_STARS.map((star, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: width * star.x,
            top: height * star.y,
          }}
        >
          <RoundStarIcon variant={star.variant} />
        </View>
      ))}
    </View>
  );
}

function OnboardingBackground() {
  return (
    <Image
      source={onboardingBackgroundImage}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
    />
  );
}

const ANALYZE_DOT_COUNT = 8;
const ANALYZE_SPINNER_SIZE = 56;
const ANALYZE_SPINNER_RADIUS = 20;
const ANALYZE_DOT_SIZES = [10, 8.5, 7.5, 6.5, 5.5, 4.5, 4, 3.5];
const ANALYZE_DOT_OPACITIES = [1, 0.92, 0.78, 0.62, 0.48, 0.36, 0.26, 0.18];

const STYLE_DEF = {
  root: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  splashBrand: {
    alignItems: 'center',
    gap: 20,
  },
  splashCopy: {
    gap: 24,
    alignItems: 'center',
  },
  splashParagraph: {
    textAlign: 'center',
    lineHeight: 28,
  },
  splashTapHint: {
    fontSize: 20,
    letterSpacing: 2.4,
    fontFamily: FontFamily.regular,
    color: withOpacity('#F8EEC1', 0.55),
    textAlign: 'center',
  },
  splashFooter: {
    paddingBottom: 120,
    alignItems: 'center',
  },
  polarisHeader: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 12,
  },
  onboardingTitle: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    color: Palette.cream,
  },
  onboardingSubtitle: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    color: withOpacity(Palette.cream, 0.55),
  },
  onboardingBody: {
    flex: 1,
  },
  onboardingInput: {
    marginTop: 24,
    width: 370,
    height: 125,
    alignSelf: 'center',
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.25),
    backgroundColor: withOpacity('#06101f', 0.55),
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
    color: Palette.cream,
  },
  onboardingInputCompact: {
    flex: 0,
    minHeight: 96,
    maxHeight: 120,
    marginTop: 0,
  },
  onboardingFooter: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  analyzeSpinner: {
    width: ANALYZE_SPINNER_SIZE,
    height: ANALYZE_SPINNER_SIZE,
  },
  analyzeLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  analyzeLoadingCenter: {
    alignItems: 'center',
    gap: ANALYZE_SPINNER_SIZE,
  },
  analyzeLoadingText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.medium,
    color: Palette.cream,
    textAlign: 'center',
  },
  contentPad: {
    paddingHorizontal: 32,
    gap: 24,
    marginTop: 8,
  },
  textAreaReadonly: {
    color: withOpacity(Palette.cream, 0.6),
  },
  categoryScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 28,
    marginTop: 8,
  },
  sentenceHighlight: {
    width: '100%',
    paddingHorizontal: 8,
  },
  sentenceHighlightRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  sentenceHighlightStarStart: {
    alignSelf: 'flex-start',
  },
  sentenceHighlightStarEnd: {
    alignSelf: 'flex-end',
  },
  sentenceHighlightText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    color: Palette.cream,
    paddingHorizontal: 8,
  },
  tagCountWarning: {
    alignItems: 'center',
    marginTop: 4,
  },
  tagCountWarningText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: Palette.cream,
    fontFamily: FontFamily.medium,
  },
  categoryBlock: {
    gap: 16,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignContent: 'center',
    width: '100%',
  },
  selectCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  selectCountLabel: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.35),
  },
  selectCountValue: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.35),
  },
  selectCountReady: {
    color: Palette.cream,
  },
  linkBtn: {
    paddingBottom: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  linkBtnText: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.35),
    textDecorationLine: 'underline',
  },
  errorBox: {
    fontSize: 12,
    color: Palette.cream,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.25),
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 32,
  },
  confirmScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  confirmContent: {
    paddingHorizontal: 20,
    gap: 28,
    marginTop: 8,
  },
  confirmTitle: {
    fontFamily: FontFamily.medium,
    fontWeight: '500',
  },
} as const;

const { StylesProvider, useStyles, useScreenStyles } =
  createResponsiveStylesContext<typeof STYLE_DEF>();

/** 8-dot circular spinner — AI 분석 로딩용 */
function AnalyzeDotSpinner() {
  const styles = useStyles();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const center = ANALYZE_SPINNER_SIZE / 2;

  return (
    <Animated.View
      style={[
        styles.analyzeSpinner,
        { transform: [{ rotate: spin }] },
      ]}
    >
      {Array.from({ length: ANALYZE_DOT_COUNT }).map((_, index) => {
        const angle = (index / ANALYZE_DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
        const dotSize = ANALYZE_DOT_SIZES[index];
        const left = center + ANALYZE_SPINNER_RADIUS * Math.cos(angle) - dotSize / 2;
        const top = center + ANALYZE_SPINNER_RADIUS * Math.sin(angle) - dotSize / 2;

        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left,
              top,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: '#FFFFFF',
              opacity: ANALYZE_DOT_OPACITIES[index],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

/** POST /api/v1/onboarding/north-star/analyze 호출 중 전체 화면 로딩 */
function AnalyzeLoadingScreen() {
  const styles = useStyles();

  return (
    <View style={styles.analyzeLoadingOverlay} pointerEvents="auto">
      <View style={styles.analyzeLoadingCenter}>
        <AnalyzeDotSpinner />
        <AppText style={styles.analyzeLoadingText}>
          빛의 속도로 분석하는 중...
        </AppText>
      </View>
    </View>
  );
}

// ─── Shared chrome ─────────────────────────────────────────────────────────

function PolarisHeader({
  title,
  subtitle,
  titleStyle,
}: {
  title: string;
  subtitle?: string;
  titleStyle?: TextStyle;
}) {
  const styles = useStyles();

  return (
    <View style={styles.polarisHeader}>
      <PolarisIcon size={97} />
      <AppText
        variant="emphasis"
        style={{ ...styles.onboardingTitle, ...titleStyle }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText style={styles.onboardingSubtitle}>{subtitle}</AppText>
      ) : null}
    </View>
  );
}

// ─── Step 1: Splash ────────────────────────────────────────────────────────

function DismissKeyboardView({ children }: { children: React.ReactNode }) {
  const styles = useStyles();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.flex}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

function SplashScreen({ onNext }: { onNext: () => void }) {
  const styles = useStyles();
  const { scale, width } = useResponsive();
  const logoWidth = Math.min(width - scale(64), scale(241));
  const tapOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(tapOpacity, {
          toValue: 0.3,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(tapOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [tapOpacity]);

  return (
    <View style={styles.flex}>
      <View style={styles.splashCenter}>
        <View style={styles.splashBrand}>
          <PolarisIcon size={97} />
          <LogoIcon width={logoWidth} />
        </View>
        <View style={styles.splashCopy}>
          <AppText style={styles.splashParagraph}>
            인간은 우주와 같은 성분으로{'\n'}이루어져 있습니다.
          </AppText>
          <AppText style={styles.splashParagraph}>
            POLARIS 와 함께{'\n'}자신만의 은하를 키워나가요.
          </AppText>
        </View>
      </View>
      <View style={styles.splashFooter}>
        <Pressable
          onPress={onNext}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="탭하여 시작하기"
        >
          <Animated.Text style={[styles.splashTapHint, { opacity: tapOpacity }]}>
            탭하여 시작하기
          </Animated.Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Step 2: Value input ───────────────────────────────────────────────────

function InputScreen({
  value,
  onChange,
  onNext,
  loading,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  loading: boolean;
  error: string;
}) {
  const styles = useStyles();
  const canSubmit = value.trim().length > 0 && !loading;

  return (
    <View style={styles.flex}>
      <ScreenContainer style={styles.flex} topPadding={onboardingContentTop}>
        <PolarisHeader
          title="당신의 삶을 이끌어줄 북극성을 정해보세요."
          subtitle={
            '흔들리는 순간에도 다시 돌아올 수 있는,\n가장 중요한 가치를 한 문장으로 남겨보아요.'
          }
        />
        <TextInput
          style={styles.onboardingInput}
          placeholder="사용자님의 인생 목표를 작성해주세요."
          placeholderTextColor={withOpacity(Palette.cream, 0.35)}
          multiline
          textAlignVertical="top"
          value={value}
          onChangeText={onChange}
          editable={!loading}
        />
        {error ? <AppText style={styles.errorBox}>{error}</AppText> : null}
      </ScreenContainer>
      <View style={styles.onboardingFooter}>
        <PrimaryButton
          size="large"
          label="북극성 생성"
          disabled={!canSubmit}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

// ─── Step 3: Category selection ────────────────────────────────────────────

const TAG_COUNT_WARNING = '태그는 5가지를 선택해주세요';

function SentenceHighlight({ sentence }: { sentence: string }) {
  const styles = useStyles();
  const starSize = 23;

  return (
    <View style={styles.sentenceHighlight}>
      <View style={styles.sentenceHighlightRow}>
        <View style={styles.sentenceHighlightStarStart}>
          <RoundStarIcon variant={2} size={starSize} />
        </View>
        <AppText variant="emphasis" style={styles.sentenceHighlightText}>
          {sentence}
        </AppText>
        <View style={styles.sentenceHighlightStarEnd}>
          <RoundStarIcon variant={2} size={starSize} />
        </View>
      </View>
    </View>
  );
}

function useShakeAnimation() {
  const shakeX = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: 8,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -8,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 6,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeX]);

  return { shakeX, triggerShake };
}

function TagCountWarning({
  visible,
  shakeX,
}: {
  visible: boolean;
  shakeX: Animated.Value;
}) {
  const styles = useStyles();

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.tagCountWarning, { transform: [{ translateX: shakeX }] }]}
    >
      <AppText style={styles.tagCountWarningText}>{TAG_COUNT_WARNING}</AppText>
    </Animated.View>
  );
}

function CategoryScreen({
  sentence,
  categories,
  selected,
  onToggle,
  onConfirm,
  onBack,
  error,
}: {
  sentence: string;
  categories: string[];
  selected: string[];
  onToggle: (cat: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  error: string;
}) {
  const styles = useStyles();
  const { shakeX, triggerShake } = useShakeAnimation();
  const [showTagWarning, setShowTagWarning] = useState(false);

  const triggerTagCountWarning = useCallback(() => {
    setShowTagWarning(true);
    triggerShake();
  }, [triggerShake]);

  const handleTagPress = useCallback(
    (cat: string) => {
      if (!selected.includes(cat) && selected.length >= NORTH_STAR_SELECTED_COUNT) {
        triggerTagCountWarning();
        return;
      }
      setShowTagWarning(false);
      onToggle(cat);
    },
    [onToggle, selected, triggerTagCountWarning],
  );

  const handleConfirmPress = useCallback(() => {
    if (selected.length !== NORTH_STAR_SELECTED_COUNT) {
      triggerTagCountWarning();
      return;
    }
    setShowTagWarning(false);
    onConfirm();
  }, [onConfirm, selected.length, triggerTagCountWarning]);

  return (
    <View style={styles.flex}>
      <ScreenContainer style={styles.flex} contentStyle={styles.flex} topPadding={onboardingContentTop}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.categoryScrollContent}
          keyboardShouldPersistTaps="never"
        >
          <PolarisHeader
          title="당신만의 가치를 5가지 골라보세요."
          subtitle={
            '문장을 바탕으로 추천된 가치 중 5가지를 선택해\n나만의 성단을 만들어보세요.'
          }
        />

        <View style={styles.categoryContent}>
          <SentenceHighlight sentence={sentence} />

          <View style={styles.tagWrap}>
            {categories.map((cat) => (
              <TagButton
                key={cat}
                label={cat}
                selected={selected.includes(cat)}
                onPress={() => handleTagPress(cat)}
              />
            ))}
          </View>

          {error ? <AppText style={styles.errorBox}>{error}</AppText> : null}

          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.linkBtn}>
            <AppText style={styles.linkBtnText}>문장 다시 쓰기</AppText>
          </TouchableOpacity>

          <TagCountWarning visible={showTagWarning} shakeX={shakeX} />
        </View>
      </ScrollView>
      </ScreenContainer>

      <View style={styles.onboardingFooter}>
        <PrimaryButton
          size="large"
          label="성단 확정"
          onPress={handleConfirmPress}
        />
      </View>
    </View>
  );
}

// ─── Step 4: Final confirmation ────────────────────────────────────────────

function ConfirmScreen({
  sentence,
  selected,
  onFinish,
  onBack,
  loading,
  error,
}: {
  sentence: string;
  selected: string[];
  onFinish: () => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}) {
  const styles = useStyles();
  const canConfirm =
    selected.length === NORTH_STAR_SELECTED_COUNT && !loading;

  return (
    <View style={styles.flex}>
      <ScreenContainer style={styles.flex} contentStyle={styles.flex} topPadding={onboardingContentTop}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.confirmScrollContent}
          keyboardShouldPersistTaps="never"
        >
          <PolarisHeader
          title="이대로 북극성과 성단을 확정할까요?"
          titleStyle={styles.confirmTitle}
        />

        <View style={styles.confirmContent}>
          <SentenceHighlight sentence={sentence} />

          <View style={styles.tagWrap}>
            {selected.map((cat) => (
              <TagButton key={cat} label={cat} selected />
            ))}
          </View>

          {error ? <AppText style={styles.errorBox}>{error}</AppText> : null}

          <TouchableOpacity
            onPress={onBack}
            disabled={loading}
            activeOpacity={0.7}
            style={styles.linkBtn}
          >
            <AppText style={styles.linkBtnText}>다시 설정하기</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </ScreenContainer>

      <View style={styles.onboardingFooter}>
        <PrimaryButton
          size="large"
          label={loading ? undefined : '관측 시작하기'}
          disabled={!canConfirm}
          onPress={onFinish}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.buttonActive} />
          ) : undefined}
        </PrimaryButton>
      </View>
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function OnboardingView() {
  const styles = useScreenStyles(STYLE_DEF);
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [sentence, setSentence] = useState('');
  const [analyzedSentence, setAnalyzedSentence] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<NorthStarCandidate[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoryLabels = useMemo(
    () => candidates.map((c) => c.category),
    [candidates],
  );

  const handleToggle = useCallback((cat: string) => {
    setCategoryError('');
    setSelected((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      }
      if (prev.length >= NORTH_STAR_SELECTED_COUNT) {
        return prev;
      }
      return [...prev, cat];
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    const text = sentence.trim();
    if (!text || analyzing) return;

    // 문장 다시 쓰기 후 내용이 같으면 API 재호출 없이 태그 선택으로
    if (
      text === analyzedSentence &&
      analysisId &&
      candidates.length > 0
    ) {
      setAnalyzeError('');
      setCategoryError('');
      setStep(3);
      return;
    }

    setAnalyzeError('');
    setAnalyzing(true);
    try {
      // POST /api/v1/onboarding/north-star/analyze  { text }
      const data = await analyzeNorthStar(text);
      setAnalyzedSentence(text);
      setAnalysisId(data.analysis_id);
      setCandidates(data.candidates);
      setSelected([]);
      setCategoryError('');
      setStep(3);
    } catch (error) {
      console.error('API Error Detail:', error);
      showAlert('연동 에러', formatApiErrorAlert(error));
    } finally {
      setAnalyzing(false);
    }
  }, [analysisId, analyzedSentence, analyzing, candidates.length, sentence]);

  const handleCategoryConfirm = useCallback(() => {
    if (selected.length !== NORTH_STAR_SELECTED_COUNT) {
      return;
    }
    setCategoryError('');
    setSaveError('');
    setStep(4);
  }, [selected.length]);

  const handleFinish = useCallback(async () => {
    if (
      !analysisId ||
      selected.length !== NORTH_STAR_SELECTED_COUNT ||
      saving
    ) {
      return;
    }

    setSaveError('');
    setSaving(true);
    try {
      // PUT /api/v1/onboarding/north-star  { analysis_id, selected_categories }
      const data = await saveNorthStar(analysisId, selected);
      if (data.onboarding_completed === true) {
        router.replace('/');
        return;
      }
      setSaveError('온보딩이 완료되지 않았습니다. 다시 시도해 주세요.');
    } catch (error) {
      console.error('API Error Detail:', error);
      showAlert('연동 에러', formatApiErrorAlert(error));
    } finally {
      setSaving(false);
    }
  }, [analysisId, router, saving, selected]);

  return (
    <ResponsiveScreen style={styles.root}>
      <StylesProvider styles={styles}>
      <OnboardingBackground />
      {step === 1 && <SplashStarField />}
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <DismissKeyboardView>
        {step === 1 && <SplashScreen onNext={() => setStep(2)} />}

        {step === 2 && (
          <InputScreen
            value={sentence}
            onChange={setSentence}
            onNext={handleAnalyze}
            loading={analyzing}
            error={analyzeError}
          />
        )}

        {step === 3 && (
          <CategoryScreen
            sentence={analyzedSentence}
            categories={categoryLabels}
            selected={selected}
            onToggle={handleToggle}
            onConfirm={handleCategoryConfirm}
            onBack={() => {
              setCategoryError('');
              setStep(2);
            }}
            error={categoryError}
          />
        )}

        {step === 4 && (
          <ConfirmScreen
            sentence={analyzedSentence}
            selected={selected}
            onFinish={handleFinish}
            onBack={() => setStep(3)}
            loading={saving}
            error={saveError}
          />
        )}
        </DismissKeyboardView>
      </SafeAreaView>
      {analyzing && <AnalyzeLoadingScreen />}
      </StylesProvider>
    </ResponsiveScreen>
  );
}
