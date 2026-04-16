import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RNOtpVerify from 'react-native-otp-verify';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomRightDecoration } from '../../components/BottomRightDecoration';
import Svg, { Path } from 'react-native-svg';
import { useAuth, useTheme } from '../../context';
import { FontSizes, BorderRadius } from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';
import { sendOtp, verifyOtp } from '../../services/authApi';
import { LoginScreenMomWithBaby } from '../../assets/images/LoginScreenMomWithBaby';
import { MKCLogo } from '../../assets/images/MKCLogo';
import { MKCLogoIconBlue } from '../../assets/images/MKCLogoIconBlue';
import { LoginScreenBottomIcon } from '../../assets/images/LoginScreenBottomIcon';
import { GreyLockIcon } from '../../assets/images/GreyLockIcon';

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;
const RESEND_SECONDS = 49;

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

export function OTPScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Extract OTP digits from an SMS message
  const extractOtp = useCallback((message: string) => {
    const match = message.match(/(\d{6})/);
    if (match) {
      const digits = match[1].split('');
      setOtp(digits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  }, []);

  useEffect(() => {
    inputRefs.current[0]?.focus();

    // Android: request SMS permission, then start SMS listener for auto-read
    if (Platform.OS === 'android') {
      (async () => {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            {
              title: 'SMS Permission',
              message: 'OTP ऑटो-फिल के लिए SMS पढ़ने की अनुमति दें',
              buttonPositive: 'अनुमति दें',
              buttonNegative: 'रद्द करें',
            },
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            RNOtpVerify.getHash()
              .then((hash: string[]) => console.log('SMS Hash:', hash))
              .catch(console.log);

            RNOtpVerify.getOtp()
              .then(() => {
                RNOtpVerify.addListener((message: string) => {
                  extractOtp(message);
                  RNOtpVerify.removeListener();
                });
              })
              .catch(console.log);
          }
        } catch (err) {
          console.log('SMS permission error:', err);
        }
      })();
    }

    return () => {
      if (Platform.OS === 'android') {
        RNOtpVerify.removeListener();
      }
    };
  }, [extractOtp]);

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
    setVerifying(true);
    try {
      const result = await verifyOtp(phone, code);
      const vendorName = [result.vendor.firstName, result.vendor.lastName]
        .filter(Boolean)
        .join(' ');

      // Login should happen right after OTP verification.
      // Preferred job location can be saved later via separate API flow.
      await signIn(
        result.token,
        result.vendor.id,
        result.vendor.mobile,
        vendorName,
      );
    } catch (e: any) {
      Alert.alert('त्रुटि', e.message || 'OTP सत्यापन में समस्या हुई।');
    } finally {
      setVerifying(false);
    }
  }

  function handleResend() {
    if (timer > 0) {
      return;
    }
    setTimer(RESEND_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
    sendOtp(phone).catch(() => {});
  }

  const filled = otp.join('').length === OTP_LENGTH;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        bounces={false}
        alwaysBounceVertical={false}
      >
        {/* ── Back button ── */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6 6 6"
              stroke={colors.text}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* ── Hero ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageWrap}>
            <LoginScreenMomWithBaby width={width * 0.8} height={width * 0.62} />
          </View>
        </View>

        {/* ── Logo ── */}
        <View style={styles.logoContainer}>
          <MKCLogoIconBlue
            width={150}
            height={150}
            style={styles.logoIcon}
          />
          <MKCLogo
            width={98}
            height={41}
            style={styles.logoMain}
          />
        </View>

        {/* ── Title ── */}
        <Text style={[styles.title, { color: colors.text }]}>OTP सत्यापन</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          +91 {phone} पर भेजा गया OTP दर्ज करें
        </Text>

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
                  color: colors.textBlue,
                },
                digit
                  ? {
                      borderColor: colors.iconBlue,
                      backgroundColor: colors.otpFilledBackground,
                    }
                  : null,
              ]}
              value={digit}
              onChangeText={text => handleChange(text, i)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, i)
              }
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              textContentType={i === 0 ? 'oneTimeCode' : 'none'}
              autoComplete={i === 0 ? 'sms-otp' : 'off'}
            />
          ))}
        </View>

        {/* ── Resend ── */}
        <View style={styles.resendRow}>
          <Text style={[styles.resendQuestion, { color: colors.textMuted }]}>
            क्या आपको OTP नहीं मिला?{' '}
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={timer > 0}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.resendText,
                { color: colors.textBlue },
                timer > 0 && { color: colors.textMuted },
              ]}
            >
              {timer > 0 ? `${timer}s में पुनः प्रयास करें` : 'पुनः भेजें'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.flex} />

        {/* ── Verify button ── */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: filled ? colors.iconBlue : colors.buttonDisabled,
            },
          ]}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={!filled}
        >
          <View style={styles.buttonContent}>
            <GreyLockIcon
              width={15}
              height={15}
              color={filled ? colors.buttonPrimaryText : undefined}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.buttonText,
                {
                  color: filled ? colors.buttonPrimaryText : colors.buttonDisabledText,
                },
              ]}
            >
              सत्यापित करें ›
            </Text>
          </View>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* ── Bottom-right decorative icon ── */}
      <BottomRightDecoration
        icon={<LoginScreenBottomIcon width={280} height={280} />}
      />

      {/* ── Verifying popup ── */}
      <Modal
        visible={verifying}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <ActivityIndicator size="large" color={colors.iconBlue} />
            <Text style={[styles.modalText, { color: colors.text }]}>
              आपका नंबर वेरिफाई किया जा रहा है…
            </Text>
          </View>
        </View>
      </Modal>
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
  logoIcon: {
    marginLeft: -88,
    marginTop: -100,
  },
  logoMain: {
    paddingHorizontal: 24,
    marginTop: -50,
  },
  scrollContent: {
    flexGrow: 1,
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

  /* ── Back Button ── */
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 8,
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
    borderRadius: BorderRadius.button,
    fontSize: FontSizes.h2,
    fontWeight: '700',
  },

  /* ── Resend ── */
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  resendQuestion: {
    fontSize: FontSizes.caption,
  },
  resendText: {
    fontSize: FontSizes.caption,
    fontWeight: '600',
  },

  /* ── Button ── */
  button: {
    borderRadius: BorderRadius.button,
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

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 32,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 16,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalText: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
