import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '../../context/LocationContext';
import { getNearbyProviders } from '../../services/providerService';
import StarRating from '../../components/StarRating';
import { COLORS, CATEGORY_ICONS } from '../../constants';

export default function ProvidersScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const [providers, setProviders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProviders();
  }, [location, selectedCategory]);

  useEffect(() => {
    let result = [...providers];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category.includes(q)
      );
    }

    // Sort
    if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price') {
      result.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (sortBy === 'distance') {
      result.sort((a, b) => a.distance - b.distance);
    }

    setFiltered(result);
  }, [providers, searchQuery, sortBy]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const lat = location?.latitude || 17.3850;
      const lng = location?.longitude || 78.4867;
      const data = await getNearbyProviders(
        lat, lng, 50,
        selectedCategory === 'all' ? null : selectedCategory
      );
      setProviders(data);
    } catch (error) {
      console.log('Error fetching providers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviders();
  };

  const getCatColor = (cat) => cat === 'plumber' ? COLORS.plumber : COLORS.electrician;

  const filters = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'plumber', label: 'Plumber', icon: 'water' },
    { key: 'electrician', label: 'Electrician', icon: 'flash' },
  ];

  const sortOptions = [
    { key: 'rating', label: 'Top Rated', icon: 'star' },
    { key: 'price', label: 'Lowest Price', icon: 'cash-outline' },
    { key: 'distance', label: 'Nearest', icon: 'location-outline' },
  ];

  const renderHeader = () => (
    <View>
      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = selectedCategory === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedCategory(f.key)}
            >
              <Ionicons
                name={f.icon}
                size={16}
                color={active ? COLORS.white : COLORS.primary}
              />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sort Options */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {sortOptions.map((s) => {
          const active = sortBy === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => setSortBy(s.key)}
            >
              <Ionicons
                name={s.icon}
                size={13}
                color={active ? COLORS.white : COLORS.textLight}
              />
              <Text style={[styles.sortText, active && styles.sortTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>{filtered.length} providers found</Text>
      </View>
    </View>
  );

  const renderCard = ({ item }) => {
    const catColor = getCatColor(item.category);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/provider/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          {/* Avatar */}
          <View style={[styles.cardAvatar, { backgroundColor: catColor + '10' }]}>
            <Ionicons
              name={CATEGORY_ICONS[item.category] || 'construct'}
              size={30}
              color={catColor}
            />
            <View style={[styles.statusDot, {
              backgroundColor: item.available ? COLORS.success : COLORS.gray
            }]} />
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.cardMetaRow}>
              <View style={[styles.catTag, { backgroundColor: catColor + '10' }]}>
                <Text style={[styles.catTagText, { color: catColor }]}>
                  {item.category?.charAt(0).toUpperCase() + item.category?.slice(1)}
                </Text>
              </View>
              <View style={styles.distTag}>
                <Ionicons name="location" size={11} color={COLORS.textLight} />
                <Text style={styles.distText}>{item.distance} km</Text>
              </View>
            </View>
          </View>

          {/* Price */}
          <View style={styles.cardPrice}>
            <Text style={styles.priceValue}>Rs.{item.hourlyRate}</Text>
            <Text style={styles.priceUnit}>/hr</Text>
          </View>
        </View>

        {/* Bottom Row */}
        <View style={styles.cardBottom}>
          <View style={styles.ratingSection}>
            <StarRating rating={item.rating || 0} size={14} />
            <Text style={styles.ratingNum}>{item.rating}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount} reviews)</Text>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: COLORS.success + '12' }]}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}
            >
              <Ionicons name="call" size={16} color={COLORS.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: COLORS.primary + '12' }]}
              onPress={() => Linking.openURL(`sms:${item.phone}`)}
            >
              <Ionicons name="chatbubble" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#25D366' + '12' }]}
              onPress={() => {
                const phone = item.phone.replace('+', '');
                Linking.openURL(`https://wa.me/${phone}`);
              }}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && providers.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading providers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyCircle}>
              <Ionicons name="search-outline" size={40} color={COLORS.gray} />
            </View>
            <Text style={styles.emptyTitle}>No providers found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or search query
            </Text>
          </View>
        }
      />
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  listContent: {
    paddingBottom: 24,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 10,
    fontWeight: '500',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterTextActive: {
    color: COLORS.white,
  },

  // Sort
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 6,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginRight: 4,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  sortTextActive: {
    color: COLORS.white,
  },

  // Results
  resultsBar: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 5,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  distTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  cardPrice: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.success,
  },
  priceUnit: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: -2,
  },

  // Card Bottom
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 6,
  },
  quickBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
});
