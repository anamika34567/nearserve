import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { addComplaint } from '../services/adminService';
import { getProviders } from '../services/providerService';
import { COLORS } from '../constants';

export default function ComplaintScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await getProviders();
      setProviders(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }

    setSubmitting(true);
    try {
      await addComplaint({
        userId: user.uid,
        userName: userProfile?.name || user.email,
        userEmail: user.email,
        providerId: selectedProvider?.id || '',
        providerName: selectedProvider?.name || 'General',
        subject: subject.trim(),
        description: description.trim(),
      });
      Alert.alert('Submitted', 'Your complaint has been submitted. Admin will review it shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Report any issue with a service provider. Admin will review and take action.
          </Text>
        </View>

        {/* Select Provider */}
        <Text style={styles.label}>Select Provider (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
          <TouchableOpacity
            style={[styles.providerChip, !selectedProvider && styles.providerChipActive]}
            onPress={() => setSelectedProvider(null)}
          >
            <Text style={[styles.providerChipText, !selectedProvider && styles.providerChipTextActive]}>
              General
            </Text>
          </TouchableOpacity>
          {providers.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.providerChip, selectedProvider?.id === p.id && styles.providerChipActive]}
              onPress={() => setSelectedProvider(p)}
            >
              <Text style={[styles.providerChipText, selectedProvider?.id === p.id && styles.providerChipTextActive]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subject */}
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Late arrival, Poor service, Overcharging"
          value={subject}
          onChangeText={setSubject}
          placeholderTextColor={COLORS.gray}
        />

        {/* Description */}
        <Text style={styles.label}>Describe the Issue</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Explain what happened in detail..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          placeholderTextColor={COLORS.gray}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={COLORS.white} />
              <Text style={styles.submitText}>Submit Complaint</Text>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: '#E91E63',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  providerScroll: {
    marginBottom: 8,
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerChipActive: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  providerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  providerChipTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 140,
  },
  submitBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
