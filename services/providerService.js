import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export const getProviders = async (category = null, includeUnverified = false) => {
  let q;
  if (category && category !== 'all') {
    q = query(collection(db, 'providers'), where('category', '==', category));
  } else {
    q = collection(db, 'providers');
  }

  const snapshot = await getDocs(q);
  let providers = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  // Only show verified providers to customers
  if (!includeUnverified) {
    providers = providers.filter((p) => p.isVerified === true);
  }

  return providers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
};

export const getProviderById = async (providerId) => {
  const docRef = doc(db, 'providers', providerId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const getNearbyProviders = async (latitude, longitude, radiusKm = 50, category = null) => {
  const providers = await getProviders(category);

  return providers.map((provider) => {
    const distance = getDistanceKm(
      latitude,
      longitude,
      provider.latitude || 0,
      provider.longitude || 0
    );
    return { ...provider, distance: Math.round(distance * 10) / 10 };
  }).filter((p) => p.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
};

export const updateProviderRating = async (providerId, newRating, newReviewCount) => {
  const docRef = doc(db, 'providers', providerId);
  await updateDoc(docRef, {
    rating: newRating,
    reviewCount: newReviewCount,
  });
};

export const addProvider = async (providerData) => {
  const docRef = await addDoc(collection(db, 'providers'), {
    ...providerData,
    rating: 0,
    reviewCount: 0,
    available: true,
    isVerified: false,
    createdAt: new Date().toISOString(),
  });
  return { id: docRef.id, ...providerData };
};

// Toggle provider availability
export const toggleProviderAvailability = async (providerId, isAvailable) => {
  const docRef = doc(db, 'providers', providerId);
  await updateDoc(docRef, { available: isAvailable });
};

// Verify a provider (admin action)
export const verifyProvider = async (providerId, verified = true) => {
  const docRef = doc(db, 'providers', providerId);
  await updateDoc(docRef, { isVerified: verified });
};

// Remove a provider (admin action)
export const removeProvider = async (providerId) => {
  const docRef = doc(db, 'providers', providerId);
  await deleteDoc(docRef);
};

// Get unverified providers (for admin)
export const getUnverifiedProviders = async () => {
  const q = query(collection(db, 'providers'), where('isVerified', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Get provider by userId (for provider dashboard)
export const getProviderByUserId = async (userId) => {
  const q = query(collection(db, 'providers'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const providerDoc = snapshot.docs[0];
    return { id: providerDoc.id, ...providerDoc.data() };
  }
  return null;
};

// Update provider profile
export const updateProviderProfile = async (providerId, updates) => {
  const docRef = doc(db, 'providers', providerId);
  await updateDoc(docRef, updates);
};

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
