import React, { useCallback, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  getMaintenanceRequests,
  listenToMaintenanceRequests,
  notifyMaintenanceStatus,
  rejectMaintenanceOffer,
  transitionMaintenanceRequest,
} from '../services/maintenanceService';
import { COLORS } from '../constants';

export const CATEGORY_LABELS = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  cleaning: 'Cleaning',
  other: 'Other',
};

export const STATUS_LABELS = {
  unassigned: 'Needs assignment',
  offered: 'Waiting for acceptance',
  assigned: 'Assigned',
  accepted: 'Accepted',
  en_route: 'On the way',
  arrived: 'Arrived',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
};

export function MaintenanceRequestCard({ request }) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [responding, setResponding] = useState(false);
  const isTechnicianOffer = userProfile?.role === 'technician'
    && request.status === 'offered'
    && (request.offeredTechnicianIds || []).includes(user?.uid);
  const statusColor = request.status === 'unassigned' ? COLORS.warning
    : request.status === 'completed' || request.status === 'closed' ? COLORS.success
      : COLORS.primary;

  const respondToOffer = async (accept) => {
    setResponding(true);
    try {
      if (accept) {
        await transitionMaintenanceRequest(request.id, 'accepted', user, userProfile);
        await notifyMaintenanceStatus(request, 'A technician accepted your request.');
      } else {
        await rejectMaintenanceOffer(request.id, user);
      }
    } catch (error) {
      Alert.alert(accept ? 'Could not accept offer' : 'Could not decline offer', error.message);
    } finally {
      setResponding(false);
    }
  };

  const confirmReject = () => Alert.alert(
    'Decline this request?',
    'It will be removed from your offers.',
    [
      { text: 'Keep offer', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => respondToOffer(false) },
    ]
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => router.push(`/maintenance/${request.id}`)}
        activeOpacity={0.75}
      >
      <View style={styles.cardTop}>
        <View style={styles.categoryIcon}>
          <Ionicons
            name={request.category === 'plumbing' ? 'water' : request.category === 'electrical' ? 'flash' : request.category === 'cleaning' ? 'sparkles' : 'construct'}
            size={20}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{CATEGORY_LABELS[request.category] || 'Maintenance'} issue</Text>
          <Text style={styles.cardMeta}>
            Flat {request.unitNumber || '—'} · {new Date(request.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
      </View>
      <Text style={styles.description} numberOfLines={2}>{request.description}</Text>
      {(request.complaintStatus === 'open' || request.residentRating) && (
        <View style={styles.feedbackFlags}>
          {request.complaintStatus === 'open' && (
            <View style={styles.complaintFlag}>
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={styles.complaintFlagText}>Open complaint</Text>
            </View>
          )}
          {request.residentRating && (
            <View style={styles.ratingFlag}>
              <Ionicons name="star" size={14} color={COLORS.secondary} />
              <Text style={styles.ratingFlagText}>{request.residentRating}/5 resident rating</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.cardBottom}>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[request.status] || request.status}
          </Text>
        </View>
        {request.photoUrls?.length > 0 && (
          <View style={styles.photoCount}>
            <Ionicons name="images-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.cardMeta}>{request.photoUrls.length}</Text>
          </View>
        )}
      </View>
      </TouchableOpacity>
      {isTechnicianOffer && (
        <View style={styles.offerActions}>
          <TouchableOpacity style={styles.acceptOfferButton} onPress={() => respondToOffer(true)} disabled={responding}>
            {responding ? <ActivityIndicator size="small" color={COLORS.white} /> : <><Ionicons name="checkmark" size={17} color={COLORS.white} /><Text style={styles.acceptOfferText}>Accept</Text></>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectOfferButton} onPress={confirmReject} disabled={responding}>
            <Ionicons name="close" size={17} color={COLORS.danger} />
            <Text style={styles.rejectOfferText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function MaintenanceRequestsScreen() {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshRequests = async () => {
    if (!user || !userProfile) return;
    setRefreshing(true);
    try {
      setRequests(await getMaintenanceRequests(user, userProfile));
    } catch (error) {
      console.log('Error refreshing maintenance requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (!user || !userProfile) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return listenToMaintenanceRequests(user, userProfile, (nextRequests) => {
      setRequests(nextRequests);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.log('Error loading maintenance requests:', error);
      Alert.alert('Could not load maintenance requests', error.message);
      setLoading(false);
      setRefreshing(false);
    });
  }, [user?.uid, userProfile?.role, userProfile?.buildingId]));

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MaintenanceRequestCard request={item} />}
        contentContainerStyle={requests.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshRequests} tintColor={COLORS.primary} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.heading}>Maintenance requests</Text>
            <Text style={styles.subheading}>{requests.length} {requests.length === 1 ? 'request' : 'requests'}</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={40} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>New maintenance requests will appear here.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  list: { paddingHorizontal: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 28 },
  header: { paddingTop: 20, paddingBottom: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subheading: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardContent: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: `${COLORS.primary}12`, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  description: { fontSize: 14, lineHeight: 20, color: COLORS.darkGray, marginTop: 12 },
  feedbackFlags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  complaintFlag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.danger}12`, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  complaintFlagText: { color: COLORS.danger, fontSize: 11, fontWeight: '800' },
  ratingFlag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.secondary}18`, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  ratingFlagText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  photoCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: COLORS.border },
  acceptOfferButton: { flex: 1, minHeight: 42, borderRadius: 9, backgroundColor: COLORS.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  acceptOfferText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  rejectOfferButton: { flex: 1, minHeight: 42, borderRadius: 9, borderWidth: 1, borderColor: COLORS.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectOfferText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyText: { color: COLORS.textLight, fontSize: 14, textAlign: 'center', marginTop: 6 },
});
