import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// ─── Types ─────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

interface Candidate {
  category: string;
  reason: string;
}

interface AnalyzeResponse {
  analysis_id: string;
  candidates: Candidate[];
}

interface NorthStarSaveResponse {
  onboarding_completed: boolean;
  north_star: {
    text: string;
    selected_categories: string[];
  };
}

const MOCK_ANALYSIS_ID = 'mock_analysis_999';

const MOCK_CANDIDATES: Candidate[] = [
  { category: '가족', reason: '소중한 사람들과의 관계' },
  { category: '건강', reason: '신체적/정신적 활력' },
  { category: '성장', reason: '새로운 배움과 도전' },
  { category: '성공', reason: '목표 달성과 성취' },
  { category: '관계', reason: '진실된 소통' },
  { category: '자유', reason: '주도적인 삶' },
  { category: '평화', reason: '마음의 안점감' },
];

// ─── API ───────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

async function apiRequest<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = process.env.EXPO_PUBLIC_ACCESS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const detail =
      data &&
      typeof data === 'object' &&
      'detail' in data &&
      data.detail &&
      typeof data.detail === 'object' &&
      'message' in (data.detail as object)
        ? String((data.detail as { message: unknown }).message)
        : data &&
            typeof data === 'object' &&
            'detail' in data &&
            typeof (data as { detail: unknown }).detail === 'string'
          ? (data as { detail: string }).detail
          : `요청에 실패했습니다 (${response.status})`;
    throw new Error(detail);
  }

  return data as T;
}

function analyzeNorthStar(text: string) {
  return apiRequest<AnalyzeResponse>(
    'POST',
    '/api/v1/onboarding/north-star/analyze',
    { text },
  );
}

function saveNorthStar(analysisId: string, selectedCategories: string[]) {
  return apiRequest<NorthStarSaveResponse>('PUT', '/api/v1/onboarding/north-star', {
    analysis_id: analysisId,
    selected_categories: selectedCategories,
  });
}

// ─── Star Icon ─────────────────────────────────────────────────────────────

function StarIcon({ size = 48 }: { size?: number }) {
  const s = size;
  const c = s / 2;
  const arm = s * 0.42;
  const thin = s * 0.07;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <Path
        d={`M${c},${c - arm} C${c - thin},${c - thin} ${c - arm},${c} ${c},${c + arm} C${c + thin},${c + thin} ${c + arm},${c} ${c},${c - arm}Z`}
        fill="white"
      />
      <Path
        d={`M${c - arm},${c} C${c - thin},${c - thin} ${c},${c - arm} ${c + arm},${c} C${c + thin},${c + thin} ${c},${c + arm} ${c - arm},${c}Z`}
        fill="white"
      />
    </Svg>
  );
}

// ─── Star Field ────────────────────────────────────────────────────────────

const STAR_DOTS = [
  { x: 0.08, y: 0.07, s: 3 },
  { x: 0.82, y: 0.12, s: 2 },
  { x: 0.55, y: 0.05, s: 2 },
  { x: 0.2, y: 0.22, s: 2 },
  { x: 0.9, y: 0.35, s: 3 },
  { x: 0.05, y: 0.48, s: 2 },
  { x: 0.75, y: 0.58, s: 2 },
  { x: 0.35, y: 0.78, s: 2 },
  { x: 0.92, y: 0.72, s: 3 },
  { x: 0.15, y: 0.88, s: 2 },
  { x: 0.6, y: 0.92, s: 2 },
  { x: 0.45, y: 0.18, s: 2 },
];

function StarField() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STAR_DOTS.map((st, i) => (
        <View
          key={i}
          style={[
            styles.starDot,
            {
              left: width * st.x,
              top: height * st.y,
              width: st.s,
              height: st.s,
              borderRadius: st.s / 2,
              opacity: 0.35 + (i % 3) * 0.15,
            },
          ]}
        />
      ))}
    </View>
  );
}

function GridOverlay() {
  const { width, height } = useWindowDimensions();
  const size = 40;
  const cols = Math.ceil(width / size);
  const rows = Math.ceil(height / size);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: rows + 1 }).map((_, r) => (
        <View
          key={`h-${r}`}
          style={[styles.gridLineH, { top: r * size, width }]}
        />
      ))}
      {Array.from({ length: cols + 1 }).map((_, c) => (
        <View
          key={`v-${c}`}
          style={[styles.gridLineV, { left: c * size, height }]}
        />
      ))}
    </View>
  );
}

