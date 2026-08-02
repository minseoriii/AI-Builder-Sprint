import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  BackButton,
  Colors,
  FontFamily,
  LogoIcon,
  Palette,
  PolarisIcon,
  PrimaryButton,
  PrimaryButtonDimensions,
  Radii,
  RoundStarIcon,
  RoundStarVariant,
  ScreenContainer,
  ScreenLayout,
  TagButton,
  withOpacity,
} from '@/assets_shared';
import { formatApiErrorAlert } from '@/lib/api/client';
import {
  analyzeNorthStar,
  saveNorthStar,
  type NorthStarCandidate,
} from '@/lib/api/onboarding';

const onboardingBackground = require('@/assets_shared/svg/empty.png');

function usePrimaryButtonWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width - 40, PrimaryButtonDimensions.large.width);
}

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
      source={onboardingBackground}
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

/** 8-dot circular spinner — AI 분석 로딩용 */
function AnalyzeDotSpinner() {
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

function StepIndicator({ step }: { step: Step }) {
  if (step <= 1) return null;
  return (
    <View style={styles.stepIndicator} pointerEvents="none">
      {([2, 3, 4] as const).map((s) => (
        <View
          key={s}
          style={[
            styles.stepBar,
            step >= s ? styles.stepBarActive : styles.stepBarInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Step 1: Splash ────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width - 64, 241);
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
      <View style={styles.splashFooter} pointerEvents="box-none">
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
  const buttonWidth = usePrimaryButtonWidth();
  const canSubmit = value.trim().length > 0 && !loading;

  return (
    <View style={styles.flex}>
      <ScreenContainer style={styles.flex} withTopPadding={false}>
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
          style={{ width: buttonWidth }}
        />
      </View>
    </View>
  );
}

// ─── Step 3: Category selection ────────────────────────────────────────────

function SentenceHighlight({ sentence }: { sentence: string }) {
  return (
    <View style={styles.sentenceHighlight}>
      <RoundStarIcon variant={2} />
      <AppText variant="emphasis" style={styles.sentenceHighlightText}>
        {sentence}
      </AppText>
      <RoundStarIcon variant={2} />
    </View>
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
  const buttonWidth = usePrimaryButtonWidth();
  const canConfirm = selected.length === NORTH_STAR_SELECTED_COUNT;

  return (
    <View style={styles.flex}>
      <ScreenContainer style={styles.flex} contentStyle={styles.flex} withTopPadding={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.categoryScrollContent}
          keyboardShouldPersistTaps="handled"
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
                onPress={() => onToggle(cat)}
              />
            ))}
          </View>

          {error ? <AppText style={styles.errorBox}>{error}</AppText> : null}

          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.linkBtn}>
            <AppText style={styles.linkBtnText}>문장 다시 쓰기</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </ScreenContainer>

      <View style={styles.onboardingFooter}>
        <PrimaryButton
          size="large"
          label="성단 확정"
          disabled={!canConfirm}
          onPress={onConfirm}
          style={{ width: buttonWidth }}
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
  const canConfirm =
    selected.length === NORTH_STAR_SELECTED_COUNT && !loading;
  const buttonWidth = usePrimaryButtonWidth();

  return (
    <View style={styles.flex}>
      <ScreenContainer style={styles.flex} contentStyle={styles.flex} withTopPadding={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.confirmScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <PolarisHeader
          title="이대로 북극성과 성단을 확정할까요?"
          titleStyle={styles.confirmTitle}
        />

        <View style={styles.confirmContent}>
          <SentenceHighlight sentence={sentence} />

          <View style={styles.tagWrap}>
            {selected.map((cat) => (
              <TagButton key={cat} label={cat} selected disabled />
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
          style={{ width: buttonWidth }}
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
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [sentence, setSentence] = useState('');
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

    setAnalyzeError('');
    setAnalyzing(true);
    try {
      // POST /api/v1/onboarding/north-star/analyze  { text }
      const data = await analyzeNorthStar(text);
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
  }, [analyzing, sentence]);

  const handleCategoryConfirm = useCallback(() => {
    if (selected.length !== NORTH_STAR_SELECTED_COUNT) {
      setCategoryError(
        `성단은 정확히 ${NORTH_STAR_SELECTED_COUNT}개를 선택해야 합니다.`,
      );
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

  const handleNavBack = useCallback(() => {
    setCategoryError('');
    setAnalyzeError('');
    setStep((s) => (s - 1) as Step);
  }, []);

  return (
    <View style={styles.root}>
      <OnboardingBackground />
      {step === 1 && <SplashStarField />}
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.contentArea}>
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
            sentence={sentence}
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
            sentence={sentence}
            selected={selected}
            onFinish={handleFinish}
            onBack={() => setStep(3)}
            loading={saving}
            error={saveError}
          />
        )}

        <StepIndicator step={step} />

        {(step === 2 || step === 3) && (
          <View style={styles.navBackRow}>
            <BackButton
              onPress={handleNavBack}
              disabled={analyzing}
              iconSize={32}
            />
          </View>
        )}
        </View>
      </SafeAreaView>
      {analyzing && <AnalyzeLoadingScreen />}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingTop: ScreenLayout.onboardingTop,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  splashCenter: {
    ...StyleSheet.absoluteFillObject,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
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
    minHeight: 80,
    maxHeight: 140,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  sentenceHighlightText: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    color: Palette.cream,
  },
  categoryBlock: {
    gap: 16,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
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
  stepIndicator: {
    position: 'absolute',
    top: ScreenLayout.onboardingTop,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  stepBar: {
    height: 1,
  },
  stepBarActive: {
    width: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  stepBarInactive: {
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  navBackRow: {
    position: 'absolute',
    top: ScreenLayout.onboardingTop,
    left: 0,
    zIndex: 10,
  },
});
