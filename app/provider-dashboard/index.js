import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  StatusBar,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import {
  getProviderByUserId,
  toggleProviderAvailability,
  updateProviderProfile,
} from '../../services/providerService';
import {
  getProviderBookings,
  updateBookingStatus,
  getProviderEarnings,
  updateProviderLocationInBooking,
} from '../../services/bookingService';
import { getUserProfile } from '../../services/authService';
import { COLORS, BOOKING_STATUS } from '../../constants';

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [provider, setProvider] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState({ totalEarnings: 0, completedBookings: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings');
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const providerData = await getProviderByUserId(user.uid);
      if (providerData) {
        setProvider(providerData);
        const [bookingsData, earningsData] = await Promise.all([
          getProviderBookings(providerData.id),
          getProviderEarnings(providerData.id),
        ]);
        setBookings(bookingsData);
        setEarnings(earningsData);
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleAvailability = async (value) => {
    if (!provider) return;
    try {
      await toggleProviderAvailability(provider.id, value);
      setProvider((prev) => ({ ...prev, available: value }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleUpdateLocation = () => {
    if (!provider) return;
    Alert.alert('Update Location', 'How do you want to set your location?', [
      {
        text: 'Use Current GPS',
        onPress: async () => {
          try {
            setUpdatingLocation(true);
            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Location permission is required.');
              return;
            }
            const location = await ExpoLocation.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            await updateProviderProfile(provider.id, { latitude, longitude });
            setCurrentCoords({ latitude, longitude });
            Alert.alert('Success', `Location updated!\nLat: ${latitude.toFixed(4)}\nLng: ${longitude.toFixed(4)}`);
          } catch (error) {
            Alert.alert('Error', 'Failed to get location.');
          } finally {
            setUpdatingLocation(false);
          }
        },
      },
      {
        text: 'Enter Manually',
        onPress: () => {
          setManualLat(String(provider.latitude || ''));
          setManualLng(String(provider.longitude || ''));
          setShowLocationModal(true);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleChangeRate = () => {
    setNewRate(String(provider?.hourlyRate || 300));
    setShowRateModal(true);
  };

  const handleBookingAction = async (bookingId, status, userId) => {
    const actionName = status === BOOKING_STATUS.ACCEPTED ? 'Accept' : status === BOOKING_STATUS.REJECTED ? 'Reject' : status;
    Alert.alert(`${actionName} Booking`, `Are you sure?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionName,
        onPress: async () => {
          try {
            await updateBookingStatus(bookingId, status, userId);
            // When going en_route, save provider's current GPS to booking
            if (status === BOOKING_STATUS.EN_ROUTE && provider) {
              try {
                const { status: perm } = await ExpoLocation.requestForegroundPermissionsAsync();
                if (perm === 'granted') {
                  const loc = await ExpoLocation.getCurrentPositionAsync({});
                  await updateProviderLocationInBooking(bookingId, loc.coords.latitude, loc.coords.longitude);
                }
              } catch (e) {
                // Use provider's saved location as fallback
                if (provider.latitude && provider.longitude) {
                  await updateProviderLocationInBooking(bookingId, provider.latitude, provider.longitude);
                }
              }
            }
            Alert.alert('Done', `Booking ${status}.`);
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to update booking');
          }
        },
      },
    ]);
  };

  const openCustomerInMaps = (booking) => {
    if (!booking.userLat || !booking.userLng) {
      Alert.alert('Error', 'Customer location not available');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.userLat},${booking.userLng}`;
    Linking.openURL(url);
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
        <Ionicons name="briefcase-outline" size={60} color={COLORS.gray} />
        <Text style={styles.emptyTitle}>No Provider Profile</Text>
        <Text style={styles.emptyText}>
          You don't have a provider profile yet. Register as a provider to access this dashboard.
        </Text>
      </View>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === BOOKING_STATUS.REQUESTED);
  const activeBookings = bookings.filter((b) =>
    [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.ARRIVED].includes(b.status)
  );
  const completedBookings = bookings.filter((b) => b.status === BOOKING_STATUS.COMPLETED);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Pending Verification Banner */}
      {!provider.isVerified && (
        <View style={styles.verifyBanner}>
          <Ionicons name="alert-circle" size={22} color={COLORS.warning} />
          <View style={styles.verifyBannerText}>
            <Text style={styles.verifyBannerTitle}>Pending Verification</Text>
            <Text style={styles.verifyBannerSub}>
              Your profile is under review. You won't appear in search results until an admin verifies you.
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{provider.name}</Text>
            <Text style={styles.headerSub}>
              {provider.category?.charAt(0).toUpperCase() + provider.category?.slice(1)}
              {provider.isVerified ? ' | Verified' : ' | Not Verified'}
            </Text>
          </View>
          <View style={styles.availabilityToggle}>
            <Text style={styles.availLabel}>
              {provider.available ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={provider.available}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: COLORS.gray, true: COLORS.success }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={handleUpdateLocation}
            disabled={updatingLocation}
          >
            {updatingLocation ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="location" size={16} color={COLORS.white} />
                <Text style={styles.locationBtnText}>Update Location</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationBtn}
            onPress={handleChangeRate}
          >
            <Ionicons name="cash" size={16} color={COLORS.white} />
            <Text style={styles.locationBtnText}>Rs.{provider.hourlyRate}/{provider.category === 'autorickshaw' ? 'km' : 'hr'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNum}>{pendingBookings.length}</Text>
            <Text style={styles.quickStatLabel}>Pending</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNum}>{activeBookings.length}</Text>
            <Text style={styles.quickStatLabel}>Active</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNum}>{completedBookings.length}</Text>
            <Text style={styles.quickStatLabel}>Done</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNum}>{provider.rating || 0}</Text>
            <Text style={styles.quickStatLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {['bookings', 'earnings'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'bookings' ? 'calendar' : 'wallet'}
              size={18}
              color={activeTab === tab ? COLORS.primary : COLORS.gray}
            />
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <View>
            {/* Pending Bookings */}
            {pendingBookings.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>
                  Pending Requests ({pendingBookings.length})
                </Text>
                {pendingBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onAccept={() => handleBookingAction(booking.id, BOOKING_STATUS.ACCEPTED, booking.userId)}
                    onReject={() => handleBookingAction(booking.id, BOOKING_STATUS.REJECTED, booking.userId)}
                    showActions
                  />
                ))}
              </View>
            )}

            {/* Active Bookings */}
            {activeBookings.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Active ({activeBookings.length})</Text>
                {activeBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onEnRoute={() => handleBookingAction(booking.id, BOOKING_STATUS.EN_ROUTE, booking.userId)}
                    onArrived={() => handleBookingAction(booking.id, BOOKING_STATUS.ARRIVED, booking.userId)}
                    onComplete={() => handleBookingAction(booking.id, BOOKING_STATUS.COMPLETED, booking.userId)}
                    onViewMaps={() => openCustomerInMaps(booking)}
                    showStatusButtons
                  />
                ))}
              </View>
            )}

            {/* Recent */}
            <Text style={styles.sectionTitle}>All Bookings ({bookings.length})</Text>
            {bookings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={40} color={COLORS.gray} />
                <Text style={styles.emptyBoxText}>No bookings yet</Text>
              </View>
            ) : (
              bookings.slice(0, 20).map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </View>
        )}

        {/* EARNINGS TAB */}
        {activeTab === 'earnings' && (
          <View>
            <View style={styles.earningsCard}>
              <Ionicons name="wallet" size={36} color={COLORS.success} />
              <Text style={styles.earningsAmount}>Rs.{earnings.totalEarnings}</Text>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsSub}>
                From {earnings.completedBookings} completed bookings
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Completed Bookings</Text>
            {earnings.bookings && earnings.bookings.length > 0 ? (
              earnings.bookings.map((b) => (
                <View key={b.id} style={styles.earningItem}>
                  <View>
                    <Text style={styles.earningDate}>
                      {new Date(b.completedAt || b.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.earningMeta}>{b.locationAddress || 'Service'}</Text>
                  </View>
                  <Text style={styles.earningAmount}>Rs.{b.amount || 0}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>No earnings yet</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Location Manual Entry Modal */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Location</Text>
            <Text style={styles.modalHint}>Enter latitude and longitude coordinates</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 10 }]}
              placeholder="Latitude (e.g. 8.881)"
              placeholderTextColor={COLORS.gray}
              keyboardType="decimal-pad"
              value={manualLat}
              onChangeText={setManualLat}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Longitude (e.g. 76.614)"
              placeholderTextColor={COLORS.gray}
              keyboardType="decimal-pad"
              value={manualLng}
              onChangeText={setManualLng}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowLocationModal(false); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={async () => {
                  const lat = parseFloat(manualLat);
                  const lng = parseFloat(manualLng);
                  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    Alert.alert('Error', 'Enter valid coordinates.\nLatitude: -90 to 90\nLongitude: -180 to 180');
                    return;
                  }
                  try {
                    await updateProviderProfile(provider.id, { latitude: lat, longitude: lng });
                    setCurrentCoords({ latitude: lat, longitude: lng });
                    Alert.alert('Success', `Location updated!\nLat: ${lat}\nLng: ${lng}`);
                  } catch (e) {
                    Alert.alert('Error', 'Failed to update location');
                  }
                  setShowLocationModal(false);
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rate Change Modal (Android) */}
      <Modal visible={showRateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Hourly Rate</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new rate (Rs.)"
              placeholderTextColor={COLORS.gray}
              keyboardType="number-pad"
              value={newRate}
              onChangeText={setNewRate}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowRateModal(false); setNewRate(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={async () => {
                  const rate = parseInt(newRate);
                  if (isNaN(rate) || rate <= 0) {
                    Alert.alert('Error', 'Enter a valid rate');
                    return;
                  }
                  try {
                    await updateProviderProfile(provider.id, { hourlyRate: rate });
                    setProvider((prev) => ({ ...prev, hourlyRate: rate }));
                    Alert.alert('Success', `Rate updated to Rs.${rate}/hr`);
                  } catch (e) {
                    Alert.alert('Error', 'Failed to update rate');
                  }
                  setShowRateModal(false);
                  setNewRate('');
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BookingCard({ booking, onAccept, onReject, onEnRoute, onArrived, onComplete, onViewMaps, showActions, showStatusButtons }) {
  const statusColors = {
    requested: COLORS.warning,
    accepted: COLORS.primary,
    rejected: COLORS.danger,
    en_route: COLORS.secondary,
    arrived: COLORS.success,
    completed: COLORS.success,
    cancelled: COLORS.danger,
  };

  const color = statusColors[booking.status] || COLORS.gray;

  return (
    <View style={[styles.bookingCard, { borderLeftColor: color }]}>
      <View style={styles.bookingRow}>
        <View style={[styles.bookingStatusDot, { backgroundColor: color }]} />
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingStatus}>
            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1).replace('_', ' ')}
          </Text>
          <Text style={styles.bookingDate}>
            {new Date(booking.createdAt).toLocaleString()}
          </Text>
          {booking.amount > 0 && (
            <Text style={styles.bookingAmount}>Rs.{booking.amount}</Text>
          )}
          {booking.locationAddress ? (
            <Text style={styles.bookingAddress}>{booking.locationAddress}</Text>
          ) : null}
        </View>
      </View>

      {showActions && (
        <View style={styles.bookingActions}>
          <TouchableOpacity
            style={[styles.bookingActionBtn, { backgroundColor: COLORS.success }]}
            onPress={onAccept}
          >
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
            <Text style={styles.bookingActionText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookingActionBtn, { backgroundColor: COLORS.danger }]}
            onPress={onReject}
          >
            <Ionicons name="close" size={18} color={COLORS.white} />
            <Text style={styles.bookingActionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {showStatusButtons && (
        <View>
          <View style={styles.bookingActions}>
            {booking.status === BOOKING_STATUS.ACCEPTED && (
              <TouchableOpacity
                style={[styles.bookingActionBtn, { backgroundColor: COLORS.secondary }]}
                onPress={onEnRoute}
              >
                <Ionicons name="navigate" size={18} color={COLORS.white} />
                <Text style={styles.bookingActionText}>On My Way</Text>
              </TouchableOpacity>
            )}
            {booking.status === BOOKING_STATUS.EN_ROUTE && (
              <TouchableOpacity
                style={[styles.bookingActionBtn, { backgroundColor: COLORS.primary }]}
                onPress={onArrived}
              >
                <Ionicons name="location" size={18} color={COLORS.white} />
                <Text style={styles.bookingActionText}>I've Arrived</Text>
              </TouchableOpacity>
            )}
            {booking.status === BOOKING_STATUS.ARRIVED && (
              <TouchableOpacity
                style={[styles.bookingActionBtn, { backgroundColor: COLORS.success }]}
                onPress={onComplete}
              >
                <Ionicons name="checkmark-done" size={18} color={COLORS.white} />
                <Text style={styles.bookingActionText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Navigate to customer location */}
          {onViewMaps && (booking.status === BOOKING_STATUS.EN_ROUTE || booking.status === BOOKING_STATUS.ACCEPTED) && (
            <View style={[styles.bookingActions, { marginTop: 8 }]}>
              <TouchableOpacity
                style={[styles.bookingActionBtn, { backgroundColor: '#1A73E8' }]}
                onPress={onViewMaps}
              >
                <Ionicons name="navigate" size={18} color={COLORS.white} />
                <Text style={styles.bookingActionText}>Navigate to Customer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  availabilityToggle: {
    alignItems: 'center',
  },
  availLabel: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    marginBottom: 4,
  },

  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  locationBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  coordsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },

  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 12,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  quickStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '12',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },

  // Booking Card
  bookingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingStatus: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  bookingDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  bookingAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 2,
  },
  bookingAddress: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  bookingActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookingActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Earnings
  earningsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.success,
    marginTop: 8,
  },
  earningsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  earningsSub: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  earningDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  earningMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.success,
  },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyBoxText: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  // Header Actions row
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  modalHint: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Verification Banner
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  verifyBannerText: {
    flex: 1,
  },
  verifyBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.warning,
  },
  verifyBannerSub: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
