import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { getNearbyProviders } from '../services/providerService';
import { createBooking } from '../services/bookingService';
import { COLORS } from '../constants';

export default function EmergencyScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nearestProviders, setNearestProviders] = useState([]);
  const [bookingProvider, setBookingProvider] = useState(null);

  const userLat = location?.latitude || 17.385;
  const userLng = location?.longitude || 78.4867;

  useEffect(() => {
    fetchNearestProviders();
  }, []);

  const fetchNearestProviders = async () => {
    try {
      const data = await getNearbyProviders(userLat, userLng, 100);
      // Get top 5 nearest available providers
      const available = data.filter((p) => p.available !== false).slice(0, 5);
      setNearestProviders(available);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyBook = async (provider) => {
    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    setBookingProvider(provider.id);
    try {
      await createBooking(
        user.uid,
        provider.id,
        userLat,
        userLng,
        new Date().toISOString(),
        provider.hourlyRate || 0,
        'Emergency Request'
      );
      Alert.alert(
        'Emergency Booking Sent!',
        `${provider.name} has been notified of your emergency. They will respond ASAP.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create emergency booking');
    } finally {
      setBookingProvider(null);
    }
  };

  const handleCallEmergency = () => {
    Linking.openURL('tel:112');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Emergency Header */}
      <View style={styles.header}>
        <View style={styles.headerPulse} />
        <View style={styles.headerIcon}>
          <Ionicons name="warning" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.headerTitle}>Emergency Mode</Text>
        <Text style={styles.headerSub}>
          Quick access to nearest available providers
        </Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Call Emergency */}
        <TouchableOpacity style={styles.emergencyCallBtn} onPress={handleCallEmergency}>
          <Ionicons name="call" size={24} color={COLORS.white} />
          <View>
            <Text style={styles.emergencyCallText}>Call Emergency (112)</Text>
            <Text style={styles.emergencyCallSub}>For life-threatening situations</Text>
          </View>
        </TouchableOpacity>

        {/* Nearest Providers */}
        <Text style={styles.sectionTitle}>Nearest Available Providers</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.emergency} />
            <Text style={styles.loadingText}>Finding nearest providers...</Text>
          </View>
        ) : nearestProviders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.gray} />
            <Text style={styles.emptyText}>No providers available nearby</Text>
          </View>
        ) : (
          nearestProviders.map((provider) => (
            <View key={provider.id} style={styles.providerCard}>
              <View style={styles.providerRow}>
                <View style={[styles.providerAvatar, {
                  backgroundColor: (COLORS[provider.category] || COLORS.primary) + '15'
                }]}>
                  <Ionicons
                    name={provider.category === 'plumber' ? 'water' : 'flash'}
                    size={24}
                    color={COLORS[provider.category] || COLORS.primary}
                  />
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerMeta}>
                    {provider.category} | {provider.distance} km away | Rs.{provider.hourlyRate}/hr
                  </Text>
                </View>
              </View>

              <View style={styles.providerActions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${provider.phone}`)}
                >
                  <Ionicons name="call" size={18} color={COLORS.success} />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bookEmergencyBtn}
                  onPress={() => handleEmergencyBook(provider)}
                  disabled={bookingProvider === provider.id}
                >
                  {bookingProvider === provider.id ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={18} color={COLORS.white} />
                      <Text style={styles.bookEmergencyText}>Emergency Book</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.emergency,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -50,
  },
  headerIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Emergency Call
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  emergencyCallText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  emergencyCallSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },

  // Loading
  loadingBox: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
  },

  // Provider Card
  providerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.emergency,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  providerMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  providerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  bookEmergencyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.emergency,
  },
  bookEmergencyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});
