import React, {useEffect, useRef, useState} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAuth} from '../../context';
import type {AuthStackParamList} from '../../navigation/types';
import {MomWithBabyIllustration} from '../../assets/images/MomWithBabyIllustration';

const {width} = Dimensions.get('window');

const BLUE = '#3B82F6';
const AMBER = '#F5A623';
const BG = '#EEF6FF';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 49;

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

export function OTPScreen({route}: Props) {
  const {phone} = route.params;
  const {signIn} = useAuth();

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Top blob with portrait */}
      <View style={styles.blobContainer}>
        <View style={styles.blob} />
        <View style={styles.portraitCircle}>
          <MomWithBabyIllustration width={130} height={130} />
        </View>
        <View style={styles.logoRow}>
          <Text style={styles.logoMom}>mom</Text>
          <Text style={styles.logoKid}>kid</Text>
          <Text style={styles.logoCare}>care</Text>
          <Text style={styles.logoTM}>®</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Text style={styles.title}>OTP सत्यापन</Text>
          <Text style={styles.subtitle}>
            +91 {phone} पर भेजा गया OTP दर्ज करें
          </Text>

          {/* OTP input boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => {
                  inputRefs.current[i] = ref;
                }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
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

          {/* Resend section */}
          <Text style={styles.resendQuestion}>क्या आपको OTP नहीं मिला?</Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0} activeOpacity={0.7}>
            <Text style={[styles.resendText, timer > 0 && styles.resendDisabled]}>
              {timer > 0 ? `${timer} सेकंड में पुनः प्रयास करें` : 'पुनः भेजें'}
            </Text>
          </TouchableOpacity>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.button, !filled && styles.buttonDisabled]}
            onPress={handleVerify}
            activeOpacity={0.85}>
            <Text style={styles.buttonText}>🔒  सत्यापित करें ›</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  blobContainer: {
    alignItems: 'center',
    height: 250,
  },
  blob: {
    position: 'absolute',
    width: width * 1.15,
    height: 220,
    borderBottomLeftRadius: width * 0.65,
    borderBottomRightRadius: width * 0.65,
    backgroundColor: BLUE,
    top: 0,
  },
  portraitCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 58,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
    overflow: 'hidden',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'absolute',
    top: 14,
    left: 24,
  },
  logoMom: {fontSize: 21, fontWeight: '800', color: '#FFFFFF'},
  logoKid: {fontSize: 21, fontWeight: '800', color: '#FFF176'},
  logoCare: {fontSize: 12, fontWeight: '400', color: '#FFF176', marginBottom: 1},
  logoTM: {fontSize: 9, color: '#FFFFFFAA', marginBottom: 2, marginLeft: 1},
  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 28,
    lineHeight: 20,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  otpBox: {
    width: (width - 48 - 30) / OTP_LENGTH,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: BLUE,
    backgroundColor: '#EEF6FF',
  },
  resendQuestion: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
  },
  resendText: {
    fontSize: 13,
    color: BLUE,
    fontWeight: '600',
    marginBottom: 32,
  },
  resendDisabled: {
    color: '#AAAAAA',
  },
  button: {
    backgroundColor: AMBER,
    borderRadius: 30,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AMBER,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#DDDDDD',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
