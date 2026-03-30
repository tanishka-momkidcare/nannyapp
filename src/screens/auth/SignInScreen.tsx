import React, {useState} from 'react';
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
import type {AuthStackParamList} from '../../navigation/types';
import {MomWithBabyIllustration} from '../../assets/images/MomWithBabyIllustration';
import {PhoneIcon} from '../../assets/icons/PhoneIcon';

const {width} = Dimensions.get('window');

const BLUE = '#3B82F6';
const AMBER = '#F5A623';
const BG = '#EEF6FF';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export function SignInScreen({navigation}: Props) {
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  function handleSendOTP() {
    if (phone.trim().length < 10 || !agreed) {
      return;
    }
    navigation.navigate('OTPVerification', {phone: phone.trim()});
  }

  const canSubmit = phone.length >= 10 && agreed;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Top blob with portrait */}
      <View style={styles.blobContainer}>
        <View style={styles.blob} />
        <View style={styles.portraitCircle}>
          <MomWithBabyIllustration width={150} height={150} />
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

          <Text style={styles.title}>लॉगिन करें या नया खाता बनाएं</Text>
          <Text style={styles.subtitle}>अपना मोबाइल नंबर दर्ज करके शुरू करें</Text>

          {/* Phone input row */}
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <PhoneIcon width={18} height={18} />
              <Text style={styles.flagText}>🇮🇳</Text>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="मोबाइल नंबर"
              placeholderTextColor="#AAAAAA"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Text style={styles.otpHint}>
            आपके मोबाइल नंबर की पुष्टि के लिए हम SMS के माध्यम से OTP भेजेंगे
          </Text>

          {/* Terms checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreed(v => !v)}
            activeOpacity={0.7}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to{' '}
              <Text style={styles.termsLink}>Terms &amp; Conditions</Text>
            </Text>
          </TouchableOpacity>

          {/* Send OTP button */}
          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSendOTP}
            activeOpacity={0.85}>
            <Text style={styles.buttonText}>🔒  OTP भेजें ›</Text>
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
    height: 270,
  },
  blob: {
    position: 'absolute',
    width: width * 1.15,
    height: 240,
    borderBottomLeftRadius: width * 0.65,
    borderBottomRightRadius: width * 0.65,
    backgroundColor: BLUE,
    top: 0,
  },
  portraitCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 62,
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
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 22,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 17,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  phoneIcon: {
    marginRight: 4,
  },
  flagText: {
    fontSize: 18,
    marginRight: 6,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 17,
    fontSize: 15,
    color: '#1A1A1A',
  },
  otpHint: {
    fontSize: 12,
    color: '#888888',
    marginTop: 10,
    marginBottom: 22,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#AAAAAA',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 13,
    color: '#555555',
  },
  termsLink: {
    color: BLUE,
    fontWeight: '600',
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
