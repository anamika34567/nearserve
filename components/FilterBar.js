import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

const filters = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'plumber', label: 'Plumber', icon: 'water' },
  { key: 'electrician', label: 'Electrician', icon: 'flash' },
];

export default function FilterBar({ selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[styles.chip, selected === filter.key && styles.chipActive]}
          onPress={() => onSelect(filter.key)}
        >
          <Ionicons
            name={filter.icon}
            size={16}
            color={selected === filter.key ? COLORS.white : COLORS.primary}
          />
          <Text style={[styles.chipText, selected === filter.key && styles.chipTextActive]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
