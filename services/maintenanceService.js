import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { createNotification } from './notificationService';

const notifySafely = async (userId, message, requestId) => {
  if (!userId) return;
  try {
    await createNotification(userId, 'maintenance', message, { requestId });
  } catch (error) {
    console.log('Maintenance notification failed:', error);
  }
};

const uploadRequestPhotos = async (buildingId, userId, photos = []) => {
  return Promise.all(photos.map(async (photo, index) => {
    const response = await fetch(photo.uri);
    const blob = await response.blob();
    const imageRef = ref(storage, `maintenance/${buildingId}/${userId}/${Date.now()}-${index}.jpg`);
    await uploadBytes(imageRef, blob, { contentType: photo.mimeType || 'image/jpeg' });
    return getDownloadURL(imageRef);
  }));
};

export const createMaintenanceRequest = async ({ user, userProfile, category, description, photos }) => {
  const buildingId = userProfile?.buildingId;
  if (!buildingId || !user?.uid) throw new Error('Your apartment account is missing building details.');

  const photoUrls = await uploadRequestPhotos(buildingId, user.uid, photos);
  const [technicianSnapshot, managerSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'users'),
      where('buildingId', '==', buildingId),
      where('role', '==', 'technician')
    )),
    getDocs(query(
      collection(db, 'users'),
      where('buildingId', '==', buildingId),
      where('role', 'in', ['manager', 'admin'])
    )),
  ]);

  const candidates = technicianSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((technician) => technician.isAvailable === true
      && !technician.activeRequestId
      && (technician.skillCategories || []).includes(category))
    .sort((first, second) => (first.openJobs || 0) - (second.openJobs || 0));

  const requestRef = doc(collection(db, 'maintenanceRequests'));
  const requestBase = {
    buildingId,
    buildingName: userProfile.buildingName || '',
    unitNumber: userProfile.unitNumber || '',
    buildingLatitude: userProfile.buildingLatitude ?? null,
    buildingLongitude: userProfile.buildingLongitude ?? null,
    residentId: user.uid,
    residentName: userProfile.name || user.email || 'Resident',
    category,
    description: description.trim(),
    photoUrls,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const offeredTechnicianIds = candidates.map((technician) => technician.id);
  const managerEscalationAt = offeredTechnicianIds.length
    ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
    : null;
  const request = {
    ...requestBase,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    offeredTechnicianIds,
    managerEscalationAt,
    managerEscalated: false,
    status: offeredTechnicianIds.length ? 'offered' : 'unassigned',
  };

  await setDoc(requestRef, request);
  if (offeredTechnicianIds.length) {
    await Promise.all(candidates.map((technician) =>
      notifySafely(technician.id, `New ${category} request for flat ${request.unitNumber}.`, requestRef.id)
    ));
  } else {
    const managers = managerSnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.role === 'manager' || item.role === 'admin');
    await Promise.all(managers.map((manager) =>
      notifySafely(manager.id, `A ${category} request needs assignment.`, requestRef.id)
    ));
  }

  return { id: requestRef.id, ...request };
};

export const updateBuildingLocation = async (managerId, latitude, longitude) => {
  await updateDoc(doc(db, 'users', managerId), {
    buildingLatitude: latitude,
    buildingLongitude: longitude,
  });
};

export const createBuildingInvitation = async (managerProfile, { email, role, unitNumber = '', skillCategories = [] }) => {
  if (!managerProfile?.buildingId) {
    throw new Error('This manager account is missing its building setup.');
  }
  if (!['resident', 'technician'].includes(role)) {
    throw new Error('Choose resident or technician for this invitation.');
  }
  if (role === 'resident' && !unitNumber.trim()) {
    throw new Error('Enter the resident flat number.');
  }
  if (role === 'technician' && skillCategories.length === 0) {
    throw new Error('Choose at least one technician skill.');
  }

  const invitationRef = doc(collection(db, 'buildingInvitations'));
  const now = Date.now();
  const invitation = {
    email: email.trim().toLowerCase(),
    role,
    unitNumber: unitNumber.trim(),
    skillCategories: role === 'technician' ? skillCategories : [],
    buildingId: managerProfile.buildingId,
    buildingName: managerProfile.buildingName || 'Apartment building',
    buildingLatitude: managerProfile.buildingLatitude ?? null,
    buildingLongitude: managerProfile.buildingLongitude ?? null,
    createdBy: managerProfile.id,
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    used: false,
  };

  await setDoc(invitationRef, invitation);
  return { code: invitationRef.id, ...invitation };
};

