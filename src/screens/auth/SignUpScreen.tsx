import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BottomRightDecoration, ScreenWrapper} from '../../components';
import {LoginScreenBottomIcon} from '../../assets/images/LoginScreenBottomIcon';
import {Spacing, Typography, BorderRadius} from '../../constants';
import {useAuth, useTheme} from '../../context';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({navigation}: Props) {
  const {colors} = useTheme();
  const {signIn} = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return;
    }
    if (password !== confirmPassword) {
      return;
    }
    // TODO: Replace with actual API call
    await signIn('dummy-auth-token');
  }

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[Typography.h1, {color: colors.text}]}>Create Account</Text>
            <Text style={[Typography.body, {color: colors.textSecondary, marginTop: Spacing.sm}]}>
              Join our community of parents and nannies
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {backgroundColor: colors.surface, color: colors.text, borderColor: colors.border},
              ]}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[
                styles.input,
                {backgroundColor: colors.surface, color: colors.text, borderColor: colors.border},
              ]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[
                styles.input,
                {backgroundColor: colors.surface, color: colors.text, borderColor: colors.border},
              ]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={[
                styles.input,
                {backgroundColor: colors.surface, color: colors.text, borderColor: colors.border},
              ]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.button, {backgroundColor: colors.primary}]}
              onPress={handleSignUp}
              activeOpacity={0.8}>
              <Text style={[Typography.button, {color: colors.buttonPrimaryText}]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[Typography.caption, {color: colors.textSecondary}]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={[Typography.caption, {color: colors.textBlue, fontWeight: '600'}]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomRightDecoration
        icon={<LoginScreenBottomIcon width={280} height={280} />}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    height: 56,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Typography.body,
  },
  button: {
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
});
