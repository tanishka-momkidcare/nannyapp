/**
 * JobApplicationSheet
 *
 * Bottom sheet that slides up from the bottom when a job type card is tapped.
 * Fetches the form template from the API and renders questions dynamically.
 * Supports: single-select, multi-select, text, number question types.
 * Shows a success screen on submit.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Path} from 'react-native-svg';
import {useTheme} from '../context/ThemeContext';
import {BorderRadius, FontSizes, Spacing} from '../constants';
import {
  getFormTemplate,
  submitApplication,
} from '../services/jobApplicationApi';
import {getStaticForm} from '../services/staticFormTemplates';
import type {
  FormQuestion,
  FormTemplateResponse,
  HoursType,
  JobCategory,
  QuestionAnswer,
  SubmitApplicationResponse,
} from '../services/jobApplicationApi';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  hoursType: HoursType;
  onClose: () => void;
}

const {height: SH} = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SH * 0.88;

// ─── Small Icons ─────────────────────────────────────────────────────────────

function CloseIcon({color}: {color: string}) {
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

function CheckIcon({color}: {color: string}) {
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

function QuestionField({question, value, onChange, colors}: QuestionFieldProps) {
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
                    ? {backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5}
                    : {backgroundColor: colors.iconCircleBackground, borderColor: 'transparent', borderWidth: 1.5},
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
                    {color: isSelected ? colors.primary : colors.textSecondary},
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
                    ? {backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5}
                    : {backgroundColor: colors.iconCircleBackground, borderColor: 'transparent', borderWidth: 1.5},
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
                    {color: isSelected ? colors.primary : colors.textSecondary},
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
    <View style={[s.successContainer, {backgroundColor: colors.card}]}>
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
      <Text style={[s.successTitle, {color: colors.text}]}>आवेदन सफल!</Text>
      <Text style={[s.successMessage, {color: colors.textSecondary}]}>
        {result.message.hi}
      </Text>
      <TouchableOpacity
        style={[s.submitBtn, {backgroundColor: colors.primary}]}
        onPress={onClose}
        activeOpacity={0.85}>
        <Text style={[s.submitBtnText, {color: '#fff'}]}>डैशबोर्ड पर लौटें</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export function JobApplicationSheet({visible, hoursType, onClose}: Props) {
  const {colors, isDark} = useTheme();
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
    setLoadingForm(true);
    setLoadError(null);
    try {
      const template = await getFormTemplate('japa', hoursType);
      setForm(template);
    } catch {
      // API unavailable — fall back to static template so the sheet always works
      setForm(getStaticForm(hoursType));
    } finally {
      setLoadingForm(false);
    }
  }, [hoursType]);

  // ── Answer helpers ──────────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (questionId: string, value: string | string[]) => {
      setAnswers(prev => ({...prev, [questionId]: value}));
    },
    [],
  );

  const shouldShow = useCallback(
    (q: FormQuestion): boolean => {
      if (!q.showWhen) return true;
      const dep = answers[q.showWhen.questionId];
      if (!dep) return false;
      const {hasValue} = q.showWhen;
      return Array.isArray(hasValue)
        ? hasValue.includes(dep as string)
        : dep === hasValue;
    },
    [answers],
  );

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!form) return;

    const visibleQuestions = form.questions.filter(shouldShow);
    for (const q of visibleQuestions) {
      const ans = answers[q.id];
      const empty = !ans || (Array.isArray(ans) && ans.length === 0);
      if (q.required && empty) {
        // Scroll intent handled by native keyboard avoidance
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: QuestionAnswer[] = Object.entries(answers).map(
        ([questionId, value]) => ({questionId, value}),
      );
      const result = await submitApplication(
        form.formId,
        form.category,
        payload,
        form.hoursType,
      );
      setSubmitResult(result);
      setStep('success');
    } catch (err: any) {
      // Surface error inline — don't crash the sheet
      setLoadError(err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [form, answers, shouldShow]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const hoursLabel = hoursType === '24-hours' ? '24 घंटे के लिए' : '10 घंटे के लिए';

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
          style={[s.backdrop, {opacity: backdropAnim}]}
          pointerEvents={visible ? 'auto' : 'none'}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[s.sheet, {transform: [{translateY: slideAnim}]}]}
        pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{flex: 1}}>
          <View
            style={[
              s.sheetInner,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 16,
                maxHeight: SHEET_MAX_HEIGHT,
              },
            ]}>
            {/* Drag Handle */}
            <View style={[s.handle, {backgroundColor: colors.sheetHandle}]} />

            {/* Close Button */}
            <TouchableOpacity
              style={[s.closeBtn, {backgroundColor: colors.surface}]}
              onPress={onClose}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <CloseIcon color={colors.textSecondary} />
            </TouchableOpacity>

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
                  <Text style={[s.headerLabel, {color: colors.primary}]}>
                    आवेदन की गई नौकरी
                  </Text>
                  <Text style={[s.headerHours, {color: colors.text}]}>
                    {hoursLabel}
                  </Text>
                  {form && (
                    <Text style={[s.headerSubtitle, {color: colors.textSecondary}]}>
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
                    <Text style={[s.errorText, {color: colors.danger}]}>
                      {loadError}
                    </Text>
                    <TouchableOpacity
                      style={[s.retryBtn, {borderColor: colors.primary}]}
                      onPress={loadForm}>
                      <Text style={[s.retryText, {color: colors.primary}]}>
                        पुनः प्रयास करें
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={s.scrollContent}>
                    {form?.questions
                      .filter(shouldShow)
                      .sort((a, b) => a.order - b.order)
                      .map(q => (
                        <View key={q.id} style={[s.questionBlock, {backgroundColor: colors.background, borderColor: colors.borderLight}]}>
                          <Text style={[s.questionText, {color: colors.textMuted}]}>
                            {q.question.hi}
                            {q.required && (
                              <Text style={{color: colors.danger}}> *</Text>
                            )}
                          </Text>
                          <QuestionField
                            question={q}
                            value={answers[q.id]}
                            onChange={v => handleAnswer(q.id, v)}
                            colors={colors}
                          />
                        </View>
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
                        <Text style={[s.submitBtnText, {color: '#fff'}]}>
                          आवेदन जमा करें
                        </Text>
                      )}
                    </TouchableOpacity>
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
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  headerLabel: {
    fontSize: FontSizes.sm,
    fontFamily: 'NotoSansDevanagari-Medium',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerHours: {
    fontSize: 22,
    fontFamily: 'NotoSansDevanagari-Bold',
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 32,
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: 12,
  },
  questionBlock: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 10,
    borderWidth: 1,
  },
  questionText: {
    fontSize: FontSizes.body,
    fontFamily: 'NotoSansDevanagari-Medium',
    fontWeight: '500',
    lineHeight: 22,
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
    fontSize: FontSizes.body,
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
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
