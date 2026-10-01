import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { createMaintenanceRequest } from '../../services/maintenanceService';
import { COLORS } from '../../constants';

const categories = [
  { key: 'plumbing', label: 'Plumbing', icon: 'water' },
  { key: 'electrical', label: 'Electrical', icon: 'flash' },
  { key: 'cleaning', label: 'Cleaning', icon: 'sparkles' },
  { key: 'other', label: 'Other', icon: 'construct' },
];

const imageMediaType = ImagePicker.MediaType?.Images || ImagePicker.MediaTypeOptions?.Images || ['images'];

export default function NewMaintenanceRequestScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [category, setCategory] = useState('plumbing');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const addPhotos = async (source) => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission needed', 'Allow camera access to take an issue photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: imageMediaType, quality: 0.75 });
        if (!result.canceled && result.assets?.[0]) setPhotos((current) => [...current, result.assets[0]].slice(0, 4));
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo permission needed', 'Allow photo access to attach issue images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: imageMediaType,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 4 - photos.length),
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.length) setPhotos((current) => [...current, ...result.assets].slice(0, 4));
    } catch (error) {
      Alert.alert('Could not add photo', error.message || 'Please try again.');
    }
  };

  const submit = async () => {
    if (userProfile?.membershipStatus !== 'active') {
      Alert.alert('Waiting for approval', 'Your building manager must approve your apartment account before you can submit requests.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add a description', 'Briefly explain the maintenance issue.');
      return;
    }

    setSubmitting(true);
    try {
      await createMaintenanceRequest({ user, userProfile, category, description, photos });
      Alert.alert('Request submitted', 'Your building team has been notified.', [
        { text: 'View requests', onPress: () => router.replace('/(tabs)/bookings') },
      ]);
    } catch (error) {
      Alert.alert('Could not submit request', error.message || 'Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Report an issue</Text>
        <Text style={styles.subtitle}>Flat {userProfile?.unitNumber || '—'} · {userProfile?.buildingName || 'Your building'}</Text>

        <Text style={styles.label}>What needs attention?</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const active = category === item.key;
            return (
              <TouchableOpacity key={item.key} style={[styles.category, active && styles.categoryActive]} onPress={() => setCategory(item.key)}>
                <Ionicons name={item.icon} size={19} color={active ? COLORS.white : COLORS.primary} />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Describe the problem</Text>
        <TextInput
          style={styles.description}
          placeholder="Where is it, and what happened?"
          placeholderTextColor={COLORS.gray}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.characterCount}>{description.length}/1000</Text>

        <View style={styles.photoHeading}>
          <Text style={styles.label}>Photos</Text>
          <Text style={styles.photoLimit}>{photos.length}/4</Text>
        </View>
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.photoButton} onPress={() => addPhotos('camera')} disabled={photos.length >= 4}>
            <Ionicons name="camera-outline" size={19} color={COLORS.primary} />
            <Text style={styles.photoButtonText}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={() => addPhotos('library')} disabled={photos.length >= 4}>
            <Ionicons name="images-outline" size={19} color={COLORS.primary} />
            <Text style={styles.photoButtonText}>Choose photos</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.previewWrap}>
                <Image source={{ uri: photo.uri }} style={styles.preview} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}>
                  <Ionicons name="close" size={15} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={19} color={COLORS.primary} />
          <Text style={styles.noteText}>Available technicians will be offered this request. If nobody accepts within 30 minutes, management will be notified to assign it.</Text>
        </View>

        <TouchableOpacity style={[styles.submitButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.white} /> : <><Text style={styles.submitText}>Submit request</Text><Ionicons name="arrow-forward" size={18} color={COLORS.white} /></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 34 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: COLORS.textLight, fontSize: 13, marginTop: 5, marginBottom: 24 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 22 },
  category: { width: '48%', minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  categoryActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  categoryTextActive: { color: COLORS.white },
  description: { minHeight: 132, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 15, lineHeight: 21 },
  characterCount: { alignSelf: 'flex-end', color: COLORS.textLight, fontSize: 11, marginTop: 5, marginBottom: 20 },
  photoHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoLimit: { color: COLORS.textLight, fontSize: 12, marginBottom: 10 },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoButton: { flex: 1, minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  photoButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  previewRow: { marginTop: 12 },
  previewWrap: { marginRight: 10, position: 'relative' },
  preview: { width: 76, height: 76, borderRadius: 10, backgroundColor: COLORS.lightGray },
  removePhoto: { position: 'absolute', top: 4, right: 4, width: 23, height: 23, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 11, backgroundColor: `${COLORS.primary}10`, marginTop: 20 },
  noteText: { color: COLORS.darkGray, flex: 1, fontSize: 12, lineHeight: 18 },
  submitButton: { minHeight: 52, borderRadius: 12, marginTop: 20, paddingHorizontal: 18, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  disabled: { opacity: 0.6 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
});
