import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { getUserBookings } from '../../services/bookingService';
import { getProviderById } from '../../services/providerService';
import BookingStatusCard from '../../components/BookingStatusCard';
import { COLORS } from '../../constants';

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [providerNames, setProviderNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [user])
  );

  const fetchBookings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await getUserBookings(user.uid);
      setBookings(data);

      // Fetch provider names
      const names = {};
      for (const booking of data) {
        if (!names[booking.providerId]) {
          const provider = await getProviderById(booking.providerId);
          names[booking.providerId] = provider?.name || 'Unknown Provider';
        }
      }
      setProviderNames(names);
    } catch (error) {
      console.log('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingStatusCard
            booking={item}
            providerName={providerNames[item.providerId]}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>
              Find a service provider and book them to see your bookings here.
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
  },
  list: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
});
