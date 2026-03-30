import React, {useEffect, useRef, useState} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Defs, Ellipse, FeGaussianBlur, Filter} from 'react-native-svg';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAuth, useTheme} from '../../context';
import {FontSizes} from '../../constants';
import type {AuthStackParamList} from '../../navigation/types';
import {LoginScreenMomWithBaby} from '../../assets/images/LoginScreenMomWithBaby';
import {MKCLogo} from '../../assets/images/MKCLogo';
import {MKCLogoIconBlue} from '../../assets/images/MKCLogoIconBlue';
import {LoginScreenBottomIcon} from '../../assets/images/LoginScreenBottomIcon';
import {GreyLockIcon} from '../../assets/images/GreyLockIcon';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width} = Dimensions.get('window');
const OTP_LENGTH = 6;
const RESEND_SECONDS = 49;

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

export function OTPScreen({route, navigation}: Props) {
  const {phone} = route.params;
  const {signIn} = useAuth();
  const {colors, isDark} = useTheme();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      return;
    }
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleChange(text: string, index: number) {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      return;
    }
    // TODO: validate OTP via API
    await signIn('dummy-auth-token');
  }

  function handleResend() {
    if (timer > 0) {
      return;
    }
    setTimer(RESEND_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  }

  const filled = otp.join('').length === OTP_LENGTH;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View style={styles.heroSection}>
            <View style={styles.heroImageWrap}>
              <LoginScreenMomWithBaby width={width * 0.8} height={width * 0.62} />
            </View>
          </View>

          {/* ── Logo ── */}
          <View style={styles.logoContainer}>
            <MKCLogoIconBlue width={150} height={150} style={{marginLeft: -88, marginTop: -100}} />
            <MKCLogo width={98} height={41} style={{paddingHorizontal: 24, marginTop: -50}} />
          </View>

          {/* ── Title ── */}
          <Text style={[styles.title, {color: colors.text}]}>
            OTP सत्यापन
          </Text>
          <Text style={[styles.subtitle, {color: colors.textMuted}]}>
            +91 {phone} पर भेजा गया OTP दर्ज करें
          </Text>

          {/* ── Change number ── */}
          <Pressable style={styles.changeNumberRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={14} color="hsla(213, 92%, 54%, 1)" />
            <Text style={styles.changeNumberText}>नंबर बदलें</Text>
          </Pressable>

          {/* ── OTP input boxes ── */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => {
                  inputRefs.current[i] = ref;
                }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                  digit
                    ? {
                        borderColor: 'hsla(213, 92%, 54%, 1)',
                        backgroundColor: colors.otpFilledBackground,
                      }
                    : null,
                ]}
                value={digit}
                onChangeText={text => handleChange(text, i)}
                onKeyPress={({nativeEvent}) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* ── Resend ── */}
          <Text style={[styles.resendQuestion, {color: colors.textMuted}]}>
            क्या आपको OTP नहीं मिला?
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0} activeOpacity={0.7}>
            <Text
              style={[
                styles.resendText,
                {color: 'hsla(213, 92%, 54%, 1)'},
                timer > 0 && {color: colors.textMuted},
              ]}>
              {timer > 0 ? `${timer} सेकंड में पुनः प्रयास करें` : 'पुनः भेजें'}
            </Text>
          </TouchableOpacity>

          {/* ── Verify button ── */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: filled
                  ? 'hsla(213, 92%, 54%, 1)'
                  : colors.buttonDisabled,
              },
            ]}
            onPress={handleVerify}
            activeOpacity={0.85}
            disabled={!filled}>
            <View style={styles.buttonContent}>
              <GreyLockIcon
                width={15}
                height={15}
                color={filled ? '#FFFFFF' : undefined}
                style={{marginRight: 8}}
              />
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: filled
                      ? '#FFFFFF'
                      : colors.buttonDisabledText,
                  },
                ]}>
                सत्यापित करें  ›
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom-right decorative icon ── */}
      <View style={styles.bottomIconWrap} pointerEvents="none">
        <Svg width={320} height={280} style={styles.bottomIconBgSvg}>
          <Defs>
            <Filter id="otpBlur" x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur in="SourceGraphic" stdDeviation="50" />
            </Filter>
          </Defs>
          <Ellipse
            cx={200}
            cy={180}
            rx={160}
            ry={140}
            fill="hsla(227, 81%, 87%, 1)"
            filter="url(#otpBlur)"
            opacity={0.48}
          />
        </Svg>
        <LoginScreenBottomIcon width={250} height={250} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* ── Hero ── */
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: width * 0.75,
    marginTop: 20,
  },
  heroImageWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Logo ── */
  logoContainer: {
    paddingHorizontal: 0,
    marginBottom: 14,
    gap: 2,
  },

  /* ── Text ── */
  title: {
    fontSize: FontSizes.title,
    fontWeight: '800',
    paddingHorizontal: 24,
    marginBottom: 4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: FontSizes.caption,
    paddingHorizontal: 24,
    marginBottom: 8,
  },

  /* ── Change number ── */
  changeNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 6,
  },
  changeNumberText: {
    fontSize: FontSizes.caption,
    fontWeight: '600',
    color: 'hsla(213, 92%, 54%, 1)',
  },

  /* ── OTP ── */
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 20,
  },
  otpBox: {
    width: (width - 48 - 30) / OTP_LENGTH,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: FontSizes.h2,
    fontWeight: '700',
  },

  /* ── Resend ── */
  resendQuestion: {
    fontSize: FontSizes.caption,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  resendText: {
    fontSize: FontSizes.caption,
    fontWeight: '600',
    marginBottom: 28,
    paddingHorizontal: 24,
  },

  /* ── Button ── */
  button: {
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 48,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FontSizes.button,
    fontWeight: '700',
  },

  /* ── Bottom icon ── */
  bottomIconWrap: {
    position: 'absolute',
    bottom: -110,
    right: -60,
  },
  bottomIconBgSvg: {
    position: 'absolute',
    bottom: -20,
    right: -20,
  },
});
