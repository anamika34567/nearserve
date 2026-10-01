import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from '../node_modules/@firebase/auth/dist/esm2017/index.js';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../services/authService';
import { COLORS } from '../constants';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, userProfile, setUserProfile } = useAuth();

  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    setSaving(true);
    try {
      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        phone: phone.trim(),
      });

      // Update Firebase Auth display name
      await updateProfile(user, { displayName: name.trim() });

      // Refresh local profile
      const updated = await getUserProfile(user.uid);
      setUserProfile(updated);

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.gray}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color={COLORS.gray} />
              <Text style={styles.disabledText}>{user?.email || ''}</Text>
            </View>
            <Text style={styles.hint}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={[styles.inputRow, styles.inputDisabled]}>
              <Ionicons name="shield-outline" size={20} color={COLORS.gray} />
              <Text style={styles.disabledText}>
                {userProfile?.role === 'admin' ? 'Admin' : userProfile?.role === 'provider' ? 'Service Provider' : 'Customer'}
              </Text>
            </View>
            <Text style={styles.hint}>Role cannot be changed</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.white,
  },
  form: {
    paddingHorizontal: 16,
    gap: 20,
  },
  inputGroup: {},
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  inputDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  disabledText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textLight,
  },
  hint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    marginLeft: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
