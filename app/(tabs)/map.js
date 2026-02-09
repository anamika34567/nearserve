import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '../../context/LocationContext';
import { getNearbyProviders } from '../../services/providerService';
import StarRating from '../../components/StarRating';
import { COLORS, CATEGORY_ICONS } from '../../constants';

export default function MapScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const userLat = location?.latitude || 17.385;
  const userLng = location?.longitude || 78.4867;

  useEffect(() => {
    fetchProviders();
  }, [location, selectedCategory]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await getNearbyProviders(
        userLat, userLng, 50,
        selectedCategory === 'all' ? null : selectedCategory
      );
      setProviders(data);
    } catch (error) {
      console.log('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (category) => {
    return category === 'plumber' ? '#2196F3' : '#FF9800';
  };

  const openInMaps = (provider) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${provider.name}@${provider.latitude},${provider.longitude}`,
      android: `geo:${provider.latitude},${provider.longitude}?q=${provider.latitude},${provider.longitude}(${provider.name})`,
    });
    Linking.openURL(url);
  };

  const openDirections = (provider) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${provider.latitude},${provider.longitude}`;
    Linking.openURL(url);
  };

  const filters = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'plumber', label: 'Plumber', icon: 'water' },
    { key: 'electrician', label: 'Electrician', icon: 'flash' },
  ];

  const renderProvider = ({ item }) => {
    const catColor = getMarkerColor(item.category);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/provider/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          {/* Avatar with location pin */}
          <View style={styles.cardLeft}>
            <View style={[styles.cardAvatar, { backgroundColor: catColor + '15' }]}>
              <Ionicons
                name={CATEGORY_ICONS[item.category] || 'construct'}
                size={26}
                color={catColor}
              />
            </View>
            <View style={[styles.distBadge, { backgroundColor: catColor }]}>
              <Text style={styles.distBadgeText}>{item.distance} km</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>

            <View style={styles.cardMeta}>
              <View style={[styles.catBadge, { backgroundColor: catColor + '15' }]}>
                <Ionicons name={CATEGORY_ICONS[item.category]} size={10} color={catColor} />
                <Text style={[styles.catBadgeText, { color: catColor }]}>
                  {item.category?.charAt(0).toUpperCase() + item.category?.slice(1)}
                </Text>
              </View>
              <StarRating rating={item.rating || 0} size={12} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>

            <View style={styles.cardBottom}>
              <Text style={styles.priceText}>Rs.{item.hourlyRate}/hr</Text>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons name="call" size={14} color={COLORS.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => Linking.openURL(`https://wa.me/${item.phone?.replace('+', '')}`)}
                >
                  <Ionicons name="logo-whatsapp" size={14} color={COLORS.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: catColor }]}
                  onPress={() => openInMaps(item)}
                >
                  <Ionicons name="navigate" size={14} color={COLORS.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                  onPress={() => openDirections(item)}
                >
                  <Ionicons name="map" size={14} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Your Location */}
      <View style={styles.locationBar}>
        <View style={styles.locationDot} />
        <View>
          <Text style={styles.locationLabel}>Your Location</Text>
          <Text style={styles.locationCoords}>
            {userLat.toFixed(4)}, {userLng.toFixed(4)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.openMapBtn}
          onPress={() => {
            const url = `https://www.google.com/maps/@${userLat},${userLng},14z`;
            Linking.openURL(url);
          }}
        >
          <Ionicons name="open-outline" size={16} color={COLORS.primary} />
          <Text style={styles.openMapText}>Open Map</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((filter) => {
          const isActive = selectedCategory === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedCategory(filter.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={filter.icon}
                size={16}
                color={isActive ? COLORS.white : COLORS.primary}
              />
              <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsTitle}>Providers Near You</Text>
        <Text style={styles.resultsCount}>{providers.length} found</Text>
      </View>
    </View>
  );

  if (loading && providers.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding providers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={providers}
        keyExtractor={(item) => item.id}
        renderItem={renderProvider}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={40} color={COLORS.gray} />
            </View>
            <Text style={styles.emptyTitle}>No providers nearby</Text>
            <Text style={styles.emptyText}>
              Go to Profile and tap "Add Demo Providers" to add sample data
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textLight,
  },
  listContent: {
    paddingBottom: 24,
  },

  // Location Bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.success + '40',
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  locationCoords: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  openMapText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterLabelActive: {
    color: COLORS.white,
  },

  // Results
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
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

  // Provider Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
  },
  cardLeft: {
    marginRight: 12,
    alignItems: 'center',
  },
  cardAvatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
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
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.success,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
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
