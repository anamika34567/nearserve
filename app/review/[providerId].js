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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { addReview } from '../../services/reviewService';
import StarRating from '../../components/StarRating';
import { COLORS } from '../../constants';

export default function ReviewScreen() {
  const { providerId } = useLocalSearchParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please log in to submit a review');
      return;
    }

    setLoading(true);
    try {
      await addReview(
        providerId,
        user.uid,
        userProfile?.name || user.displayName || 'Anonymous',
        rating,
        comment
      );
      Alert.alert('Success', 'Your review has been submitted!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Write a Review</Text>
        <Text style={styles.subtitle}>How was your experience?</Text>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Tap to rate</Text>
          <StarRating rating={rating} size={40} editable onRatingChange={setRating} />
          <Text style={styles.ratingValue}>
            {rating > 0 ? `${rating}/5` : 'No rating selected'}
          </Text>
        </View>

        <Text style={styles.commentLabel}>Your Review (optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Tell others about your experience..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          placeholderTextColor={COLORS.gray}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 6,
    marginBottom: 30,
  },
  ratingSection: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingLabel: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginTop: 10,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  commentInput: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    marginBottom: 24,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
