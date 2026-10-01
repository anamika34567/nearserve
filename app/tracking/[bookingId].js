import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { listenToBooking, updateProviderLocationInBooking } from '../../services/bookingService';
import { getProviderById } from '../../services/providerService';
import * as ExpoLocation from 'expo-location';
import { COLORS, BOOKING_STATUS } from '../../constants';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.55;

const STATUS_STEPS = [
  { key: BOOKING_STATUS.REQUESTED, label: 'Requested', icon: 'time-outline' },
  { key: BOOKING_STATUS.ACCEPTED, label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: BOOKING_STATUS.EN_ROUTE, label: 'En Route', icon: 'car-outline' },
  { key: BOOKING_STATUS.ARRIVED, label: 'Arrived', icon: 'location-outline' },
  { key: BOOKING_STATUS.COMPLETED, label: 'Completed', icon: 'trophy-outline' },
];

const getStatusIndex = (status) => {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
};

const getStatusMessage = (status) => {
  switch (status) {
    case BOOKING_STATUS.REQUESTED:
      return 'Waiting for provider to accept...';
    case BOOKING_STATUS.ACCEPTED:
      return 'Provider accepted! Getting ready...';
    case BOOKING_STATUS.EN_ROUTE:
      return 'Provider is on the way to you!';
    case BOOKING_STATUS.ARRIVED:
      return 'Provider has arrived!';
    case BOOKING_STATUS.COMPLETED:
      return 'Service completed!';
    case BOOKING_STATUS.CANCELLED:
      return 'Booking was cancelled.';
    case BOOKING_STATUS.REJECTED:
      return 'Booking was rejected.';
    default:
      return 'Tracking your booking...';
  }
};