export const getBuildingInvitation = async (code, email) => {
  const invitationRef = doc(db, 'buildingInvitations', code.trim());
  const invitationSnapshot = await getDoc(invitationRef);
  if (!invitationSnapshot.exists()) throw new Error('Invitation code not found. Ask your building manager for a new one.');

  const invitation = invitationSnapshot.data();
  if (invitation.used || invitation.expiresAt <= Date.now()) {
    throw new Error('This invitation has expired or has already been used. Ask your building manager for a new one.');
  }
  if (invitation.email !== email.trim().toLowerCase()) {
    throw new Error('Use the email address this invitation was sent to.');
  }
  return invitation;
};

export const activateBuildingInvitation = async (userId, email, code) => {
  const invitationRef = doc(db, 'buildingInvitations', code);
  const residentRef = doc(db, 'users', userId);

  return runTransaction(db, async (transaction) => {
    const [invitationSnapshot, residentSnapshot] = await Promise.all([
      transaction.get(invitationRef),
      transaction.get(residentRef),
    ]);
    if (!invitationSnapshot.exists() || !residentSnapshot.exists()) {
      throw new Error('Invitation or resident account was not found.');
    }

    const invitation = invitationSnapshot.data();
    const resident = residentSnapshot.data();
    if (invitation.used || invitation.expiresAt <= Date.now()) {
      throw new Error('This invitation has expired or has already been used. Ask your building manager for a new one.');
    }
    if (invitation.email !== email.trim().toLowerCase() || resident.inviteCode !== code) {
      throw new Error('This invitation belongs to a different email or account.');
    }

    transaction.update(invitationRef, { used: true, usedBy: userId, usedAt: Date.now() });
    transaction.update(residentRef, {
      role: invitation.role,
      buildingId: invitation.buildingId,
      buildingName: invitation.buildingName,
      buildingLatitude: invitation.buildingLatitude,
      buildingLongitude: invitation.buildingLongitude,
      unitNumber: invitation.role === 'resident' ? invitation.unitNumber : '',
      skillCategories: invitation.role === 'technician' ? invitation.skillCategories : [],
      isAvailable: invitation.role === 'technician',
      activeRequestId: null,
      openJobs: 0,
      membershipStatus: 'active',
      inviteCode: null,
    });
    return invitation;
  });
};

const buildMaintenanceRequestsQuery = (user, userProfile) => {
  if (!user?.uid || !userProfile) return null;

  if (userProfile.role === 'technician') {
    return [
      query(
        collection(db, 'maintenanceRequests'),
        where('buildingId', '==', userProfile.buildingId),
        where('assignedTechnicianId', '==', user.uid)
      ),
      query(
        collection(db, 'maintenanceRequests'),
        where('buildingId', '==', userProfile.buildingId),
        where('offeredTechnicianIds', 'array-contains', user.uid)
      ),
    ];
  }
  if (userProfile.role === 'manager' || userProfile.role === 'admin') {
    if (!userProfile.buildingId) return null;
    return query(collection(db, 'maintenanceRequests'), where('buildingId', '==', userProfile.buildingId));
  }

  return query(collection(db, 'maintenanceRequests'), where('residentId', '==', user.uid));
};

const sortRequests = (docs) => docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

export const getMaintenanceRequests = async (user, userProfile) => {
  const requestsQuery = buildMaintenanceRequestsQuery(user, userProfile);
  if (!requestsQuery) return [];
  if (Array.isArray(requestsQuery)) {
    const snapshots = await Promise.all(requestsQuery.map((item) => getDocs(item)));
    const requestsById = new Map(snapshots.flatMap((snapshot) => sortRequests(snapshot.docs)).map((item) => [item.id, item]));
    return [...requestsById.values()].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  }
  const snapshot = await getDocs(requestsQuery);
  return sortRequests(snapshot.docs);
};

export const listenToMaintenanceRequests = (user, userProfile, onRequests, onError) => {
  const requestsQuery = buildMaintenanceRequestsQuery(user, userProfile);
  if (!requestsQuery) {
    onRequests([]);
    return () => {};
  }
  if (Array.isArray(requestsQuery)) {
    const snapshots = new Map();
    const emitRequests = () => {
      const requestsById = new Map([...snapshots.values()].flatMap((snapshot) => sortRequests(snapshot.docs)).map((item) => [item.id, item]));
      onRequests([...requestsById.values()].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt)));
    };
    const unsubscribers = requestsQuery.map((item, index) => onSnapshot(item, (snapshot) => {
      snapshots.set(index, snapshot);
      emitRequests();
    }, onError));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
  return onSnapshot(requestsQuery, (snapshot) => {
    onRequests(sortRequests(snapshot.docs));
  }, onError);
};

