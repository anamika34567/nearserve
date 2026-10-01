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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLocation from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { registerUser } from '../../services/authService';
import { COLORS } from '../../constants';

function LegacyMarketplaceRegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [category, setCategory] = useState('plumber');
  const [hourlyRate, setHourlyRate] = useState('300');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [about, setAbout] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [certImage, setCertImage] = useState(null);
  const [providerLat, setProviderLat] = useState('');
  const [providerLng, setProviderLng] = useState('');
  const [locationMode, setLocationMode] = useState('auto'); // 'auto' or 'manual'
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePickCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCvFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handlePickCertificate = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions
          ? ImagePicker.MediaTypeOptions.Images
          : ['images'],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCertImage(result.assets[0]);
      }
    } catch (e) {
      console.log('Image picker error:', e);
      Alert.alert('Error', 'Failed to pick image: ' + e.message);
    }
  };

  const handleFetchCurrentLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({});
      setProviderLat(String(loc.coords.latitude));
      setProviderLng(String(loc.coords.longitude));
      Alert.alert('Success', `Location detected!\nLat: ${loc.coords.latitude.toFixed(4)}\nLng: ${loc.coords.longitude.toFixed(4)}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setFetchingLocation(false);
    }
  };

  const fileToBase64 = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let certData = '';

      if (certImage) {
        try {
          const base64 = await fileToBase64(certImage.uri);
          certData = `data:image/jpeg;base64,${base64}`;
        } catch (e) {
          console.log('Certificate read failed:', e);
        }
      }

      await registerUser(email, password, name, phone, role, {
        category,
        hourlyRate: parseInt(hourlyRate) || 300,
        bio,
        experience,
        skills,
        about,
        certUrl: certData,
        manualLat: providerLat ? parseFloat(providerLat) : null,
        manualLng: providerLng ? parseFloat(providerLng) : null,
      });
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="construct" size={50} color={COLORS.primary} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join NearServe today</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <Text style={styles.roleLabel}>I am a:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'user' && styles.roleActive]}
              onPress={() => setRole('user')}
            >
              <Ionicons
                name="person"
                size={20}
                color={role === 'user' ? COLORS.white : COLORS.primary}
              />
              <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>
                Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, role === 'provider' && styles.roleActive]}
              onPress={() => setRole('provider')}
            >
              <Ionicons
                name="construct"
                size={20}
                color={role === 'provider' ? COLORS.white : COLORS.primary}
              />
              <Text style={[styles.roleText, role === 'provider' && styles.roleTextActive]}>
                Service Provider
              </Text>
            </TouchableOpacity>
          </View>

          {role === 'provider' && (
            <View style={styles.providerFields}>
              <Text style={styles.roleLabel}>Service Category:</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleButton, category === 'plumber' && styles.roleActive]}
                  onPress={() => setCategory('plumber')}
                >
                  <Ionicons
                    name="water"
                    size={20}
                    color={category === 'plumber' ? COLORS.white : COLORS.primary}
                  />
                  <Text style={[styles.roleText, category === 'plumber' && styles.roleTextActive]}>
                    Plumber
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, category === 'electrician' && styles.roleActive]}
                  onPress={() => setCategory('electrician')}
                >
                  <Ionicons
                    name="flash"
                    size={20}
                    color={category === 'electrician' ? COLORS.white : COLORS.primary}
                  />
                  <Text style={[styles.roleText, category === 'electrician' && styles.roleTextActive]}>
                    Electrician
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, category === 'autorickshaw' && styles.roleActive]}
                  onPress={() => setCategory('autorickshaw')}
                >
                  <Ionicons
                    name="car"
                    size={20}
                    color={category === 'autorickshaw' ? COLORS.white : COLORS.primary}
                  />
                  <Text style={[styles.roleText, category === 'autorickshaw' && styles.roleTextActive]}>
                    Auto
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="cash-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Hourly Rate (Rs.)"
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="time-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Years of Experience (e.g. 5)"
                  value={experience}
                  onChangeText={setExperience}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="build-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Skills (e.g. Pipe Repair, Wiring)"
                  value={skills}
                  onChangeText={setSkills}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={[styles.inputContainer, { height: 100, alignItems: 'flex-start', paddingTop: 14 }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.gray} style={[styles.inputIcon, { marginTop: 2 }]} />
                <TextInput
                  style={[styles.input, { textAlignVertical: 'top', height: 72 }]}
                  placeholder="About yourself - describe your experience, certifications, and why customers should trust you..."
                  value={about}
                  onChangeText={setAbout}
                  placeholderTextColor={COLORS.gray}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Certificate Photo */}
              <Text style={styles.roleLabel}>Upload Documents:</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickCertificate}>
                <View style={[styles.uploadIcon, { backgroundColor: '#9C27B020' }]}>
                  <Ionicons name="camera" size={22} color="#9C27B0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadTitle}>
                    {certImage ? 'Certificate Selected' : 'Upload Certificate Photo'}
                  </Text>
                  <Text style={styles.uploadHint}>Photo of your work certificate / ID</Text>
                </View>
                {certImage ? (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={22} color={COLORS.gray} />
                )}
              </TouchableOpacity>

              {/* Service Location */}
              <Text style={styles.roleLabel}>Your Service Location:</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleButton, locationMode === 'auto' && styles.roleActive]}
                  onPress={() => setLocationMode('auto')}
                >
                  <Ionicons name="navigate" size={18} color={locationMode === 'auto' ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.roleText, locationMode === 'auto' && styles.roleTextActive, { fontSize: 13 }]}>
                    Current GPS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, locationMode === 'manual' && styles.roleActive]}
                  onPress={() => setLocationMode('manual')}
                >
                  <Ionicons name="create" size={18} color={locationMode === 'manual' ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.roleText, locationMode === 'manual' && styles.roleTextActive, { fontSize: 13 }]}>
                    Enter Manually
                  </Text>
                </TouchableOpacity>
              </View>

              {locationMode === 'auto' ? (
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handleFetchCurrentLocation}
                  disabled={fetchingLocation}
                >
                  <View style={[styles.uploadIcon, { backgroundColor: COLORS.primary + '20' }]}>
                    {fetchingLocation ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons name="location" size={22} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>
                      {providerLat ? `Lat: ${parseFloat(providerLat).toFixed(4)}, Lng: ${parseFloat(providerLng).toFixed(4)}` : 'Tap to detect location'}
                    </Text>
                    <Text style={styles.uploadHint}>Uses your phone GPS</Text>
                  </View>
                  {providerLat ? (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                  ) : (
                    <Ionicons name="locate-outline" size={22} color={COLORS.gray} />
                  )}
                </TouchableOpacity>
              ) : (
                <View>
                  <View style={styles.inputContainer}>
                    <Ionicons name="navigate-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Latitude (e.g. 8.881)"
                      value={providerLat}
                      onChangeText={setProviderLat}
                      keyboardType="decimal-pad"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Ionicons name="navigate-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Longitude (e.g. 76.614)"
                      value={providerLng}
                      onChangeText={setProviderLng}
                      keyboardType="decimal-pad"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password || !inviteCode.trim()) {
      Alert.alert('Missing information', 'Complete all fields and enter your personal invitation code.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(email.trim(), password, name.trim(), phone.trim(), 'resident', { inviteCode });
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Could not create account', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={apartmentStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={apartmentStyles.content} keyboardShouldPersistTaps="handled">
        <View style={apartmentStyles.brandMark}><Ionicons name="home" size={28} color={COLORS.white} /></View>
        <Text style={apartmentStyles.title}>Join your building</Text>
        <Text style={apartmentStyles.subtitle}>Use the personal invitation from your building manager. It assigns your resident or technician access.</Text>

        <TextInput style={apartmentStyles.input} placeholder="Full name" value={name} onChangeText={setName} placeholderTextColor={COLORS.gray} />
        <TextInput style={apartmentStyles.input} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.gray} />
        <TextInput style={apartmentStyles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.gray} />
        <TextInput style={apartmentStyles.input} placeholder="Personal invitation code" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="none" placeholderTextColor={COLORS.gray} />
        <TextInput style={apartmentStyles.input} placeholder="Password (at least 6 characters)" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={COLORS.gray} />

        <View style={apartmentStyles.approvalNote}>
          <Ionicons name="shield-checkmark-outline" size={19} color={COLORS.primary} />
          <Text style={apartmentStyles.approvalText}>The invitation is tied to your email and flat. Verify your email to activate your account.</Text>
        </View>

        <TouchableOpacity style={[apartmentStyles.button, loading && apartmentStyles.disabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={apartmentStyles.buttonText}>Create account</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={apartmentStyles.loginLink} onPress={() => router.replace('/(auth)/login')}>
          <Text style={apartmentStyles.loginText}>Already registered? <Text style={apartmentStyles.loginBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const apartmentStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandMark: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 27, fontWeight: '800' },
  subtitle: { color: COLORS.textLight, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 22 },
  input: { minHeight: 50, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, paddingHorizontal: 14, color: COLORS.text, fontSize: 15, marginBottom: 11 },
  approvalNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: `${COLORS.primary}10`, padding: 12, borderRadius: 11, marginTop: 4 },
  approvalText: { flex: 1, color: COLORS.darkGray, fontSize: 12, lineHeight: 18 },
  button: { minHeight: 52, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  loginLink: { alignItems: 'center', paddingVertical: 18 },
  loginText: { color: COLORS.textLight, fontSize: 14 },
  loginBold: { color: COLORS.primary, fontWeight: '800' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 6,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  roleActive: {
    backgroundColor: COLORS.primary,
  },
  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  roleTextActive: {
    color: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  linkBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  providerFields: {
    marginBottom: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 12,
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  uploadHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
});
