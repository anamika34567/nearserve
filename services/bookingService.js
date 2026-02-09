import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { BOOKING_STATUS } from '../constants';

export const createBooking = async (userId, providerId, userLat, userLng) => {
  const booking = {
    userId,
    providerId,
    status: BOOKING_STATUS.REQUESTED,
    userLat,
    userLng,
    providerLat: null,
    providerLng: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const docRef = await addDoc(collection(db, 'bookings'), booking);
  return { id: docRef.id, ...booking };
};

export const updateBookingStatus = async (bookingId, status) => {
  const docRef = doc(db, 'bookings', bookingId);
  const updates = { status };
  if (status === BOOKING_STATUS.COMPLETED) {
    updates.completedAt = new Date().toISOString();
  }
  await updateDoc(docRef, updates);
};

export const updateBookingLocation = async (bookingId, userLat, userLng) => {
  const docRef = doc(db, 'bookings', bookingId);
  await updateDoc(docRef, { userLat, userLng });
};

export const getUserBookings = async (userId) => {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  return bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const listenToBooking = (bookingId, callback) => {
  const docRef = doc(db, 'bookings', bookingId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    }
  });
};
