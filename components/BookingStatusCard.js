import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BOOKING_STATUS } from '../constants';

const statusConfig = {
  [BOOKING_STATUS.REQUESTED]: { label: 'Requested', icon: 'time', color: COLORS.warning },
  [BOOKING_STATUS.ACCEPTED]: { label: 'Accepted', icon: 'checkmark-circle', color: COLORS.primary },
  [BOOKING_STATUS.EN_ROUTE]: { label: 'En Route', icon: 'navigate', color: COLORS.secondary },
  [BOOKING_STATUS.ARRIVED]: { label: 'Arrived', icon: 'location', color: COLORS.success },
  [BOOKING_STATUS.COMPLETED]: { label: 'Completed', icon: 'checkmark-done-circle', color: COLORS.success },
  [BOOKING_STATUS.REJECTED]: { label: 'Rejected', icon: 'close-circle', color: COLORS.danger },
  [BOOKING_STATUS.CANCELLED]: { label: 'Cancelled', icon: 'close-circle', color: COLORS.danger },
};

export default function BookingStatusCard({ booking, providerName }) {
  const router = useRouter();
  const config = statusConfig[booking.status] || statusConfig[BOOKING_STATUS.REQUESTED];

  const isTrackable = [
    BOOKING_STATUS.REQUESTED,
    BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.EN_ROUTE,
    BOOKING_STATUS.ARRIVED,
  ].includes(booking.status);

  const isCompleted = booking.status === BOOKING_STATUS.COMPLETED;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTrack = () => {
    router.push(`/tracking/${booking.id}`);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardTop}
        onPress={isTrackable ? handleTrack : undefined}
        activeOpacity={isTrackable ? 0.7 : 1}
      >
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
          {booking.amount > 0 && (
            <Text style={styles.amount}>Rs.{booking.amount}</Text>
          )}
          {booking.locationAddress ? (
            <Text style={styles.note} numberOfLines={1}>{booking.locationAddress}</Text>
          ) : null}
        </View>
        {isTrackable && (
          <View style={styles.trackBtn}>
            <Ionicons name="navigate" size={16} color={COLORS.primary} />
            <Text style={styles.trackText}>Track</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Action buttons for completed bookings */}
      {isCompleted && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FFB800' + '15' }]}
            onPress={() => router.push(`/review/${booking.providerId}`)}
          >
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={[styles.actionText, { color: '#FFB800' }]}>Rate & Review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#E91E63' + '15' }]}
            onPress={() => router.push('/complaint')}
          >
            <Ionicons name="flag" size={16} color="#E91E63" />
            <Text style={[styles.actionText, { color: '#E91E63' }]}>Report Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary + '15' }]}
            onPress={() => router.push(`/provider/${booking.providerId}`)}
          >
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={[styles.actionText, { color: COLORS.primary }]}>Book Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 2,
  },
  note: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  trackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
