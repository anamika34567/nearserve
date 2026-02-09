import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getProviderById } from '../../services/providerService';
import { getReviewsByProvider } from '../../services/reviewService';
import { createBooking } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import StarRating from '../../components/StarRating';
import ReviewItem from '../../components/ReviewItem';
import { COLORS, CATEGORY_ICONS } from '../../constants';

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { location } = useLocation();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [providerData, reviewsData] = await Promise.all([
        getProviderById(id),
        getReviewsByProvider(id),
      ]);
      setProvider(providerData);
      setReviews(reviewsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`);
    }
  };

  const handleMessage = () => {
    if (provider?.phone) {
      Linking.openURL(`sms:${provider.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (provider?.phone) {
      const phone = provider.phone.replace('+', '');
      Linking.openURL(`https://wa.me/${phone}`);
    }
  };

  const handleBookNow = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to book a service');
      return;
    }
    setBooking(true);
    try {
      const lat = location?.latitude || 17.3850;
      const lng = location?.longitude || 78.4867;
      await createBooking(user.uid, id, lat, lng);
      Alert.alert(
        'Booking Confirmed!',
        `${provider.name} has been notified. They will be on their way soon!`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color={COLORS.gray} />
        <Text style={styles.errorText}>Provider not found</Text>
      </View>
    );
  }

  const catColor = provider.category === 'plumber' ? COLORS.plumber : COLORS.electrician;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: catColor + '12' }]}>
              <Ionicons
                name={CATEGORY_ICONS[provider.category] || 'construct'}
                size={40}
                color={catColor}
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color={COLORS.white} />
              </View>
            </View>
            <Text style={styles.providerName}>{provider.name}</Text>
            <View style={[styles.catPill, { backgroundColor: catColor + '12' }]}>
              <Ionicons name={CATEGORY_ICONS[provider.category]} size={12} color={catColor} />
              <Text style={[styles.catPillText, { color: catColor }]}>
                {provider.category?.charAt(0).toUpperCase() + provider.category?.slice(1)}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="star" size={20} color={COLORS.secondary} />
              <Text style={styles.statValue}>{provider.rating || 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{provider.reviewCount || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="cash" size={20} color={COLORS.success} />
              <Text style={styles.statValue}>Rs.{provider.hourlyRate || 0}</Text>
              <Text style={styles.statLabel}>Per Hour</Text>
            </View>
          </View>
        </View>

        {/* Quick Contact Buttons */}
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
            <View style={[styles.contactIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="call" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.contactLabel}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={handleMessage}>
            <View style={[styles.contactIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="chatbubble" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.contactLabel}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={handleWhatsApp}>
            <View style={[styles.contactIcon, { backgroundColor: '#25D366' + '15' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <Text style={styles.contactLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={() => router.push(`/review/${id}`)}>
            <View style={[styles.contactIcon, { backgroundColor: COLORS.secondary + '15' }]}>
              <Ionicons name="star" size={22} color={COLORS.secondary} />
            </View>
            <Text style={styles.contactLabel}>Rate</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        {provider.bio ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.bioText}>{provider.bio}</Text>
          </View>
        ) : null}

        {/* Service Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Service Info</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.infoText}>Available 24/7</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.infoText}>Verified Professional</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.infoText}>Serves within 50km</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="card-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.infoText}>Cash & Online Payment</Text>
            </View>
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          </View>
          {reviews.length > 0 ? (
            reviews.map((review) => <ReviewItem key={review.id} review={review} />)
          ) : (
            <View style={styles.noReviewsBox}>
              <Ionicons name="chatbubble-outline" size={36} color={COLORS.gray} />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <TouchableOpacity
                style={styles.firstReviewBtn}
                onPress={() => router.push(`/review/${id}`)}
              >
                <Text style={styles.firstReviewBtnText}>Be the first to review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Book Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Price</Text>
          <Text style={styles.bottomPriceValue}>Rs.{provider.hourlyRate || 0}<Text style={styles.bottomPriceUnit}>/hr</Text></Text>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, booking && { opacity: 0.7 }]}
          onPress={handleBookNow}
          disabled={booking}
          activeOpacity={0.8}
        >
          {booking ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="flash" size={20} color={COLORS.white} />
              <Text style={styles.bookButtonText}>Book Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // Profile Card
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 22,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  providerName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  catPillText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    paddingVertical: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },

  // Contact Row
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactBtn: {
    alignItems: 'center',
    gap: 6,
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Section
  section: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.darkGray,
  },

  // Info Grid
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '500',
  },

  // No Reviews
  noReviewsBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noReviewsText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  firstReviewBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '12',
    marginTop: 4,
  },
  firstReviewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  bottomPriceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  bottomPriceUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
