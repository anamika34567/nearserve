import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export default function StarRating({ rating = 0, size = 20, editable = false, onRatingChange }) {
  const stars = [1, 2, 3, 4, 5];

  const handlePress = (star) => {
    if (editable && onRatingChange) {
      onRatingChange(star);
    }
  };

  return (
    <View style={styles.container}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={!editable}
          activeOpacity={editable ? 0.6 : 1}
        >
          <Ionicons
            name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={size}
            color={COLORS.secondary}
            style={styles.star}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
});