// ─── Shared chrome ─────────────────────────────────────────────────────────

function TopSection() {
  return (
    <View style={styles.topSection}>
      <View style={styles.logoCircleMd}>
        <StarIcon size={22} />
      </View>
      <Text style={styles.logoTextMd}>POLARIS</Text>
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
  return (
    <Pressable style={styles.flex} onPress={onNext}>
      <StarField />
      <View style={styles.splashCenter}>
        <View style={styles.splashBrand}>
          <View style={styles.logoCircleLg}>
            <StarIcon size={36} />
          </View>
          <Text style={styles.logoTextLg}>POLARIS</Text>
        </View>
        <Text style={styles.splashSlogan}>
          인간은 우주와 같은 성분으로 이루어져 있습니다.{'\n'}
          POLARIS 와 함께 자신만의 은하를 키워나가요.
        </Text>
      </View>
      <View style={styles.splashFooter}>
        <Text style={styles.tapHint}>탭하여 시작하기</Text>
      </View>
    </Pressable>
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
  const canSubmit = value.trim().length > 0 && !loading;

  return (
    <View style={styles.flex}>
      <StarField />
      <TopSection />
      <View style={styles.contentPad}>
        <Text style={styles.sectionHint}>삶의 방향이 되는 한 문장</Text>
        <View style={styles.fieldGroup}>
          <TextInput
            style={styles.textArea}
            placeholder="사용자님의 인생 목표를 작성해주세요."
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
            textAlignVertical="top"
            value={value}
            onChangeText={onChange}
            editable={!loading}
          />
          {error ? <Text style={styles.errorBox}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
            onPress={onNext}
            disabled={!canSubmit}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="rgba(255,255,255,0.7)" />
            ) : (
              <Text style={styles.primaryBtnText}>성단 확인하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Step 3: Category selection ────────────────────────────────────────────

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
  return (
    <View style={styles.flex}>
      <StarField />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TopSection />
        <View style={styles.contentPad}>
          <Text style={styles.sectionHint}>삶의 방향이 되는 한 문장</Text>
          <TextInput
            style={[styles.textArea, styles.textAreaReadonly]}
            multiline
            textAlignVertical="top"
            value={sentence}
            editable={false}
          />

          <View style={styles.categoryBlock}>
            <Text style={styles.categoryPrompt}>
              함께 그려갈 성단을 <Text style={styles.categoryPromptEm}>5개</Text> 선택해주세요.
            </Text>

            <View style={styles.tagWrap}>
              {categories.map((cat) => {
                const isSelected = selected.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => onToggle(cat)}
                    activeOpacity={0.7}
                    style={[styles.tag, isSelected && styles.tagSelected]}
                  >
                    <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? <Text style={styles.errorBox}>{error}</Text> : null}

            <View style={styles.selectCountRow}>
              <Text style={styles.selectCountLabel}>선택됨</Text>
              <Text
                style={[
                  styles.selectCountValue,
                  selected.length === 5 && styles.selectCountReady,
                ]}
              >
                {selected.length} / 5
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBtnText}>내 북극성 확정</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>{'< 북극성 다시 작성하기'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  const row1 = selected.slice(0, 3);
  const row2 = selected.slice(3);

  return (
    <View style={styles.flex}>
      <StarField />

      <View style={styles.confirmCenter}>
        <View style={styles.confirmHeader}>
          <View style={styles.logoCircleMd}>
            <StarIcon size={22} />
          </View>
          <Text style={styles.confirmEyebrow}>북극성</Text>
        </View>

        <View style={styles.confirmSentenceBox}>
          <Text style={styles.confirmSentence}>{sentence}</Text>
        </View>

        <View style={styles.confirmClusters}>
          <Text style={styles.confirmClusterLabel}>성단</Text>
          <View style={styles.confirmRow}>
            {row1.map((cat) => (
              <View key={cat} style={styles.confirmTag}>
                <Text style={styles.confirmTagText}>{cat}</Text>
              </View>
            ))}
          </View>
          {row2.length > 0 ? (
            <View style={styles.confirmRow}>
              {row2.map((cat) => (
                <View key={cat} style={styles.confirmTag}>
                  <Text style={styles.confirmTagText}>{cat}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.confirmFooter}>
        {error ? <Text style={styles.errorBox}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={onFinish}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="rgba(255,255,255,0.7)" />
          ) : (
            <Text style={styles.primaryBtnText}>북극성 / 성단 확정하기</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onBack}
          disabled={loading}
          activeOpacity={0.7}
          style={styles.linkBtn}
        >
          <Text style={styles.linkBtnText}>{'< 성단 다시 정하기'}</Text>
        </TouchableOpacity>
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
  const [candidates, setCandidates] = useState<Candidate[]>([]);
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
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const handleAnalyze = useCallback(async () => {
    const text = sentence.trim();
    if (!text || analyzing) return;

    setAnalyzeError('');
    setAnalyzing(true);
    try {
      const data = await analyzeNorthStar(text);
      setAnalysisId(data.analysis_id);
      setCandidates(data.candidates);
      setSelected([]);
      setCategoryError('');
      setStep(3);
    } catch {
      console.warn('Backend server not reached. Falling back to mock data.');
      setAnalysisId(MOCK_ANALYSIS_ID);
      setCandidates(MOCK_CANDIDATES);
      setSelected([]);
      setCategoryError('');
      setAnalyzeError('');
      setStep(3);
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, sentence]);

  const handleCategoryConfirm = useCallback(() => {
    if (selected.length !== 5) {
      setCategoryError('성단은 5개를 선택해야 합니다.');
      return;
    }
    setCategoryError('');
    setSaveError('');
    setStep(4);
  }, [selected.length]);

  const handleFinish = useCallback(async () => {
    if (!analysisId || selected.length !== 5 || saving) return;

    setSaveError('');
    setSaving(true);
    try {
      await saveNorthStar(analysisId, selected);
    } catch {
      console.warn('Backend server not reached. Falling back to mock data.');
      setSaveError('');
    } finally {
      setSaving(false);
    }

    // Always leave onboarding for the main home screen (never reset step).
    router.replace('/');
  }, [analysisId, router, saving, selected]);

  const handleNavBack = useCallback(() => {
    setCategoryError('');
    setAnalyzeError('');
    setStep((s) => (s - 1) as Step);
  }, []);

  return (
    <View style={styles.root}>
      <GridOverlay />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
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
          <TouchableOpacity
            style={styles.navBack}
            onPress={handleNavBack}
            disabled={analyzing}
            activeOpacity={0.7}
          >
            <Text style={styles.navBackText}>←</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  starDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  topSection: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingBottom: 24,
  },
  logoCircleLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircleMd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextLg: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 10.8,
  },
  logoTextMd: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 6,
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
    gap: 16,
  },
  splashSlogan: {
    fontSize: 14,
    lineHeight: 28,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '300',
    textAlign: 'center',
  },
  splashFooter: {
    paddingBottom: 56,
    alignItems: 'center',
  },
  tapHint: {
    fontSize: 12,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.4)',
  },
  contentPad: {
    paddingHorizontal: 32,
    gap: 24,
    marginTop: 32,
  },
  sectionHint: {
    fontSize: 12,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 12,
  },
  textArea: {
    width: '100%',
    minHeight: 112,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 24,
    color: '#ffffff',
  },
  textAreaReadonly: {
    color: 'rgba(255,255,255,0.6)',
  },
  primaryBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryBtnDisabled: {
    opacity: 0.25,
  },
  primaryBtnText: {
    fontSize: 12,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.7)',
  },
  categoryBlock: {
    gap: 16,
  },
  categoryPrompt: {
    fontSize: 12,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  categoryPromptEm: {
    color: 'rgba(255,255,255,0.8)',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
  },
  tagSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  tagText: {
    fontSize: 12,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
  },
  tagTextSelected: {
    color: '#000000',
  },
  selectCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  selectCountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  selectCountValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  selectCountReady: {
    color: 'rgba(255,255,255,0.6)',
  },
  linkBtn: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  linkBtnText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'underline',
  },
  errorBox: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  confirmCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 32,
  },
  confirmHeader: {
    alignItems: 'center',
    gap: 12,
  },
  confirmEyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.4)',
  },
  confirmSentenceBox: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  confirmSentence: {
    fontSize: 14,
    lineHeight: 28,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  confirmClusters: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  confirmClusterLabel: {
    fontSize: 12,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginBottom: 4,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmTagText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  confirmFooter: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    gap: 12,
  },
  stepIndicator: {
    position: 'absolute',
    top: 24,
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
  navBack: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
  },
  navBackText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    letterSpacing: 2,
  },
});
