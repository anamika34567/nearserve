import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import * as ExpoLocation from 'expo-location';
import { COLORS } from '../constants';
import {
  createBuildingInvitation,
  listenToBuildingTechnicians,
  listenToMaintenanceRequests,
  updateTechnicianAvailability,
  updateBuildingLocation,
} from '../services/maintenanceService';
import {
  completeAccountRegistration,
  resendAccountVerification,
} from '../services/authService';
import { MaintenanceRequestCard, STATUS_LABELS } from './MaintenanceRequestsScreen';

const technicianSkills = [
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'other', label: 'Other' },
];

export default function MaintenanceDashboard() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteRole, setInviteRole] = useState('resident');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUnit, setInviteUnit] = useState('');
  const [inviteSkills, setInviteSkills] = useState([]);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [buildingLatitude, setBuildingLatitude] = useState('');
  const [buildingLongitude, setBuildingLongitude] = useState('');
  const [savingBuildingLocation, setSavingBuildingLocation] = useState(false);
  const [detectingBuildingLocation, setDetectingBuildingLocation] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const role = userProfile?.role || 'resident';
  const isManager = role === 'manager' || role === 'admin';
  const isTechnician = role === 'technician';
  const isResident = role === 'resident' || role === 'user';
  const membershipPending = isResident && userProfile?.membershipStatus !== 'active';

  useEffect(() => {
    setBuildingLatitude(userProfile?.buildingLatitude == null ? '' : String(userProfile.buildingLatitude));
    setBuildingLongitude(userProfile?.buildingLongitude == null ? '' : String(userProfile.buildingLongitude));
  }, [userProfile?.buildingLatitude, userProfile?.buildingLongitude]);

  useFocusEffect(useCallback(() => {
    if (!user || !userProfile || membershipPending) {
      setRequests([]);
      setLoading(false);
      return undefined;
    }
    let active = true;
    const unsubscribeTechnicians = isManager
      ? listenToBuildingTechnicians(userProfile.buildingId, setTechnicians, (error) => console.log('Error loading technicians:', error))
      : () => {};
    setLoading(true);
    const unsubscribe = listenToMaintenanceRequests(user, userProfile, (nextRequests) => {
      setRequests(nextRequests);
      setLoading(false);
    }, (error) => {
      console.log('Error loading maintenance dashboard:', error);
      Alert.alert('Could not load maintenance requests', error.message);
      setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
      unsubscribeTechnicians();
    };
  }, [user?.uid, userProfile?.role, userProfile?.buildingId, userProfile?.membershipStatus]));

  const handleCreateInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Missing email', 'Enter the invited person’s email address.');
      return;
    }
    if (inviteRole === 'resident' && !inviteUnit.trim()) {
      Alert.alert('Missing flat number', 'Enter the resident’s flat number.');
      return;
    }
    if (inviteRole === 'technician' && inviteSkills.length === 0) {
      Alert.alert('Choose technician skills', 'Select at least one skill for this technician.');
      return;
    }
    setCreatingInvite(true);
    try {
      const invitation = await createBuildingInvitation(userProfile, {
        email: inviteEmail,
        role: inviteRole,
        unitNumber: inviteUnit,
        skillCategories: inviteSkills,
      });
      setCreatedInvite(invitation);
      setInviteEmail('');
      setInviteUnit('');
    } catch (error) {
      Alert.alert('Could not create invitation', error.message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleUseCurrentBuildingLocation = async () => {
    setDetectingBuildingLocation(true);
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Allow location access to use the current position as the building pin.');
      const location = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      setBuildingLatitude(String(location.coords.latitude));
      setBuildingLongitude(String(location.coords.longitude));
    } catch (error) {
      Alert.alert('Could not detect building location', error.message);
    } finally {
      setDetectingBuildingLocation(false);
    }
  };

  const handleSaveBuildingLocation = async () => {
    const latitude = Number(buildingLatitude);
    const longitude = Number(buildingLongitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      Alert.alert('Invalid coordinates', 'Enter a valid latitude and longitude for this building.');
      return;
    }
    setSavingBuildingLocation(true);
    try {
      await updateBuildingLocation(user.uid, latitude, longitude);
      Alert.alert('Building pin saved', 'New invitations and maintenance requests will use this map destination.');
    } catch (error) {
      Alert.alert('Could not save building pin', error.message);
    } finally {
      setSavingBuildingLocation(false);
    }
  };

  const handleAvailabilityChange = async (isAvailable) => {
    setAvailabilitySaving(true);
    try {
      await updateTechnicianAvailability(user.uid, isAvailable);
    } catch (error) {
      Alert.alert('Could not update availability', error.message);
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    setCheckingVerification(true);
    try {
      await completeAccountRegistration();
      Alert.alert('Apartment joined', 'Your email is verified and your invitation has been used.');
    } catch (error) {
      Alert.alert('Email not verified yet', error.message);
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await resendAccountVerification();
      Alert.alert('Verification email sent', 'Check your inbox, then return here and tap Verify email.');
    } catch (error) {
      Alert.alert('Could not resend email', error.message);
    } finally {
      setResendingVerification(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (membershipPending) {
    return (
      <View style={styles.centeredPage}>
        <View style={styles.pendingIcon}><Ionicons name="mail-outline" size={30} color={COLORS.primary} /></View>
        <Text style={styles.pendingTitle}>Verify your email</Text>
        <Text style={styles.pendingText}>We sent a verification link to {user?.email}. Open it, then return here to finish joining your apartment.</Text>
        <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyEmail} disabled={checkingVerification}>
          {checkingVerification ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.verifyButtonText}>I verified my email</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.resendButton} onPress={handleResendVerification} disabled={resendingVerification}>
          {resendingVerification ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.resendButtonText}>Resend verification email</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  const activeCount = requests.filter((request) => !['completed', 'closed'].includes(request.status)).length;
  const title = isManager ? 'Building maintenance' : isTechnician ? 'My jobs and offers' : 'Your apartment';
  const greeting = userProfile?.name?.split(' ')[0] || 'Hello';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, isManager && styles.managerHero, isTechnician && styles.technicianHero]}>
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>{isManager ? 'MANAGEMENT' : isTechnician ? 'TECHNICIAN' : `HELLO, ${greeting.toUpperCase()}`}</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSub}>
              {isResident ? `${userProfile?.buildingName || 'Your building'} · Flat ${userProfile?.unitNumber || '—'}` : userProfile?.buildingName || 'Assigned building'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={21} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.statLine}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>{isTechnician ? 'active jobs' : isManager ? 'open requests' : 'open requests'}</Text>
        </View>
      </View>

      {isTechnician && (
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityCopy}>
            <Text style={styles.availabilityTitle}>Available for new jobs</Text>
            <Text style={styles.muted}>{userProfile?.isAvailable === true ? 'Matching requests are sent to you; accepting claims the job.' : 'You will not receive new request offers.'}</Text>
          </View>
          <Switch
            value={userProfile?.isAvailable === true}
            onValueChange={handleAvailabilityChange}
            disabled={availabilitySaving}
            trackColor={{ false: COLORS.border, true: `${COLORS.success}80` }}
            thumbColor={userProfile?.isAvailable === true ? COLORS.success : COLORS.gray}
          />
        </View>
      )}

      {isResident && (
        <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/maintenance/new')} activeOpacity={0.85}>
          <View style={styles.reportIcon}><Ionicons name="add" size={24} color={COLORS.white} /></View>
          <View style={styles.reportCopy}>
            <Text style={styles.reportTitle}>Report a maintenance issue</Text>
            <Text style={styles.reportSub}>Describe it and attach photos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {isManager && (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Building map pin</Text>
          </View>
          <Text style={styles.muted}>Set the destination residents and technicians will see on the live map.</Text>
          <View style={styles.coordinateRow}>
            <TextInput style={[styles.inviteInput, styles.coordinateInput]} value={buildingLatitude} onChangeText={setBuildingLatitude} placeholder="Latitude" keyboardType="decimal-pad" placeholderTextColor={COLORS.gray} />
            <TextInput style={[styles.inviteInput, styles.coordinateInput]} value={buildingLongitude} onChangeText={setBuildingLongitude} placeholder="Longitude" keyboardType="decimal-pad" placeholderTextColor={COLORS.gray} />
          </View>
          <View style={styles.buildingLocationActions}>
            <TouchableOpacity style={styles.locationDetectButton} onPress={handleUseCurrentBuildingLocation} disabled={detectingBuildingLocation}>
              {detectingBuildingLocation ? <ActivityIndicator color={COLORS.primary} /> : <><Ionicons name="locate-outline" size={17} color={COLORS.primary} /><Text style={styles.locationDetectText}>Use current location</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.locationSaveButton} onPress={handleSaveBuildingLocation} disabled={savingBuildingLocation}>
              {savingBuildingLocation ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.locationSaveText}>Save pin</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isManager && (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Invite a team member</Text>
          </View>
          <View style={styles.inviteRoleRow}>
            {[
              { key: 'resident', label: 'Resident' },
              { key: 'technician', label: 'Technician' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.inviteRoleButton, inviteRole === option.key && styles.inviteRoleButtonActive]}
                onPress={() => { setInviteRole(option.key); setCreatedInvite(null); }}
              >
                <Text style={[styles.inviteRoleText, inviteRole === option.key && styles.inviteRoleTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.inviteInput} value={inviteEmail} onChangeText={setInviteEmail} placeholder={inviteRole === 'resident' ? 'Resident email address' : 'Technician email address'} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.gray} />
          {inviteRole === 'resident' ? (
            <TextInput style={styles.inviteInput} value={inviteUnit} onChangeText={setInviteUnit} placeholder="Flat / apartment number" autoCapitalize="characters" placeholderTextColor={COLORS.gray} />
          ) : (
            <View style={styles.skillOptions}>
              {technicianSkills.map((skill) => {
                const selected = inviteSkills.includes(skill.key);
                return (
                  <TouchableOpacity
                    key={skill.key}
                    style={[styles.skillOption, selected && styles.skillOptionActive]}
                    onPress={() => setInviteSkills((current) => selected ? current.filter((item) => item !== skill.key) : [...current, skill.key])}
                  >
                    <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={17} color={selected ? COLORS.white : COLORS.textLight} />
                    <Text style={[styles.skillOptionText, selected && styles.skillOptionTextActive]}>{skill.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <TouchableOpacity style={styles.createInviteButton} onPress={handleCreateInvite} disabled={creatingInvite}>
            {creatingInvite ? <ActivityIndicator color={COLORS.white} /> : <><Ionicons name="mail-outline" size={18} color={COLORS.white} /><Text style={styles.createInviteText}>Create invitation</Text></>}
          </TouchableOpacity>
          {createdInvite && (
            <View style={styles.inviteResult}>
              <Text style={styles.inviteResultLabel}>Send this one-time {createdInvite.role} invite to {createdInvite.email}</Text>
              <Text selectable style={styles.inviteCode}>{createdInvite.code}</Text>
              <Text style={styles.muted}>{createdInvite.role === 'resident' ? `For flat ${createdInvite.unitNumber}` : `Skills: ${createdInvite.skillCategories.join(', ')}`}. Expires in 7 days.</Text>
            </View>
          )}
        </View>
      )}

      {isManager && (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Technician availability</Text>
            <Text style={styles.countBadge}>{technicians.filter((technician) => technician.isAvailable === true).length} available</Text>
          </View>
          {technicians.length === 0 ? (
            <Text style={styles.muted}>No technicians have joined this building yet.</Text>
          ) : technicians.map((technician) => {
            const openJobs = requests.filter((request) => request.assignedTechnicianId === technician.id && !['completed', 'closed'].includes(request.status));
            const currentJob = openJobs[0];
            return (
              <View key={technician.id} style={styles.technicianRow}>
                <View style={styles.technicianInfo}>
                  <Text style={styles.technicianName}>{technician.name || technician.email || 'Technician'}</Text>
                  <Text style={styles.muted}>{(technician.skillCategories || []).join(', ')}</Text>
                  <Text style={styles.technicianWork}>
                    {openJobs.length ? `${openJobs.length} active job${openJobs.length === 1 ? '' : 's'} · ${STATUS_LABELS[currentJob.status] || currentJob.status}` : 'No active jobs'}
                  </Text>
                </View>
                <View style={[styles.availabilityBadge, technician.isAvailable === true ? styles.availableBadge : styles.offlineBadge]}>
                  <View style={[styles.availabilityDot, technician.isAvailable === true ? styles.availableDot : styles.offlineDot]} />
                  <Text style={[styles.availabilityBadgeText, technician.isAvailable === true ? styles.availableText : styles.offlineText]}>
                    {technician.isAvailable === true ? 'Available' : 'Offline'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{isManager ? 'Building requests' : isTechnician ? 'Jobs and offers' : 'Recent requests'}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name={isTechnician ? 'briefcase-outline' : 'checkmark-circle-outline'} size={32} color={COLORS.gray} />
            <Text style={styles.emptyText}>
              {isTechnician
                ? userProfile?.isAvailable === true
                  ? `No offers for ${(userProfile.skillCategories || []).join(', ') || 'your skills'} yet`
                  : 'Turn on availability to receive matching requests.'
                : 'No maintenance requests yet'}
            </Text>
          </View>
        ) : requests.slice(0, 4).map((request) => <MaintenanceRequestCard key={request.id} request={request} />)}
      </View>

      {isResident && (
        <TouchableOpacity style={styles.emergencyLink} onPress={() => router.push('/emergency')}>
          <Ionicons name="alert-circle-outline" size={19} color={COLORS.danger} />
          <Text style={styles.emergencyText}>Building emergency contacts</Text>
          <Ionicons name="chevron-forward" size={17} color={COLORS.gray} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 30 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  centeredPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, paddingHorizontal: 34 },
  hero: { backgroundColor: COLORS.primary, paddingTop: 54, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  managerHero: { backgroundColor: '#245A4A' },
  technicianHero: { backgroundColor: '#245A4A' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroText: { flex: 1, paddingRight: 12 },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: COLORS.white, fontSize: 25, fontWeight: '800', marginTop: 7 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 6 },
  notificationButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.17)', alignItems: 'center', justifyContent: 'center' },
  statLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 22 },
  statNumber: { color: COLORS.white, fontSize: 29, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' },
  availabilityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  availabilityCopy: { flex: 1, paddingRight: 10 },
  availabilityTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  reportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 18, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  reportIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  reportCopy: { flex: 1, marginHorizontal: 12 },
  reportTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  reportSub: { color: COLORS.textLight, fontSize: 12, marginTop: 3 },
  section: { marginTop: 22, paddingHorizontal: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  viewAll: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  countBadge: { color: COLORS.warning, backgroundColor: `${COLORS.warning}18`, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  residentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 13, borderRadius: 12, marginBottom: 9, borderWidth: 1, borderColor: COLORS.border },
  residentInfo: { flex: 1 },
  residentName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  muted: { color: COLORS.textLight, fontSize: 12, marginTop: 4 },
  approveButton: { width: 38, height: 38, backgroundColor: COLORS.success, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { backgroundColor: COLORS.white, minHeight: 110, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 18, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textLight, fontSize: 14, marginTop: 9 },
  emergencyLink: { flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, marginTop: 22, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  emergencyText: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
  pendingIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.warning}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  pendingTitle: { color: COLORS.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  pendingText: { color: COLORS.textLight, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
  buildingLabel: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 16 },
  verifyButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 22, alignSelf: 'stretch' },
  verifyButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  resendButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, alignSelf: 'stretch' },
  resendButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  inviteInput: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, color: COLORS.text, paddingHorizontal: 13, fontSize: 14, marginBottom: 9 },
  coordinateRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  coordinateInput: { flex: 1, minWidth: 0 },
  buildingLocationActions: { flexDirection: 'row', gap: 8 },
  locationDetectButton: { flex: 1, minHeight: 43, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  locationDetectText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  locationSaveButton: { flex: 1, minHeight: 43, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  locationSaveText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  inviteRoleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  inviteRoleButton: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  inviteRoleButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  inviteRoleText: { color: COLORS.textLight, fontSize: 13, fontWeight: '700' },
  inviteRoleTextActive: { color: COLORS.white },
  skillOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  skillOption: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 10, paddingVertical: 8 },
  skillOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  skillOptionText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  skillOptionTextActive: { color: COLORS.white },
  createInviteButton: { minHeight: 46, borderRadius: 10, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createInviteText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  inviteResult: { marginTop: 12, padding: 13, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, backgroundColor: COLORS.white },
  inviteResultLabel: { color: COLORS.text, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  inviteCode: { color: COLORS.primary, fontSize: 19, fontWeight: '800', marginTop: 8, marginBottom: 2 },
  technicianRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 13, marginBottom: 9 },
  technicianInfo: { flex: 1, paddingRight: 8 },
  technicianName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  technicianWork: { color: COLORS.darkGray, fontSize: 12, fontWeight: '600', marginTop: 6 },
  availabilityBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 6 },
  availableBadge: { backgroundColor: `${COLORS.success}18` },
  offlineBadge: { backgroundColor: COLORS.lightGray },
  availabilityDot: { width: 7, height: 7, borderRadius: 4 },
  availableDot: { backgroundColor: COLORS.success },
  offlineDot: { backgroundColor: COLORS.gray },
  availabilityBadgeText: { fontSize: 11, fontWeight: '800' },
  availableText: { color: COLORS.success },
  offlineText: { color: COLORS.textLight },
});
