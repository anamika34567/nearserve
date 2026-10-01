import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from './StarRating';
import { COLORS } from '../constants';

export default function ReviewItem({ review }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={COLORS.white} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{review.userName}</Text>
          <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  comment: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 10,
    lineHeight: 20,
  },
});
