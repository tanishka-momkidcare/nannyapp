/**
 * JobApplicationSheet
 *
 * Bottom sheet that slides up from the bottom when a job type card is tapped.
 * Fetches the form template from the API and renders questions dynamically.
 * Supports: single-select, multi-select, text, number question types.
 * Shows a success screen on submit.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

// ─── Decorative SVGs ──────────────────────────────────────────────────────────

function WavyCircle() {
  return (
    <Svg width={125} height={100} viewBox="0 0 124.613 99.561" fill="none">
      <Path
        d="M62.307,0c34.411,0,62.307,22.233,62.307,49.658s-3.3,49.9-37.71,49.9S0,77.084,0,49.658,27.9,0,62.307,0Z"
        fill="#98c4f7"
        opacity={0.25}
      />
    </Svg>
  );
}

function ParallelogramIcon() {
  return (
    <Svg width={120} height={93} viewBox="0 0 167.463 129.588" fill="none">
      <Path
        d="M-3.056,51.316l47.5-53.361L148.5,36.865l-20.178,65.953Z"
        transform="translate(3.365 27.801) rotate(-10)"
        fill="#b3d3f9"
        opacity={0.56}
      />
    </Svg>
  );
}
import { useAuth } from '../context/AuthContext';
import { BorderRadius, FontSizes, Spacing, scaleLineHeight } from '../constants';
import {
  submitJobApplication,
} from '../services/jobApplicationApi';
import { getStaticForm, getStaticCategoryForm, isInDelhiNCR } from '../services/staticFormTemplates';
import type {
  FormQuestion,
  FormTemplateResponse,
  HoursType,
  JobCategory,
  JobApplicationPayload,
  SubmitApplicationResponse,
  WorkLocationType,
} from '../services/jobApplicationApi';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface JobCategoryInfo {
  title: string;
  subtitle: string;
  categoryKey: JobCategory;
}

interface Props {
  visible: boolean;
  hoursType: HoursType;
  jobCategory?: JobCategoryInfo;
  vendorAddress?: string;
  onClose: () => void;
}

const { height: SH } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SH * 0.88;

// ─── Small Icons ─────────────────────────────────────────────────────────────

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
      <Path
        d="M13.3 4.3L6 11.6L2.7 8.3"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Question Field ───────────────────────────────────────────────────────────

interface QuestionFieldProps {
  question: FormQuestion;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  colors: any;
}

function QuestionField({ question, value, onChange, colors }: QuestionFieldProps) {
  const selected = value;
  const selectedArr = (value as string[]) || [];

  switch (question.type) {
    case 'single-select':
      return (
        <View style={s.optionsGrid}>
          {question.options?.map(opt => {
            const isSelected = selected === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  s.optionCard,
                  isSelected
                    ? { backgroundColor: colors.primaryLight, borderColor: 'transparent', borderWidth: 1.5 }
                    : { backgroundColor: colors.iconCircleBackground, borderColor: 'transparent', borderWidth: 1.5 },
                ]}
                activeOpacity={0.75}
                onPress={() => onChange(opt.id)}>
                <View
                  style={[
                    s.optionCheckCircle,
                    {
                      borderColor: colors.primary,
                      backgroundColor: isSelected ? colors.primary : colors.background,
                    },
                  ]}>
                  {isSelected && <CheckIcon color="#fff" />}
                </View>
                <Text
                  style={[
                    s.optionLabel,
                    { color: isSelected ? colors.textBlue : '#535151' },
                  ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );

    case 'multi-select':
      return (
        <View style={s.optionsGrid}>
          {question.options?.map(opt => {
            const isSelected = selectedArr.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  s.optionCard,
                  isSelected
                    ? { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5 }
                    : { backgroundColor: colors.iconCircleBackground, borderColor: 'transparent', borderWidth: 1.5 },
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  if (isSelected) {
                    onChange(selectedArr.filter(v => v !== opt.id));
                  } else {
                    onChange([...selectedArr, opt.id]);
                  }
                }}>
                <View
                  style={[
                    s.optionCheckSquare,
                    {
                      borderColor: colors.primary,
                      backgroundColor: isSelected ? colors.primary : colors.background,
                    },
                  ]}>
                  {isSelected && <CheckIcon color="#fff" />}
                </View>
                <Text
                  style={[
                    s.optionLabel,
                    { color: isSelected ? colors.textBlue : '#535151' },
                  ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );

    case 'text':
      return (
        <TextInput
          style={[
            s.textInput,
            {
              color: colors.inputText,
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
          value={(value as string) || ''}
          onChangeText={onChange}
          placeholderTextColor={colors.inputPlaceholder}
          placeholder="यहाँ लिखें..."
        />
      );

    case 'number':
      return (
        <TextInput
          style={[
            s.textInput,
            {
              color: colors.inputText,
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
          value={(value as string) || ''}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholderTextColor={colors.inputPlaceholder}
          placeholder="अंक दर्ज करें..."
        />
      );

    default:
      return null;
  }
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessView({
  result,
  onClose,
  colors,
}: {
  result: SubmitApplicationResponse;
  onClose: () => void;
  colors: any;
}) {
  return (
    <View style={[s.successContainer, { backgroundColor: colors.card }]}>
      <View style={s.successIconWrap}>
        <Svg width={72} height={72} viewBox="0 0 80 80" fill="none">
          <Circle cx={40} cy={40} r={38} stroke={colors.success} strokeWidth={4} />
          <Path
            d="M25 40L35 50L55 30"
            stroke={colors.success}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={[s.successTitle, { color: colors.text }]}>आवेदन सफल!</Text>
      <Text style={[s.successMessage, { color: colors.textSecondary }]}>
        {result.message.hi}
      </Text>
      <TouchableOpacity
        style={[s.submitBtn, { backgroundColor: colors.primary }]}
        onPress={onClose}
        activeOpacity={0.85}>
        <Text style={[s.submitBtnText, { color: '#fff' }]}>डैशबोर्ड पर लौटें</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export function JobApplicationSheet({ visible, hoursType, jobCategory, vendorAddress = '', onClose }: Props) {
  const { colors, isDark } = useTheme();
  const { vendorName, vendorMobile } = useAuth();
  const isNCR = isInDelhiNCR(vendorAddress);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [form, setForm] = useState<FormTemplateResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitApplicationResponse | null>(null);

  // ── Animations ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      if (__DEV__) console.log('[JobSheet] OPEN', { hoursType, jobCategory, vendorAddress, isNCR });
      // Reset to off-screen so the slide-up animation always plays
      slideAnim.setValue(SH);
      backdropAnim.setValue(0);
      ReactNativeHapticFeedback.trigger('contextClick');
      setStep('form');
      setAnswers({});
      setSubmitResult(null);
      setLoadError(null);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      void loadForm();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SH,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Load form ───────────────────────────────────────────────────────────────

  const loadForm = useCallback(async () => {
    setLoadError(null);
    // Show static form instantly so there's no loading spinner
    const staticForm = jobCategory
      ? getStaticCategoryForm(jobCategory.categoryKey, isNCR)
      : getStaticForm(hoursType, isNCR);
    if (__DEV__) console.log('[JobSheet] staticForm', { formId: staticForm.formId, questionCount: staticForm.questions.length, questionIds: staticForm.questions.map(q => q.id) });
    setForm(staticForm);
    setLoadingForm(false);
  }, [hoursType, jobCategory]);

  // ── Answer helpers ──────────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (questionId: string, value: string | string[]) => {
      setAnswers(prev => {
        const next = { ...prev, [questionId]: value };
        // Clear location answer when hours change (options differ per scenario)
        if (questionId === 'work_hours') {
          delete next.work_location;
        }
        if (__DEV__) console.log('[JobSheet] answers', next);
        return next;
      });
    },
    [],
  );

  const shouldShow = useCallback(
    (q: FormQuestion): boolean => {
      if (!q.showWhen) return true;
      const dep = answers[q.showWhen.questionId];
      if (!dep) return false;
      const { hasValue } = q.showWhen;
      return Array.isArray(hasValue)
        ? hasValue.includes(dep as string)
        : dep === hasValue;
    },
    [answers],
  );

  // ── Submit ──────────────────────────────────────────────────────────────────

  /** Convert start_time answer to ISO date string */
  const getPreferredStartDate = useCallback((startTimeId: string): string => {
    const now = new Date();
    switch (startTimeId) {
      case 'immediate': return now.toISOString().slice(0, 10);
      case '1-week': { now.setDate(now.getDate() + 7); return now.toISOString().slice(0, 10); }
      case '15-days': { now.setDate(now.getDate() + 15); return now.toISOString().slice(0, 10); }
      case '1-month': { now.setMonth(now.getMonth() + 1); return now.toISOString().slice(0, 10); }
      default: return now.toISOString().slice(0, 10);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form) return;

    const visibleQuestions = form.questions.filter(shouldShow);
    for (const q of visibleQuestions) {
      const ans = answers[q.id];
      const empty = !ans || (Array.isArray(ans) && ans.length === 0);
      if (q.required && empty) {
        return;
      }
    }

    // Determine jobConcern — from category flow or form answer
    const jobConcern = (jobCategory?.categoryKey || answers.job_type) as JobCategory;

    // Determine workingHourType — from hours flow or form answer
    const workingHourType = (jobCategory ? answers.work_hours : hoursType) as HoursType;

    // Determine workLocationType
    const workLocationType = (answers.work_location || 'myCity') as WorkLocationType;

    // Determine preferredWorkStartDate
    const startTime = answers.start_time as string | undefined;

    // Always send vendor address as myCity
    // Send workLocation only when user chose their own area (myCity)
    const payload: JobApplicationPayload = {
      name: vendorName || '',
      phone: vendorMobile || '',
      jobConcern,
      workingHourType,
      workLocationType,
      myCity: vendorAddress || undefined,
      ...(workLocationType === 'myCity' && vendorAddress ? { workLocation: vendorAddress } : {}),
      ...(startTime ? { preferredWorkStartDate: getPreferredStartDate(startTime) } : {}),
    };

    if (__DEV__) console.log('[JobSheet] SUBMIT payload', JSON.stringify(payload, null, 2));

    setSubmitting(true);
    try {
      const result = await submitJobApplication(payload);
      setSubmitResult(result);
      setStep('success');
    } catch (err: any) {
      setLoadError(err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [form, answers, shouldShow, jobCategory, hoursType, vendorName, vendorMobile, getPreferredStartDate]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const hoursLabel = jobCategory
    ? `${jobCategory.title} (${jobCategory.subtitle})`
    : hoursType === '24-hours' ? '24 घंटे के लिए' : '10 घंटे के लिए';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[s.backdrop, { opacity: backdropAnim }]}
          pointerEvents={visible ? 'auto' : 'none'}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View
            style={[
              s.sheetInner,
              {
                backgroundColor: "#F4F5F7",
                paddingBottom: insets.bottom + 16,
                maxHeight: SHEET_MAX_HEIGHT,
              },
            ]}>
            {/* Handle + Close row */}
            <View style={s.handleRow}>
              <View style={{ flex: 1 }} />
              <View style={[s.handle, { backgroundColor: colors.sheetHandle }]} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <TouchableOpacity
                  style={[s.closeBtn, { backgroundColor: 'transparent' }]}
                  onPress={() => { ReactNativeHapticFeedback.trigger('contextClick'); onClose(); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <CloseIcon color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Decorative wavy circle — header area */}
            <View style={s.wavyCircleWrap} pointerEvents="none">
              <WavyCircle />
            </View>

            {/* Decorative parallelogram — bottom right */}
            <View style={s.parallelogramWrap} pointerEvents="none">
              <ParallelogramIcon />
            </View>
            {step === 'success' && submitResult ? (
              <SuccessView
                result={submitResult}
                onClose={onClose}
                colors={colors}
              />
            ) : (
              <>
                {/* Header */}
                <View style={s.header}>
                  <Text style={[s.headerLabel, { color: colors.primary }]}>
                    आवेदन की गई नौकरी
                  </Text>
                  <Text style={[s.headerHours, { color: colors.text }]}>
                    {hoursLabel}
                  </Text>
                  {form && (
                    <Text style={[s.headerSubtitle, { color: colors.textSecondary }]}>
                      {form.subtitle.hi}
                    </Text>
                  )}
                </View>

                {/* Body */}
                {loadingForm ? (
                  <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : loadError ? (
                  <View style={s.loadingWrap}>
                    <Text style={[s.errorText, { color: colors.danger }]}>
                      {loadError}
                    </Text>
                    <TouchableOpacity
                      style={[s.retryBtn, { borderColor: colors.primary }]}
                      onPress={loadForm}>
                      <Text style={[s.retryText, { color: colors.primary }]}>
                        पुनः प्रयास करें
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={s.scrollContent}>
                    <View style={[s.questionsContainer, { backgroundColor: colors.background }]}>
                      {form?.questions
                        .filter(shouldShow)
                        .sort((a, b) => a.order - b.order)
                        .map((q, idx, arr) => (
                          <React.Fragment key={`${q.id}-${idx}`}>
                            <View style={s.questionBlock}>
                              <Text style={[s.questionText, { color: '#535151' }]}>
                                {q.question.hi}
                                {q.required && (
                                  <Text style={{ color: colors.danger }}> *</Text>
                                )}
                              </Text>
                              <QuestionField
                                question={q}
                                value={answers[q.id]}
                                onChange={v => handleAnswer(q.id, v)}
                                colors={colors}
                              />
                            </View>
                            {idx < arr.length - 1 && <View style={[s.questionDivider, { backgroundColor: colors.inputBorder }]} />}
                          </React.Fragment>
                        ))}
                      {/* Submit */}
                      <TouchableOpacity
                        style={[
                          s.submitBtn,
                          {
                            backgroundColor: submitting
                              ? colors.buttonDisabled
                              : colors.primary,
                          },
                        ]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}>
                        {submitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={[s.submitBtnText, { color: '#fff' }]}>
                            आवेदन जमा करें
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetInner: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  wavyCircleWrap: {
    position: 'absolute',
    top: -50,
    left: -70,
    zIndex: 0,
  },
  parallelogramWrap: {
    position: 'absolute',
    bottom: 200,
    right: -93,
    zIndex: 0,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: Spacing.hp,
    paddingTop: Spacing.xl,
    paddingBottom: 4,
  },
  headerLabel: {
    fontSize: FontSizes.subtitle,
    fontFamily: 'NotoSansDevanagari-Medium',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerHours: {
    fontSize: FontSizes.h2x,
    fontFamily: 'NotoSansDevanagari-Bold',
    fontWeight: '700',
    marginTop: 2,
    lineHeight: scaleLineHeight(32),
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: 'NotoSansDevanagari-Regular',
    marginTop: 2,
    lineHeight: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  errorText: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Regular',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
  },
  retryText: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Medium',
  },
  scrollContent: {
    paddingHorizontal: Spacing.hp,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: 12,
  },
  questionsContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  questionBlock: {
    padding: Spacing.md,
  },
  questionDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
  },
  questionText: {
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-Medium',
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
  },
  // Options grid
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 50,
    minWidth: '45%',
    flexShrink: 1,
  },
  optionCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: FontSizes.sm,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '600',
    flexShrink: 1,
  },
  // Text / number inputs
  textInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    paddingHorizontal: 12,
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Regular',
  },
  // Submit button
  submitBtn: {
    height: 50,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: FontSizes.button,
    fontFamily: 'GolosText-SemiBold',
    fontWeight: '600',
  },
  // Success
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: 12,
  },
  successIconWrap: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: FontSizes.h2,
    fontFamily: 'NotoSansDevanagari-SemiBold',
    fontWeight: '700',
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FontSizes.body,
    fontFamily: 'GolosText-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
});