export const getMaintenanceRequest = async (requestId) => {
  const snapshot = await getDoc(doc(db, 'maintenanceRequests', requestId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const listenToMaintenanceRequest = (requestId, onRequest, onError) => {
  return onSnapshot(doc(db, 'maintenanceRequests', requestId), (snapshot) => {
    onRequest(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
};

export const updateMaintenanceRequest = async (requestId, updates) => {
  await updateDoc(doc(db, 'maintenanceRequests', requestId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const transitionMaintenanceRequest = async (requestId, status, user, userProfile) => {
  const requestRef = doc(db, 'maintenanceRequests', requestId);

  if (status === 'accepted' && userProfile?.role === 'technician') {
    const technicianRef = doc(db, 'users', user.uid);
    await runTransaction(db, async (transaction) => {
      const [requestSnapshot, technicianSnapshot] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(technicianRef),
      ]);
      if (!requestSnapshot.exists() || !technicianSnapshot.exists()) throw new Error('Request or technician profile was not found.');
      const current = requestSnapshot.data();
      const technician = technicianSnapshot.data();
      if (current.status === 'assigned' && current.assignedTechnicianId === user.uid
        && technician.activeRequestId === requestId) {
        transaction.update(requestRef, { status, updatedAt: new Date().toISOString() });
        return;
      }
      if (current.status !== 'offered'
        || !(current.offeredTechnicianIds || []).includes(user.uid)
        || technician.role !== 'technician'
        || technician.buildingId !== current.buildingId
        || technician.isAvailable !== true
        || technician.activeRequestId
        || !(technician.skillCategories || []).includes(current.category)) {
        throw new Error('This request is no longer available or you are not eligible to accept it.');
      }
      transaction.update(requestRef, {
        status,
        assignedTechnicianId: user.uid,
        assignedTechnicianName: technician.name || 'Technician',
        offeredTechnicianIds: [],
        updatedAt: new Date().toISOString(),
      });
      transaction.update(technicianRef, { activeRequestId: requestId, openJobs: 1 });
    });
    return;
  }

  if (status === 'completed' && userProfile?.role === 'technician') {
    const technicianRef = doc(db, 'users', user.uid);
    await runTransaction(db, async (transaction) => {
      const [requestSnapshot, technicianSnapshot] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(technicianRef),
      ]);
      if (!requestSnapshot.exists() || !technicianSnapshot.exists()) throw new Error('Request or technician profile was not found.');
      const current = requestSnapshot.data();
      const technician = technicianSnapshot.data();
      if (current.assignedTechnicianId !== user.uid || current.status !== 'in_progress' || technician.activeRequestId !== requestId) {
        throw new Error('This job is not your active assignment. Refresh and try again.');
      }
      transaction.update(requestRef, { status, updatedAt: new Date().toISOString() });
      transaction.update(technicianRef, { activeRequestId: null, openJobs: 0 });
    });
    return;
  }

  if (status === 'in_progress' && userProfile?.role === 'resident') {
    await runTransaction(db, async (transaction) => {
      const requestSnapshot = await transaction.get(requestRef);
      if (!requestSnapshot.exists()) throw new Error('Request was not found.');
      const current = requestSnapshot.data();
      if (current.residentId !== user.uid || !['completed', 'closed'].includes(current.status)) {
        throw new Error('Only your completed request can be reopened.');
      }
      transaction.update(requestRef, {
        status: 'unassigned',
        assignedTechnicianId: null,
        assignedTechnicianName: null,
        updatedAt: new Date().toISOString(),
      });
    });
    return;
  }

  await updateMaintenanceRequest(requestId, { status });
};

export const rejectMaintenanceOffer = async (requestId, user) => {
  const requestRef = doc(db, 'maintenanceRequests', requestId);
  const noOffersRemain = await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) throw new Error('Request was not found.');
    const current = requestSnapshot.data();
    const offeredTechnicianIds = current.offeredTechnicianIds || [];
    if (current.status !== 'offered' || !offeredTechnicianIds.includes(user.uid)) {
      throw new Error('This offer is no longer available to decline.');
    }

    const remainingTechnicians = offeredTechnicianIds.filter((technicianId) => technicianId !== user.uid);
    const noOffers = remainingTechnicians.length === 0;
    transaction.update(requestRef, {
      offeredTechnicianIds: remainingTechnicians,
      status: noOffers ? 'unassigned' : 'offered',
      managerEscalationAt: noOffers ? null : current.managerEscalationAt,
      managerEscalated: noOffers,
      updatedAt: new Date().toISOString(),
    });
    return {
      noOffers,
      buildingId: current.buildingId,
      category: current.category,
      unitNumber: current.unitNumber,
    };
  });

  if (noOffersRemain.noOffers) {
    const managers = await getDocs(query(
      collection(db, 'users'),
      where('buildingId', '==', noOffersRemain.buildingId),
      where('role', 'in', ['manager', 'admin'])
    ));
    await Promise.all(managers.docs.map((manager) =>
      notifySafely(manager.id, `No technician accepted the ${noOffersRemain.category} request for flat ${noOffersRemain.unitNumber || '—'}. Please assign it.`, requestId)
    ));
  }
};

export const updateTechnicianLocation = async (requestId, latitude, longitude) => {
  await updateMaintenanceRequest(requestId, {
    technicianLocation: { latitude, longitude },
    technicianLocationUpdatedAt: new Date().toISOString(),
  });
};

export const notifyMaintenanceStatus = async (request, message) => {
  const managers = await getDocs(query(
    collection(db, 'users'),
    where('buildingId', '==', request.buildingId),
    where('role', 'in', ['manager', 'admin'])
  ));
  await Promise.all([
    notifySafely(request.residentId, message, request.id),
    ...managers.docs.map((manager) => notifySafely(manager.id, message, request.id)),
  ]);
};

export const submitMaintenanceReview = async (requestId, rating, review) => {
  await updateMaintenanceRequest(requestId, {
    residentRating: rating,
    residentReview: review.trim(),
    reviewedAt: new Date().toISOString(),
  });
};

export const submitMaintenanceComplaint = async (requestId, description) => {
  await updateMaintenanceRequest(requestId, {
    complaintDescription: description.trim(),
    complaintStatus: 'open',
    complaintCreatedAt: new Date().toISOString(),
  });
};

export const resolveMaintenanceComplaint = async (requestId) => {
  await updateMaintenanceRequest(requestId, {
    complaintStatus: 'resolved',
    complaintResolvedAt: new Date().toISOString(),
  });
};

export const assignMaintenanceRequest = async (request, technician) => {
  const requestRef = doc(db, 'maintenanceRequests', request.id);
  const technicianRef = doc(db, 'users', technician.id);

  await runTransaction(db, async (transaction) => {
    const [requestSnapshot, technicianSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(technicianRef),
    ]);
    if (!requestSnapshot.exists() || !technicianSnapshot.exists()) throw new Error('Request or technician was not found.');
    const currentRequest = requestSnapshot.data();
    const currentTechnician = technicianSnapshot.data();
    if (!['unassigned', 'offered', 'assigned'].includes(currentRequest.status)) throw new Error('An accepted or active job cannot be reassigned.');
    if (currentTechnician.role !== 'technician'
      || currentTechnician.buildingId !== currentRequest.buildingId
      || currentTechnician.isAvailable !== true
      || (currentTechnician.activeRequestId && currentTechnician.activeRequestId !== request.id)) {
      throw new Error('This technician is unavailable or already has an active job.');
    }
    if (!(currentTechnician.skillCategories || []).includes(currentRequest.category)) {
      throw new Error('This technician is not assigned to this issue type.');
    }

    const previousTechnicianId = currentRequest.assignedTechnicianId;
    const previousTechnicianRef = previousTechnicianId && previousTechnicianId !== technician.id
      ? doc(db, 'users', previousTechnicianId)
      : null;
    const previousTechnicianSnapshot = previousTechnicianRef
      ? await transaction.get(previousTechnicianRef)
      : null;

    if (previousTechnicianSnapshot?.exists()
      && previousTechnicianSnapshot.data().activeRequestId === request.id) {
      transaction.update(previousTechnicianRef, { activeRequestId: null, openJobs: 0 });
    }

    transaction.update(technicianRef, { activeRequestId: request.id, openJobs: 1 });
    transaction.update(requestRef, {
      assignedTechnicianId: technician.id,
      assignedTechnicianName: currentTechnician.name || 'Technician',
      offeredTechnicianIds: [],
      status: 'assigned',
      updatedAt: new Date().toISOString(),
    });
  });
  await notifySafely(technician.id, `A ${request.category} request was assigned to you.`, request.id);
};

export const getBuildingTechnicians = async (buildingId, category = null) => {
  const snapshot = await getDocs(query(
    collection(db, 'users'),
    where('buildingId', '==', buildingId),
    where('role', '==', 'technician')
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.role === 'technician' && (!category || (item.skillCategories || []).includes(category)));
};

export const listenToBuildingTechnicians = (buildingId, onTechnicians, onError) => {
  if (!buildingId) {
    onTechnicians([]);
    return () => {};
  }
  const techniciansQuery = query(
    collection(db, 'users'),
    where('buildingId', '==', buildingId),
    where('role', '==', 'technician')
  );
  return onSnapshot(techniciansQuery, (snapshot) => {
    onTechnicians(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
};

export const updateTechnicianAvailability = async (technicianId, isAvailable) => {
  await updateDoc(doc(db, 'users', technicianId), { isAvailable });
};

export const notifyMaintenanceResident = async (request, message) => {
  await notifySafely(request.residentId, message, request.id);
};
