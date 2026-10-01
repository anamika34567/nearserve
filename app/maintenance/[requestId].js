import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import StarRating from '../../components/StarRating';
import MaintenanceLiveMap from '../../components/MaintenanceLiveMap';
import {
  assignMaintenanceRequest,
  getBuildingTechnicians,
  listenToMaintenanceRequest,
  notifyMaintenanceStatus,
  rejectMaintenanceOffer,
  resolveMaintenanceComplaint,
  submitMaintenanceComplaint,
  submitMaintenanceReview,
  transitionMaintenanceRequest,
  updateTechnicianLocation,
} from '../../services/maintenanceService';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../components/MaintenanceRequestsScreen';

const nextTechnicianStatus = {
  offered: { value: 'accepted', label: 'Accept job' },
  assigned: { value: 'accepted', label: 'Accept job' },
  accepted: { value: 'en_route', label: 'On my way' },
  en_route: { value: 'arrived', label: 'I arrived' },
  arrived: { value: 'in_progress', label: 'Start work' },
  in_progress: { value: 'completed', label: 'Mark complete' },
};

export default function MaintenanceRequestDetailScreen() {
  const { requestId } = useLocalSearchParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [request, setRequest] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [complaint, setComplaint] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const isManager = userProfile?.role === 'manager' || userProfile?.role === 'admin';
  const isTechnician = userProfile?.role === 'technician';
  const isResident = userProfile?.role === 'resident' || userProfile?.role === 'user';

  useFocusEffect(useCallback(() => {
    if (!requestId) return;
    setLoading(true);
    return listenToMaintenanceRequest(requestId, (data) => {
      setRequest(data);
      setLoading(false);
    }, (error) => {
      Alert.alert('Could not load request', error.message);
      setLoading(false);
    });
  }, [requestId]));

  useEffect(() => {
    if (!isManager || !request?.buildingId) return;
    getBuildingTechnicians(request.buildingId, request.category)
      .then(setTechnicians)
      .catch((error) => console.log('Could not load technicians:', error));
  }, [isManager, request?.buildingId, request?.category]);

  useEffect(() => {
    if (!isTechnician || !request || request.assignedTechnicianId !== user?.uid || request.status !== 'en_route') return undefined;

    let active = true;
    let subscription;
    const startLocationSharing = async () => {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (!active) return;
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access while using the app so the resident and manager can see your trip.');
        return;
      }

      const initialLocation = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      if (!active) return;
      await updateTechnicianLocation(request.id, initialLocation.coords.latitude, initialLocation.coords.longitude);
      if (!active) return;
      subscription = await ExpoLocation.watchPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
        distanceInterval: 50,
        timeInterval: 30000,
      }, (location) => {
        updateTechnicianLocation(request.id, location.coords.latitude, location.coords.longitude)
          .catch((error) => console.log('Could not update technician location:', error));
      });
      if (!active) subscription.remove();
    };

    startLocationSharing().catch((error) => Alert.alert('Location unavailable', error.message));
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [isTechnician, request?.id, request?.assignedTechnicianId, request?.status, user?.uid]);

  const changeStatus = async (status) => {
    if (!request) return;
    setSaving(true);
    try {
      await transitionMaintenanceRequest(request.id, status, user, userProfile);
      const message = status === 'in_progress' && isRequestResident
        ? 'Your request has been reopened and sent back for assignment.'
        : status === 'closed' ? 'Your maintenance request is closed.'
        : status === 'accepted' ? 'A technician accepted your request.'
        : status === 'en_route' ? 'Your technician is on the way.'
          : status === 'arrived' ? 'Your technician has arrived.'
        : status === 'in_progress' ? 'Work has started on your maintenance request.'
          : status === 'completed' ? 'Your maintenance request is marked complete.'
            : 'Your maintenance request was reopened.';
      await notifyMaintenanceStatus(request, message);
      if (status === 'completed' && isTechnician) {
        Alert.alert('Job completed', 'The resident has been notified.');
      }
    } catch (error) {
      Alert.alert('Could not update request', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      Alert.alert('Choose a rating', 'Tap a star to rate this maintenance visit.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await submitMaintenanceReview(request.id, rating, review);
      await notifyMaintenanceStatus(request, `Resident rated the maintenance request ${rating} out of 5 stars.`);
      Alert.alert('Review submitted', 'Thank you for your feedback.');
    } catch (error) {
      Alert.alert('Could not submit review', error.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (complaint.trim().length < 5) {
      Alert.alert('Add more detail', 'Describe the problem with the completed work.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await submitMaintenanceComplaint(request.id, complaint);
      await notifyMaintenanceStatus(request, 'A resident reported a problem with a completed maintenance request.');
      setComplaint('');
      Alert.alert('Report sent', 'Building management has been notified.');
    } catch (error) {
      Alert.alert('Could not send report', error.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleResolveComplaint = async () => {
    setSaving(true);
    try {
      await resolveMaintenanceComplaint(request.id);
      await notifyMaintenanceStatus(request, 'Building management resolved the complaint on your maintenance request.');
      Alert.alert('Complaint resolved', 'The resident has been notified.');
    } catch (error) {
      Alert.alert('Could not resolve complaint', error.message);
    } finally {
      setSaving(false);
    }
  };

  const assignTechnician = async (technician) => {
    setSaving(true);
    try {
      await assignMaintenanceRequest(request, technician);
      setShowAssignment(false);
      Alert.alert('Technician assigned', `${technician.name} has been notified.`);
    } catch (error) {
      Alert.alert('Could not assign technician', error.message);
    } finally {
      setSaving(false);
    }
  };

  const rejectOffer = () => Alert.alert(
    'Decline this request?',
    'It will be removed from your offers.',
    [
      { text: 'Keep offer', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await rejectMaintenanceOffer(request.id, user);
            router.back();
          } catch (error) {
            Alert.alert('Could not decline offer', error.message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!request) return <View style={styles.centered}><Text style={styles.muted}>Request not found.</Text></View>;

  const isOfferedToTechnician = request.status === 'offered'
    && (request.offeredTechnicianIds || []).includes(user?.uid);
  const nextAction = isTechnician && (request.assignedTechnicianId === user?.uid || isOfferedToTechnician)
    ? nextTechnicianStatus[request.status]
    : null;
  const isRequestResident = isResident && request.residentId === user?.uid;
  const isFinished = ['completed', 'closed'].includes(request.status);
  const canClose = isRequestResident && request.status === 'completed';
  const canReopen = canClose;
  const canReview = isRequestResident && isFinished && !request.residentRating;
  const canReportComplaint = isRequestResident && isFinished && !request.complaintDescription;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topLine}>
          <View style={styles.categoryIcon}><Ionicons name={request.category === 'plumbing' ? 'water' : request.category === 'electrical' ? 'flash' : request.category === 'cleaning' ? 'sparkles' : 'construct'} size={23} color={COLORS.primary} /></View>
          <View style={styles.topCopy}>
            <Text style={styles.title}>{CATEGORY_LABELS[request.category] || 'Maintenance'} issue</Text>
            <Text style={styles.muted}>{request.buildingName} · Flat {request.unitNumber}</Text>
          </View>
        </View>

        <View style={styles.statusPanel}>
          <Text style={styles.label}>Current status</Text>
          <Text style={styles.status}>{STATUS_LABELS[request.status] || request.status}</Text>
          <Text style={styles.muted}>Submitted {new Date(request.createdAt).toLocaleString()}</Text>
        </View>

        {(isResident || isManager) && request.status === 'en_route' && (
          <View style={styles.locationPanel}>
            <View style={styles.locationHeading}>
              <Ionicons name="navigate-circle" size={22} color={COLORS.primary} />
              <Text style={styles.locationTitle}>Technician is on the way</Text>
            </View>
            {request.technicianLocation ? (
              <>
                <Text style={styles.muted}>Last updated {new Date(request.technicianLocationUpdatedAt).toLocaleTimeString()}</Text>
                <View style={styles.liveMapWrap}>
                  <MaintenanceLiveMap
                    buildingLatitude={request.buildingLatitude}
                    buildingLongitude={request.buildingLongitude}
                    technicianLocation={request.technicianLocation}
                  />
                </View>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${request.technicianLocation.latitude},${request.technicianLocation.longitude}`)}
                >
                  <Ionicons name="map-outline" size={17} color={COLORS.white} />
                  <Text style={styles.mapButtonText}>View technician location</Text>
                </TouchableOpacity>
              </>
            ) : <Text style={styles.muted}>Waiting for the technician’s location.</Text>}
          </View>
        )}
        {isTechnician && request.assignedTechnicianId === user?.uid && request.status === 'en_route' && (
          <View style={styles.locationSharingNotice}>
            <Ionicons name="navigate-circle" size={19} color={COLORS.primary} />
            <Text style={styles.locationSharingText}>Your location is shared while this screen is active. Updates stop when you mark arrived.</Text>
          </View>
        )}

        <Text style={styles.label}>Issue details</Text>
        <Text style={styles.description}>{request.description}</Text>

        <Text style={styles.label}>Assigned technician</Text>
        <View style={styles.assignmentRow}>
          <Ionicons name="person-circle-outline" size={23} color={COLORS.primary} />
          <Text style={styles.assignmentName}>
              {request.assignedTechnicianName || (request.status === 'offered'
                ? 'Available technicians have been notified.'
                : request.status === 'unassigned'
                ? 'No matching technician available; management must assign one.'
                : 'Technician assigned')}
          </Text>
              {isManager && ['unassigned', 'offered', 'assigned'].includes(request.status) && (
            <TouchableOpacity onPress={() => setShowAssignment((shown) => !shown)}>
              <Text style={styles.link}>{request.assignedTechnicianId ? 'Change' : 'Assign'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {showAssignment && (
          <View style={styles.teamList}>
            {technicians.length === 0 ? <Text style={styles.muted}>No technicians are set up for this issue type.</Text> : technicians.map((technician) => {
              const isCurrentAssignee = technician.id === request.assignedTechnicianId;
              const isBusyElsewhere = Boolean(technician.activeRequestId && technician.activeRequestId !== request.id);
              const isEligible = technician.isAvailable === true && !isBusyElsewhere && !isCurrentAssignee;
              return (
                <TouchableOpacity
                  key={technician.id}
                  style={[styles.teamMember, !isEligible && styles.teamMemberUnavailable]}
                  onPress={() => assignTechnician(technician)}
                  disabled={saving || !isEligible}
                >
                  <Text style={styles.teamName}>{technician.name || technician.email || 'Technician'}</Text>
                  <Text style={styles.muted}>
                    {isCurrentAssignee ? 'Currently assigned to this request' : isBusyElsewhere ? 'Busy on another job' : technician.isAvailable === true ? 'Available' : 'Offline'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {request.photoUrls?.length > 0 && <>
          <Text style={styles.label}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
            {request.photoUrls.map((url) => <Image key={url} source={{ uri: url }} style={styles.photo} />)}
          </ScrollView>
        </>}

        {request.residentRating && (
          <View style={styles.feedbackPanel}>
            <Text style={styles.label}>Resident rating</Text>
            <StarRating rating={request.residentRating} size={20} />
            {request.residentReview ? <Text style={styles.description}>{request.residentReview}</Text> : null}
          </View>
        )}

        {request.complaintDescription && (
          <View style={styles.complaintPanel}>
            <View style={styles.complaintHeading}>
              <Text style={styles.label}>Resident complaint</Text>
              <Text style={[styles.complaintStatus, request.complaintStatus === 'resolved' && styles.complaintResolved]}>
                {request.complaintStatus === 'resolved' ? 'Resolved' : 'Open'}
              </Text>
            </View>
            <Text style={styles.complaintText}>{request.complaintDescription}</Text>
            {isManager && request.complaintStatus !== 'resolved' && (
              <TouchableOpacity style={styles.resolveButton} onPress={handleResolveComplaint} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Mark complaint resolved</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {canReview && (
          <View style={styles.feedbackPanel}>
            <Text style={styles.label}>Rate this maintenance visit</Text>
            <StarRating rating={rating} size={32} editable onRatingChange={setRating} />
            <TextInput
              style={styles.feedbackInput}
              value={review}
              onChangeText={setReview}
              placeholder="How did the repair go? (optional)"
              placeholderTextColor={COLORS.gray}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitReview} disabled={submittingFeedback}>
              {submittingFeedback ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Submit rating</Text>}
            </TouchableOpacity>
          </View>
        )}

        {canReportComplaint && (
          <View style={styles.feedbackPanel}>
            <Text style={styles.label}>Report a problem</Text>
            <TextInput
              style={styles.feedbackInput}
              value={complaint}
              onChangeText={setComplaint}
              placeholder="Tell management what still needs attention"
              placeholderTextColor={COLORS.gray}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSubmitComplaint} disabled={submittingFeedback}>
              {submittingFeedback ? <ActivityIndicator color={COLORS.warning} /> : <Text style={styles.secondaryButtonText}>Send to management</Text>}
            </TouchableOpacity>
          </View>
        )}

        {nextAction && <TouchableOpacity style={styles.primaryButton} onPress={() => changeStatus(nextAction.value)} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>{nextAction.label}</Text>}
        </TouchableOpacity>}
        {isOfferedToTechnician && <TouchableOpacity style={styles.secondaryButton} onPress={rejectOffer} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Reject request</Text>
        </TouchableOpacity>}
        {canClose && <TouchableOpacity style={styles.primaryButton} onPress={() => changeStatus('closed')} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Confirm repair complete</Text>}
        </TouchableOpacity>}
        {canReopen && <TouchableOpacity style={styles.secondaryButton} onPress={() => changeStatus('in_progress')} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Reopen request</Text>
        </TouchableOpacity>}
        {request.status === 'unassigned' && isManager && <Text style={styles.fallbackNote}>No matching technician was available when this request was submitted. Assign one above.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 34 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  categoryIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center' },
  topCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  muted: { color: COLORS.textLight, fontSize: 13, marginTop: 4 },
  statusPanel: { backgroundColor: COLORS.white, padding: 15, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, marginBottom: 22 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 9, marginTop: 8 },
  status: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  description: { color: COLORS.darkGray, fontSize: 15, lineHeight: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14 },
  assignmentRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 13 },
  assignmentName: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  link: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  teamList: { marginTop: 8, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  teamMember: { padding: 13, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  teamMemberUnavailable: { opacity: 0.55 },
  teamName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  photos: { marginTop: 2, marginBottom: 12 },
  photo: { width: 150, height: 150, borderRadius: 12, marginRight: 10, backgroundColor: COLORS.lightGray },
  locationPanel: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 18 },
  locationHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  liveMapWrap: { marginTop: 10 },
  mapButton: { minHeight: 42, borderRadius: 10, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
  mapButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  locationSharingNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: `${COLORS.primary}10`, marginTop: 14 },
  locationSharingText: { flex: 1, color: COLORS.darkGray, fontSize: 12, lineHeight: 17 },
  feedbackPanel: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginTop: 18 },
  feedbackInput: { minHeight: 90, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 14, lineHeight: 20, textAlignVertical: 'top', marginTop: 12 },
  complaintPanel: { backgroundColor: '#FFF8F3', borderWidth: 1, borderColor: `${COLORS.warning}55`, borderRadius: 12, padding: 14, marginTop: 18 },
  complaintHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  complaintStatus: { color: COLORS.warning, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  complaintResolved: { color: COLORS.success },
  complaintText: { color: COLORS.darkGray, fontSize: 14, lineHeight: 21 },
  resolveButton: { minHeight: 44, borderRadius: 10, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryButton: { minHeight: 50, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  secondaryButton: { minHeight: 46, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.warning, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryButtonText: { color: COLORS.warning, fontWeight: '800', fontSize: 14 },
  fallbackNote: { color: COLORS.textLight, fontSize: 13, lineHeight: 19, marginTop: 14 },
});
