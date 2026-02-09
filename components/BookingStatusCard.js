import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BOOKING_STATUS } from '../constants';

const statusConfig = {
  [BOOKING_STATUS.REQUESTED]: { label: 'Requested', icon: 'time', color: COLORS.warning },
  [BOOKING_STATUS.ACCEPTED]: { label: 'Accepted', icon: 'checkmark-circle', color: COLORS.primary },
  [BOOKING_STATUS.EN_ROUTE]: { label: 'En Route', icon: 'navigate', color: COLORS.secondary },
  [BOOKING_STATUS.ARRIVED]: { label: 'Arrived', icon: 'location', color: COLORS.success },
  [BOOKING_STATUS.COMPLETED]: { label: 'Completed', icon: 'checkmark-done-circle', color: COLORS.success },
  [BOOKING_STATUS.CANCELLED]: { label: 'Cancelled', icon: 'close-circle', color: COLORS.danger },
};

export default function BookingStatusCard({ booking, providerName }) {
  const config = statusConfig[booking.status] || statusConfig[BOOKING_STATUS.REQUESTED];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.card}>
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon} size={24} color={config.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.providerName}>{providerName || 'Service Provider'}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={styles.date}>{formatDate(booking.createdAt)}</Text>
      </View>
    </View>
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
  statusBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
