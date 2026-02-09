import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export const getProviders = async (category = null) => {
  let q;
  if (category && category !== 'all') {
    q = query(collection(db, 'providers'), where('category', '==', category));
  } else {
    q = collection(db, 'providers');
  }

  const snapshot = await getDocs(q);
  const providers = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

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
    createdAt: new Date().toISOString(),
  });
  return { id: docRef.id, ...providerData };
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
