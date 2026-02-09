import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { getNearbyProviders } from '../../services/providerService';
import StarRating from '../../components/StarRating';
import { COLORS, CATEGORY_ICONS } from '../../constants';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { location } = useLocation();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProviders();
  }, [location, selectedCategory]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProviders(providers);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredProviders(
        providers.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, providers]);

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
      setFilteredProviders(data);
    } catch (error) {
      console.log('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    return category === 'plumber' ? COLORS.plumber : COLORS.electrician;
  };

  const firstName = userProfile?.name?.split(' ')[0] || 'User';

  const filters = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'plumber', label: 'Plumber', icon: 'water' },
    { key: 'electrician', label: 'Electrician', icon: 'flash' },
  ];

  const renderHeader = () => (
    <View>
      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.heroBg1} />
        <View style={styles.heroBg2} />

        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreet}>Good {getGreeting()}</Text>
            <Text style={styles.heroName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plumber, electrician..."
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
      </View>

      {/* Category Cards */}
      <View style={styles.categorySection}>
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.categoryRow}>
          {filters.map((filter) => {
            const isActive = selectedCategory === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                onPress={() => setSelectedCategory(filter.key)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.categoryIconBox,
                  isActive && styles.categoryIconBoxActive,
                ]}>
                  <Ionicons
                    name={filter.icon}
                    size={24}
                    color={isActive ? COLORS.white : COLORS.primary}
                  />
                </View>
                <Text style={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                ]}>
                  {filter.label}
                </Text>
                {isActive && (
                  <View style={styles.categoryCheck}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <Ionicons name="people" size={18} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.quickStatNum}>{providers.length}</Text>
            <Text style={styles.quickStatLabel}>Total</Text>
          </View>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: COLORS.success + '15' }]}>
            <Ionicons name="star" size={18} color={COLORS.success} />
          </View>
          <View>
            <Text style={styles.quickStatNum}>
              {providers.length > 0
                ? (providers.reduce((s, p) => s + p.rating, 0) / providers.length).toFixed(1)
                : '0'}
            </Text>
            <Text style={styles.quickStatLabel}>Avg Rating</Text>
          </View>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatItem}>
          <View style={[styles.quickStatIcon, { backgroundColor: COLORS.secondary + '15' }]}>
            <Ionicons name="location" size={18} color={COLORS.secondary} />
          </View>
          <View>
            <Text style={styles.quickStatNum}>50km</Text>
            <Text style={styles.quickStatLabel}>Range</Text>
          </View>
        </View>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {searchQuery ? 'Search Results' : 'Top Rated Providers'}
        </Text>
        <Text style={styles.resultsCount}>{filteredProviders.length} found</Text>
      </View>
    </View>
  );

  const renderProviderCard = ({ item, index }) => {
    const catColor = getCategoryColor(item.category);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/provider/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Rank Badge */}
        {index < 3 && !searchQuery && (
          <View style={[styles.rankBadge, {
            backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
          }]}>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </View>
        )}

        <View style={styles.cardRow}>
          {/* Avatar */}
          <View style={[styles.cardAvatar, { backgroundColor: catColor + '12' }]}>
            <Ionicons
              name={CATEGORY_ICONS[item.category] || 'construct'}
              size={28}
              color={catColor}
            />
            <View style={[styles.onlineDot, {
              backgroundColor: item.available ? COLORS.success : COLORS.gray
            }]} />
          </View>

          {/* Info */}
          <View style={styles.cardBody}>
            <View style={styles.cardNameRow}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.catPill, { backgroundColor: catColor + '12' }]}>
                <Ionicons name={CATEGORY_ICONS[item.category]} size={10} color={catColor} />
                <Text style={[styles.catPillText, { color: catColor }]}>
                  {item.category?.charAt(0).toUpperCase() + item.category?.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.cardRatingRow}>
              <StarRating rating={item.rating || 0} size={14} />
              <Text style={styles.cardRatingNum}>{item.rating}</Text>
              <Text style={styles.cardReviewCount}>({item.reviewCount})</Text>
              <View style={styles.dotSep} />
              <Ionicons name="location-outline" size={13} color={COLORS.textLight} />
              <Text style={styles.cardDist}>{item.distance} km</Text>
            </View>

            {/* Bottom Row */}
            <View style={styles.cardBottom}>
              <View style={styles.priceBox}>
                <Text style={styles.priceSymbol}>Rs.</Text>
                <Text style={styles.priceAmount}>{item.hourlyRate}</Text>
                <Text style={styles.priceUnit}>/hr</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.cardActionBtn, { backgroundColor: COLORS.success + '15' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    Linking.openURL(`tel:${item.phone}`);
                  }}
                >
                  <Ionicons name="call" size={16} color={COLORS.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardActionBtn, { backgroundColor: COLORS.primary + '15' }]}
                  onPress={() => router.push(`/provider/${item.id}`)}
                >
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {loading && providers.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Finding providers near you...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item.id}
          renderItem={renderProviderCard}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={40} color={COLORS.gray} />
              </View>
              <Text style={styles.emptyTitle}>No providers found</Text>
              <Text style={styles.emptyText}>Try changing the filter or search query</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
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
  loadingBox: {
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  listContent: {
    paddingBottom: 24,
  },

  // ---- Hero ----
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroBg1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50,
    right: -40,
  },
  heroBg2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: -20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroGreet: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  heroName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 10,
    fontWeight: '500',
  },

  // ---- Categories ----
  categorySection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: 'relative',
  },
  categoryCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryIconBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryLabelActive: {
    color: COLORS.white,
  },
  categoryCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Quick Stats ----
  quickStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },

  // ---- Results ----
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultsCount: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // ---- Provider Card ----
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: -6,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  cardRow: {
    flexDirection: 'row',
  },
  cardAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cardBody: {
    flex: 1,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardRatingNum: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 5,
  },
  cardReviewCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 2,
  },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gray,
    marginHorizontal: 8,
  },
  cardDist: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 3,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceSymbol: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.success,
  },
  priceUnit: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Empty ----
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 40,
  },
  emptyIcon: {
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
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
});
