import React, { useState } from 'react';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { LoginScreenMomWithBaby } from '../../assets/images/LoginScreenMomWithBaby';
import { MKCLogo } from '../../assets/images/MKCLogo';
import { MKCLogoIconBlue } from '../../assets/images/MKCLogoIconBlue';
import { LoginScreenBottomIcon } from '../../assets/images/LoginScreenBottomIcon';
import {
  CountryCodePicker,
  DEFAULT_COUNTRY,
  type Country,
} from '../../components/CountryCodePicker';
import { BottomRightDecoration } from '../../components/BottomRightDecoration';
import { useTheme } from '../../context';
import { FontSizes } from '../../constants';
import { GreyLockIcon } from '../../assets/images/GreyLockIcon';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);

  function handleSendOTP() {
    if (phone.trim().length < 10 || !agreed) {
      return;
    }
    navigation.navigate('OTPVerification', { phone: phone.trim() });
  }

  const canSubmit = phone.length >= 10 && agreed;

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
        <View style={styles.heroSection}>
          <View style={styles.heroImageWrap}>
            <LoginScreenMomWithBaby width={width * 0.8} height={width * 0.62} />
          </View>
        </View>
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
        <Text style={[styles.title, { color: colors.text }]}>
          लॉगिन करें या नया खाता बनाएं
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          अपना मोबाइल नंबर दर्ज करके शुरू करें
        </Text>
        <View
          style={[
            styles.phoneRow,
            {
              backgroundColor: colors.inputBackground,
            },
          ]}
        >
          <View style={styles.phoneIconBox}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1.003 1.003 0 011.01-.24c1.12.37 2.33.57 3.57.57.55 0 1.01.46 1.01 1.01v3.49c0 .55-.46 1.01-1.01 1.01C10.07 21.02 2.98 13.93 2.98 4.98c0-.55.46-1.01 1.01-1.01H7.5c.55 0 1.01.46 1.01 1.01 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.01l-2.22 2.23z"
                fill={colors.iconBlue}
              />
            </Svg>
          </View>
          <View
            style={[styles.verticalDivider, { backgroundColor: colors.border }]}
          />
          <CountryCodePicker selected={country} onSelect={setCountry} />
          <TextInput
            style={[styles.phoneInput, { color: colors.inputText }]}
            placeholder="मोबाइल नंबर"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* ── OTP hint ── */}
        <Text style={[styles.otpHint, { color: colors.textMuted }]}>
          आपके मोबाइल नंबर की पुष्टि के लिए हम{'\n'}SMS के माध्यम से OTP भेजेंगे
        </Text>

        {/* ── Terms checkbox ── */}
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            onPress={() => setAgreed(v => !v)}
            activeOpacity={0.7}
            style={[
              styles.checkbox,
              { borderColor: colors.checkboxBorder },
              agreed && {
                backgroundColor: colors.checkboxChecked,
                borderColor: colors.checkboxChecked,
              },
            ]}
          >
            {agreed && (
              <Text style={[styles.checkmark, { color: colors.textInverse }]}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            I agree to{' '}
            <Text style={[styles.termsLink, { color: colors.textBlue }]}>
              Terms &amp; Conditions.
            </Text>
          </Text>
        </View>

        <View style={styles.flex} />

        {/* ── Send OTP button ── */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: canSubmit
                ? colors.iconBlue
                : colors.buttonDisabled,
            },
          ]}
          onPress={handleSendOTP}
          activeOpacity={0.85}
          disabled={!canSubmit}
        >
          <View style={styles.buttonContent}>
            <GreyLockIcon
              width={15}
              height={15}
              color={canSubmit ? '#FFFFFF' : undefined}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.buttonText,
                {
                  color: canSubmit
                    ? colors.buttonPrimaryText
                    : colors.buttonDisabledText,
                },
              ]}
            >
              OTP भेजें ›
            </Text>
          </View>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* ── Bottom-right decorative icon ── */}
      <BottomRightDecoration
        icon={<LoginScreenBottomIcon width={280} height={280} />}
      />
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
    marginBottom: 20,
  },

  /* ── Phone input ── */
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 24,
    borderWidth: 0,
  },
  phoneIconBox: {
    paddingLeft: 10,
    paddingRight: 6,
  },
  verticalDivider: {
    width: 1,
    height: 24,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 16,
    fontSize: FontSizes.input,
  },

  /* ── Hint ── */
  otpHint: {
    fontSize: FontSizes.sm,
    marginTop: 10,
    marginBottom: 22,
    lineHeight: 18,
    paddingHorizontal: 24,
  },

  /* ── Checkbox ── */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  termsText: {
    fontSize: FontSizes.caption,
  },
  termsLink: {
    fontWeight: '600',
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
});
