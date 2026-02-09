import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import StarRating from './StarRating';
import { COLORS, CATEGORY_ICONS } from '../constants';

export default function ProviderCard({ provider }) {
  const router = useRouter();

  const getCategoryColor = () => {
    return provider.category === 'plumber' ? COLORS.plumber : COLORS.electrician;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/provider/${provider.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getCategoryColor() + '20' }]}>
        <Ionicons
          name={CATEGORY_ICONS[provider.category] || 'construct'}
          size={30}
          color={getCategoryColor()}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{provider.name}</Text>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor() + '20' }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor() }]}>
              {provider.category?.charAt(0).toUpperCase() + provider.category?.slice(1)}
            </Text>
          </View>
          {provider.distance !== undefined && (
            <Text style={styles.distance}>{provider.distance} km away</Text>
          )}
        </View>
        <View style={styles.ratingRow}>
          <StarRating rating={provider.rating || 0} size={16} />
          <Text style={styles.ratingText}>
            {provider.rating || 0} ({provider.reviewCount || 0})
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  distance: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});
