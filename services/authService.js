import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  getIdToken,
} from '../node_modules/@firebase/auth/dist/esm2017/index.js';
import { doc, setDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getCurrentLocation } from './locationService';
import { activateBuildingInvitation, getBuildingInvitation } from './maintenanceService';

export const registerUser = async (email, password, name, phone, role = 'user', providerDetails = {}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const invitation = role === 'resident'
    ? await getBuildingInvitation(providerDetails.inviteCode || '', normalizedEmail)
    : null;

  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });

  const userData = {
    name,
    email: normalizedEmail,
    phone,
    role,
    profileImage: null,
    createdAt: new Date().toISOString(),
  };

  if (role === 'resident') {
    Object.assign(userData, {
      inviteCode: providerDetails.inviteCode.trim(),
      membershipStatus: 'pending_verification',
      unitNumber: '',
      skillCategories: [],
    });
  }

  await setDoc(doc(db, 'users', user.uid), userData);
  if (invitation) {
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.log('Verification email could not be sent:', error);
    }
  }

  // Auto-create provider profile when registering as provider
  if (role === 'provider') {
    let lat = providerDetails.manualLat || 0;
    let lng = providerDetails.manualLng || 0;
    if (!lat && !lng) {
      try {
        const loc = await getCurrentLocation();
        lat = loc.latitude;
        lng = loc.longitude;
      } catch (e) {
        // Location permission denied — will use 0,0 as default
      }
    }

    await addDoc(collection(db, 'providers'), {
      name,
      phone,
      email,
      userId: user.uid,
      category: providerDetails.category || 'plumber',
      hourlyRate: providerDetails.hourlyRate || 300,
      bio: providerDetails.bio || '',
      experience: providerDetails.experience || '',
      skills: providerDetails.skills || '',
      about: providerDetails.about || '',
      cvUrl: providerDetails.cvUrl || '',
      certUrl: providerDetails.certUrl || '',
      rating: 0,
      reviewCount: 0,
      available: true,
      isVerified: false,
      latitude: lat,
      longitude: lng,
      serviceArea: 'Local',
      createdAt: new Date().toISOString(),
    });
  }

  return user;
};

export const completeAccountRegistration = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Your sign-in session ended. Sign in again to continue.');

  await reload(user);
  if (!user.emailVerified) throw new Error('Verify your email using the link we sent, then tap the button again.');
  await getIdToken(user, true);

  const profile = await getUserProfile(user.uid);
  if (!profile?.inviteCode) {
    if (profile?.membershipStatus === 'active') return profile;
    throw new Error('This account has no pending apartment invitation.');
  }

  const invitation = await activateBuildingInvitation(user.uid, user.email, profile.inviteCode);
  return {
    ...profile,
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
  };
};

export const resendAccountVerification = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Your sign-in session ended. Sign in again to continue.');
  await sendEmailVerification(user);
};

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

export const getUserProfile = async (userId) => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};
