import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../../services/authService';
import { COLORS } from '../../constants';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await loginUser(email, password);
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Curved Background */}
      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="construct" size={36} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.brandName}>NearServe</Text>
        <Text style={styles.tagline}>Find trusted professionals near you</Text>
      </View>

      {/* Form Card */}
      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.loginSubtext}>Sign in to continue</Text>

            {/* Email Input */}
            <View style={[
              styles.inputContainer,
              focusedField === 'email' && styles.inputFocused,
            ]}>
              <View style={[
                styles.inputIconBox,
                focusedField === 'email' && styles.inputIconBoxFocused,
              ]}>
                <Ionicons name="mail" size={18} color={
                  focusedField === 'email' ? COLORS.white : COLORS.primary
                } />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email or Username"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                placeholderTextColor={COLORS.gray}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password Input */}
            <View style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputFocused,
            ]}>
              <View style={[
                styles.inputIconBox,
                focusedField === 'password' && styles.inputIconBoxFocused,
              ]}>
                <Ionicons name="lock-closed" size={18} color={
                  focusedField === 'password' ? COLORS.white : COLORS.primary
                } />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor={COLORS.gray}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View style={styles.loginBtnContent}>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <View style={styles.loginArrow}>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-apple" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="call" size={22} color={COLORS.success} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.signupText}>
              Don't have an account? <Text style={styles.signupBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Top Section
  topSection: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -40,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 20,
    left: -30,
  },
  circle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: 40,
    left: 50,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },

  // Form
  formWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  loginSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 24,
  },

  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    marginBottom: 14,
    height: 54,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  inputIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
    marginRight: 10,
  },
  inputIconBoxFocused: {
    backgroundColor: COLORS.primary,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 10,
    marginRight: 4,
  },

  // Forgot
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 2,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Login Button
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 10,
  },
  loginArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.gray,
    marginHorizontal: 14,
    fontWeight: '500',
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Signup
  signupLink: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  signupText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  signupBold: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