export default function TrackingScreen() {
  const { bookingId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = listenToBooking(bookingId, async (bookingData) => {
      setBooking(bookingData);

      if (bookingData.providerId && !provider) {
        try {
          const providerData = await getProviderById(bookingData.providerId);
          setProvider(providerData);
        } catch (err) {
          console.log('Error fetching provider:', err);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId]);

  const handleCallProvider = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`);
    } else {
      Alert.alert('Unavailable', 'Provider phone number is not available.');
    }
  };

  const handleChat = () => {
    router.push(`/chat/${bookingId}`);
  };

  const handleNavigate = () => {
    if (!booking?.userLat || !booking?.userLng) {
      Alert.alert('Error', 'Customer location not available');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.userLat},${booking.userLng}`;
    Linking.openURL(url);
  };

  // Provider live location updater - updates every 10 seconds when en_route
  useEffect(() => {
    if (!booking || !bookingId) return;
    const isProvider = booking.providerId === user?.uid;
    const isEnRoute = booking.status === BOOKING_STATUS.EN_ROUTE;

    if (!isProvider || !isEnRoute) return;

    const updateLocation = async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await ExpoLocation.getCurrentPositionAsync({});
        await updateProviderLocationInBooking(bookingId, loc.coords.latitude, loc.coords.longitude);
      } catch (e) {
        // silent fail
      }
    };

    updateLocation(); // initial update
    const interval = setInterval(updateLocation, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, [booking?.status, bookingId]);

  const generateMapHTML = () => {
    const userLat = booking?.userLat || 0;
    const userLng = booking?.userLng || 0;
    const providerLat = booking?.providerLat || userLat;
    const providerLng = booking?.providerLng || userLng;
    const hasProviderLocation = booking?.providerLat && booking?.providerLng;

    const centerLat = hasProviderLocation ? (userLat + providerLat) / 2 : userLat;
    const centerLng = hasProviderLocation ? (userLng + providerLng) / 2 : userLng;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .customer-marker {
      width: 16px; height: 16px;
      background: ${COLORS.primary};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(74,144,217,0.5);
    }
    .customer-pulse {
      width: 40px; height: 40px;
      background: rgba(74,144,217,0.15);
      border-radius: 50%;
      position: absolute;
      top: -12px; left: -12px;
      animation: pulse 2s infinite;
    }
    .provider-marker {
      width: 18px; height: 18px;
      background: ${COLORS.success};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(76,175,80,0.5);
    }
    .provider-pulse {
      width: 44px; height: 44px;
      background: rgba(76,175,80,0.15);
      border-radius: 50%;
      position: absolute;
      top: -13px; left: -13px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    .leaflet-popup-content {
      font-family: -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }
    .leaflet-popup-content b {
      font-size: 14px;
      color: #1a1a2e;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Customer marker (blue)
    var customerIcon = L.divIcon({
      className: 'customer-marker-container',
      html: '<div class="customer-pulse"></div><div class="customer-marker"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    L.marker([${userLat}, ${userLng}], { icon: customerIcon }).addTo(map)
      .bindPopup('<b>Your Location</b>');

    ${hasProviderLocation ? `
    // Provider marker (green)
    var providerIcon = L.divIcon({
      className: 'provider-marker-container',
      html: '<div class="provider-pulse"></div><div class="provider-marker"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    L.marker([${providerLat}, ${providerLng}], { icon: providerIcon }).addTo(map)
      .bindPopup('<b>${(provider?.name || 'Provider').replace(/'/g, "\\'")}</b><br>Service Provider');

    // Draw path line between customer and provider
    var path = L.polyline(
      [[${userLat}, ${userLng}], [${providerLat}, ${providerLng}]],
      {
        color: '${COLORS.primary}',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 8',
        lineCap: 'round'
      }
    ).addTo(map);

    // Fit map to show both markers
    var bounds = L.latLngBounds(
      [${userLat}, ${userLng}],
      [${providerLat}, ${providerLng}]
    );
    map.fitBounds(bounds, { padding: [50, 50] });
    ` : ''}
  </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tracking info...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray} />
        <Text style={styles.loadingText}>Booking not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStatusIndex = getStatusIndex(booking.status);
  const isCancelledOrRejected =
    booking.status === BOOKING_STATUS.CANCELLED ||
    booking.status === BOOKING_STATUS.REJECTED;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <WebView
          style={styles.map}
          source={{ html: generateMapHTML() }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
        />

        {/* Back button overlay */}
        <TouchableOpacity style={styles.backOverlay} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        {/* Status badge overlay */}
        <View style={styles.statusBadgeOverlay}>
          <View style={[
            styles.statusBadge,
            isCancelledOrRejected && styles.statusBadgeDanger,
            booking.status === BOOKING_STATUS.COMPLETED && styles.statusBadgeSuccess,
          ]}>
            <Ionicons
              name={
                isCancelledOrRejected ? 'close-circle' :
                booking.status === BOOKING_STATUS.COMPLETED ? 'checkmark-circle' :
                'navigate-circle'
              }
              size={16}
              color={COLORS.white}
            />
            <Text style={styles.statusBadgeText}>{getStatusMessage(booking.status)}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        {/* Provider Info Row */}
        <View style={styles.providerRow}>
          <View style={styles.providerAvatar}>
            <Ionicons name="person" size={24} color={COLORS.white} />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider?.name || 'Service Provider'}</Text>
            <Text style={styles.providerCategory}>
              {provider?.category
                ? provider.category.charAt(0).toUpperCase() + provider.category.slice(1)
                : 'Provider'}
              {provider?.rating ? ` \u2022 ${provider.rating.toFixed(1)} \u2605` : ''}
            </Text>
          </View>
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>
              Rs.{booking.amount || 0}
            </Text>
          </View>
        </View>

        {/* Location */}
        {booking.locationAddress ? (
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.addressText} numberOfLines={1}>{booking.locationAddress}</Text>
          </View>
        ) : null}

        {/* Status Timeline */}
        {!isCancelledOrRejected && (
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <View key={step.key} style={styles.timelineStep}>
                  {/* Connector line (before dot) */}
                  {index > 0 && (
                    <View
                      style={[
                        styles.timelineConnector,
                        isCompleted && styles.timelineConnectorActive,
                      ]}
                    />
                  )}
                  {/* Dot */}
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotActive,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    {isCompleted && (
                      <Ionicons name="checkmark" size={10} color={COLORS.white} />
                    )}
                  </View>
                  {/* Label */}
                  <Text
                    style={[
                      styles.timelineLabel,
                      isCompleted && styles.timelineLabelActive,
                      isCurrent && styles.timelineLabelCurrent,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Cancelled / Rejected state */}
        {isCancelledOrRejected && (
          <View style={styles.cancelledRow}>
            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
            <Text style={styles.cancelledText}>
              {booking.status === BOOKING_STATUS.CANCELLED
                ? 'This booking has been cancelled.'
                : 'This booking was rejected by the provider.'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={handleCallProvider}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={20} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.chatBtn]}
            onPress={handleChat}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles" size={20} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1A73E8' }]}
            onPress={handleNavigate}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate" size={20} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Navigate</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textLight,
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // Map
  mapContainer: {
    height: MAP_HEIGHT,
    width: width,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  backOverlay: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statusBadgeOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  statusBadgeDanger: {
    backgroundColor: COLORS.danger,
  },
  statusBadgeSuccess: {
    backgroundColor: COLORS.success,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  // Bottom Card
  bottomCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },

  // Provider Info
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  providerCategory: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  amountBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.darkGray,
    flex: 1,
  },

  // Timeline
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    top: 10,
    right: '50%',
    width: '100%',
    height: 3,
    backgroundColor: COLORS.border,
    zIndex: -1,
  },
  timelineConnectorActive: {
    backgroundColor: COLORS.success,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  timelineDotActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  timelineDotCurrent: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.15 }],
  },
  timelineLabel: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
    fontWeight: '500',
  },
  timelineLabelActive: {
    color: COLORS.success,
    fontWeight: '600',
  },
  timelineLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Cancelled
  cancelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  cancelledText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
    flex: 1,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  callBtn: {
    backgroundColor: COLORS.success,
  },
  chatBtn: {
    backgroundColor: COLORS.chat,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
